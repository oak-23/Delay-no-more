"""
AI-Generated Image Detection — Training Script
================================================
Fine-tunes EfficientNet-B4 for binary classification (Real vs AI-Generated).
Optimized for maximum accuracy on a labeled .jpg dataset with CSV labels.

Works both locally (CUDA GPU) and on AWS SageMaker.

Usage:
    python train.py --data_dir ./dataset --epochs 10 --batch_size 32 --lr 1e-4

Expected dataset layout:
    data_dir/
    ├── train/          (training .jpg images)
    ├── test/           (test .jpg images)
    ├── train.csv       (columns: filename, label)
    └── test.csv        (columns: filename, label)

Label convention: 0 = real, 1 = AI-generated
"""

import os
import argparse
import time
import json
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torch.cuda.amp import GradScaler, autocast

import torchvision.transforms as T
import timm

from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    classification_report, confusion_matrix
)
from sklearn.model_selection import train_test_split


# ═══════════════════════════════════════════════════════════════════
#  1.  DATASET
# ═══════════════════════════════════════════════════════════════════

class AIDetectDataset(Dataset):
    """Loads images from a folder using a CSV file for labels."""

    def __init__(self, csv_path, image_dir, transform=None):
        self.df = pd.read_csv(csv_path)
        self.image_dir = image_dir
        self.transform = transform

        # Auto-detect column names (handle common variations)
        cols = [c.lower().strip() for c in self.df.columns]
        self.df.columns = cols

        # Find filename column
        fname_candidates = ['filename', 'file_name', 'image', 'image_name', 'id', 'file']
        self.fname_col = None
        for c in fname_candidates:
            if c in cols:
                self.fname_col = c
                break
        if self.fname_col is None:
            self.fname_col = cols[0]  # fallback: use first column
            print(f"[WARN] Could not find filename column, using '{self.fname_col}'")

        # Find label column
        label_candidates = ['label', 'labels', 'target', 'class', 'is_ai', 'ai']
        self.label_col = None
        for c in label_candidates:
            if c in cols:
                self.label_col = c
                break
        if self.label_col is None:
            self.label_col = cols[1]  # fallback: use second column
            print(f"[WARN] Could not find label column, using '{self.label_col}'")

        # Filter out rows where image file does not exist
        valid_mask = self.df[self.fname_col].apply(
            lambda f: os.path.isfile(os.path.join(self.image_dir, str(f)))
        )
        dropped = (~valid_mask).sum()
        if dropped > 0:
            print(f"[WARN] Dropped {dropped} rows with missing image files.")
        self.df = self.df[valid_mask].reset_index(drop=True)

        print(f"  Loaded {len(self.df)} samples from '{csv_path}'")
        print(f"  Label distribution: {dict(self.df[self.label_col].value_counts())}")

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = os.path.join(self.image_dir, str(row[self.fname_col]))
        label = int(row[self.label_col])

        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)

        return image, label


# ═══════════════════════════════════════════════════════════════════
#  2.  TRANSFORMS (Heavy augmentation for max accuracy)
# ═══════════════════════════════════════════════════════════════════

def get_train_transforms(img_size=380):
    """Aggressive augmentation pipeline for training."""
    return T.Compose([
        T.Resize((img_size + 20, img_size + 20)),
        T.RandomCrop(img_size),
        T.RandomHorizontalFlip(p=0.5),
        T.RandomVerticalFlip(p=0.1),
        T.RandomRotation(degrees=15),
        T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
        T.RandomGrayscale(p=0.05),
        T.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
        T.RandomPerspective(distortion_scale=0.1, p=0.2),
        T.RandomAutocontrast(p=0.2),
        T.RandomEqualize(p=0.1),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        T.RandomErasing(p=0.25, scale=(0.02, 0.15)),  # Cutout-style
    ])


def get_val_transforms(img_size=380):
    """Clean transforms for validation/test (no augmentation)."""
    return T.Compose([
        T.Resize((img_size, img_size)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


# ═══════════════════════════════════════════════════════════════════
#  3.  MODEL
# ═══════════════════════════════════════════════════════════════════

class AIDetector(nn.Module):
    """EfficientNet-B4 backbone with custom classification head."""

    def __init__(self, model_name='efficientnet_b4', pretrained=True, dropout=0.4):
        super().__init__()
        self.backbone = timm.create_model(model_name, pretrained=pretrained, num_classes=0)
        feat_dim = self.backbone.num_features

        self.head = nn.Sequential(
            nn.BatchNorm1d(feat_dim),
            nn.Dropout(dropout),
            nn.Linear(feat_dim, 512),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),
            nn.Dropout(dropout / 2),
            nn.Linear(512, 1),  # Binary output (logit)
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features).squeeze(-1)


# ═══════════════════════════════════════════════════════════════════
#  4.  TRAINING LOOP
# ═══════════════════════════════════════════════════════════════════

def train_one_epoch(model, loader, criterion, optimizer, scaler, device, grad_accum=2):
    """Train for one epoch with mixed precision and gradient accumulation."""
    model.train()
    running_loss = 0.0
    all_preds, all_labels = [], []

    optimizer.zero_grad()
    for i, (images, labels) in enumerate(loader):
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True).float()

        with autocast(device_type='cuda', enabled=(device.type == 'cuda')):
            outputs = model(images)
            loss = criterion(outputs, labels) / grad_accum

        scaler.scale(loss).backward()

        if (i + 1) % grad_accum == 0 or (i + 1) == len(loader):
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad()

        running_loss += loss.item() * grad_accum
        preds = (torch.sigmoid(outputs) > 0.5).int().cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.int().cpu().numpy())

    epoch_loss = running_loss / len(loader)
    epoch_acc = accuracy_score(all_labels, all_preds)
    epoch_f1 = f1_score(all_labels, all_preds, average='binary', zero_division=0)
    return epoch_loss, epoch_acc, epoch_f1


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    """Evaluate model on validation/test set."""
    model.eval()
    running_loss = 0.0
    all_preds, all_labels, all_probs = [], [], []

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True).float()

        with autocast(device_type='cuda', enabled=(device.type == 'cuda')):
            outputs = model(images)
            loss = criterion(outputs, labels)

        running_loss += loss.item()
        probs = torch.sigmoid(outputs).cpu().numpy()
        preds = (probs > 0.5).astype(int)
        all_probs.extend(probs)
        all_preds.extend(preds)
        all_labels.extend(labels.int().cpu().numpy())

    epoch_loss = running_loss / len(loader)
    epoch_acc = accuracy_score(all_labels, all_preds)
    epoch_f1 = f1_score(all_labels, all_preds, average='binary', zero_division=0)
    return epoch_loss, epoch_acc, epoch_f1, all_labels, all_preds


# ═══════════════════════════════════════════════════════════════════
#  5.  LEARNING RATE SCHEDULER WITH WARMUP
# ═══════════════════════════════════════════════════════════════════

class WarmupCosineScheduler:
    """Linear warmup → Cosine annealing."""

    def __init__(self, optimizer, warmup_epochs, total_epochs, min_lr=1e-7):
        self.optimizer = optimizer
        self.warmup_epochs = warmup_epochs
        self.total_epochs = total_epochs
        self.min_lr = min_lr
        self.base_lrs = [pg['lr'] for pg in optimizer.param_groups]

    def step(self, epoch):
        if epoch < self.warmup_epochs:
            # Linear warmup
            factor = (epoch + 1) / self.warmup_epochs
        else:
            # Cosine annealing
            progress = (epoch - self.warmup_epochs) / max(1, self.total_epochs - self.warmup_epochs)
            factor = 0.5 * (1 + np.cos(np.pi * progress))

        for pg, base_lr in zip(self.optimizer.param_groups, self.base_lrs):
            pg['lr'] = max(self.min_lr, base_lr * factor)

        return self.optimizer.param_groups[0]['lr']


# ═══════════════════════════════════════════════════════════════════
#  6.  MAIN
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Train AI Image Detection Model")
    parser.add_argument('--data_dir', type=str, default=os.environ.get('SM_CHANNEL_TRAINING', './dataset'),
                        help='Root directory of the dataset')
    parser.add_argument('--output_dir', type=str, default=os.environ.get('SM_MODEL_DIR', './output'),
                        help='Directory to save the trained model')
    parser.add_argument('--epochs', type=int, default=10, help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-4, help='Initial learning rate')
    parser.add_argument('--img_size', type=int, default=380, help='Input image size')
    parser.add_argument('--model_name', type=str, default='efficientnet_b4', help='timm model name')
    parser.add_argument('--val_split', type=float, default=0.15,
                        help='Fraction of training data to use as validation')
    parser.add_argument('--num_workers', type=int, default=4, help='DataLoader workers')
    parser.add_argument('--grad_accum', type=int, default=2, help='Gradient accumulation steps')
    parser.add_argument('--weight_decay', type=float, default=1e-4, help='AdamW weight decay')
    parser.add_argument('--warmup_epochs', type=int, default=2, help='Warmup epochs')
    parser.add_argument('--dropout', type=float, default=0.4, help='Dropout rate')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')

    args = parser.parse_args()

    # ── Seed everything ──
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\n{'='*60}")
    print(f"  AI Image Detection Trainer")
    print(f"  Device  : {device}")
    print(f"  Model   : {args.model_name}")
    print(f"  Epochs  : {args.epochs}")
    print(f"  Batch   : {args.batch_size} (effective: {args.batch_size * args.grad_accum})")
    print(f"  LR      : {args.lr}")
    print(f"  Img Size: {args.img_size}")
    print(f"{'='*60}\n")

    os.makedirs(args.output_dir, exist_ok=True)

    # ── Load datasets ──
    train_csv = os.path.join(args.data_dir, 'train.csv')
    test_csv = os.path.join(args.data_dir, 'test.csv')
    train_img_dir = os.path.join(args.data_dir, 'train')
    test_img_dir = os.path.join(args.data_dir, 'test')

    print("[1/5] Loading dataset...")
    full_train_dataset = AIDetectDataset(train_csv, train_img_dir, transform=None)

    # ── Split training into train + validation ──
    train_df = full_train_dataset.df
    train_idx, val_idx = train_test_split(
        range(len(train_df)),
        test_size=args.val_split,
        stratify=train_df[full_train_dataset.label_col],
        random_state=args.seed,
    )

    train_transform = get_train_transforms(args.img_size)
    val_transform = get_val_transforms(args.img_size)

    # Create separate datasets with appropriate transforms
    train_subset = AIDetectSubset(full_train_dataset, train_idx, train_transform)
    val_subset = AIDetectSubset(full_train_dataset, val_idx, val_transform)

    test_dataset = AIDetectDataset(test_csv, test_img_dir, transform=val_transform)

    print(f"\n  Train : {len(train_subset)} samples")
    print(f"  Val   : {len(val_subset)} samples")
    print(f"  Test  : {len(test_dataset)} samples\n")

    train_loader = DataLoader(
        train_subset, batch_size=args.batch_size, shuffle=True,
        num_workers=args.num_workers, pin_memory=True, drop_last=True,
    )
    val_loader = DataLoader(
        val_subset, batch_size=args.batch_size, shuffle=False,
        num_workers=args.num_workers, pin_memory=True,
    )
    test_loader = DataLoader(
        test_dataset, batch_size=args.batch_size, shuffle=False,
        num_workers=args.num_workers, pin_memory=True,
    )

    # ── Handle class imbalance ──
    label_col = full_train_dataset.label_col
    train_labels = train_df.iloc[train_idx][label_col].values
    n_pos = (train_labels == 1).sum()
    n_neg = (train_labels == 0).sum()
    if n_pos > 0 and n_neg > 0:
        pos_weight = torch.tensor([n_neg / n_pos], dtype=torch.float32).to(device)
        print(f"  Class balance — Real: {n_neg}, AI: {n_pos}, pos_weight: {pos_weight.item():.2f}")
    else:
        pos_weight = torch.tensor([1.0]).to(device)

    # ── Build model ──
    print(f"\n[2/5] Building {args.model_name} model...")
    model = AIDetector(model_name=args.model_name, pretrained=True, dropout=args.dropout)
    model = model.to(device)

    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Trainable parameters: {param_count:,}\n")

    # ── Optimizer, loss, scheduler ──
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    # Use differential learning rates: lower LR for backbone, higher for head
    backbone_params = list(model.backbone.parameters())
    head_params = list(model.head.parameters())
    optimizer = optim.AdamW([
        {'params': backbone_params, 'lr': args.lr * 0.1},   # Fine-tune backbone slowly
        {'params': head_params, 'lr': args.lr},               # Train head faster
    ], weight_decay=args.weight_decay)

    scheduler = WarmupCosineScheduler(optimizer, args.warmup_epochs, args.epochs)
    scaler = GradScaler(enabled=(device.type == 'cuda'))

    # ── Training loop ──
    print("[3/5] Training...\n")
    best_val_f1 = 0.0
    best_epoch = 0
    history = []

    for epoch in range(args.epochs):
        start = time.time()
        current_lr = scheduler.step(epoch)

        train_loss, train_acc, train_f1 = train_one_epoch(
            model, train_loader, criterion, optimizer, scaler, device, args.grad_accum
        )
        val_loss, val_acc, val_f1, _, _ = evaluate(model, val_loader, criterion, device)

        elapsed = time.time() - start

        print(f"  Epoch {epoch+1:02d}/{args.epochs} │ "
              f"Train Loss: {train_loss:.4f}  Acc: {train_acc:.4f}  F1: {train_f1:.4f} │ "
              f"Val Loss: {val_loss:.4f}  Acc: {val_acc:.4f}  F1: {val_f1:.4f} │ "
              f"LR: {current_lr:.6f} │ {elapsed:.0f}s")

        history.append({
            'epoch': epoch + 1,
            'train_loss': train_loss, 'train_acc': train_acc, 'train_f1': train_f1,
            'val_loss': val_loss, 'val_acc': val_acc, 'val_f1': val_f1,
            'lr': current_lr,
        })

        # Save best model based on validation F1
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_epoch = epoch + 1
            save_path = os.path.join(args.output_dir, 'best_model.pth')
            torch.save({
                'epoch': epoch + 1,
                'model_state_dict': model.state_dict(),
                'val_f1': val_f1,
                'val_acc': val_acc,
                'args': vars(args),
            }, save_path)
            print(f"         ↳ New best model saved! (F1: {val_f1:.4f})")

    print(f"\n  Best epoch: {best_epoch} with Val F1: {best_val_f1:.4f}")

    # ── Test evaluation ──
    print(f"\n[4/5] Evaluating on test set...\n")
    best_ckpt = torch.load(os.path.join(args.output_dir, 'best_model.pth'), map_location=device, weights_only=True)
    model.load_state_dict(best_ckpt['model_state_dict'])

    test_loss, test_acc, test_f1, test_labels, test_preds = evaluate(
        model, test_loader, criterion, device
    )

    print(f"  Test Accuracy : {test_acc:.4f}")
    print(f"  Test F1 Score : {test_f1:.4f}")
    print(f"  Test Precision: {precision_score(test_labels, test_preds, zero_division=0):.4f}")
    print(f"  Test Recall   : {recall_score(test_labels, test_preds, zero_division=0):.4f}")
    print(f"\n  Confusion Matrix:")
    cm = confusion_matrix(test_labels, test_preds)
    print(f"  {cm}")
    print(f"\n  Classification Report:")
    print(classification_report(test_labels, test_preds, target_names=['Real (0)', 'AI-Gen (1)']))

    # ── Save training history and final results ──
    print("[5/5] Saving results...\n")
    results = {
        'test_accuracy': test_acc,
        'test_f1': test_f1,
        'best_epoch': best_epoch,
        'best_val_f1': best_val_f1,
        'history': history,
        'args': vars(args),
    }
    with open(os.path.join(args.output_dir, 'training_results.json'), 'w') as f:
        json.dump(results, f, indent=2)

    # Also export the final model for easy loading
    torch.save(model.state_dict(), os.path.join(args.output_dir, 'final_model_weights.pth'))

    print(f"  ✓ Model saved to: {os.path.join(args.output_dir, 'best_model.pth')}")
    print(f"  ✓ Results saved to: {os.path.join(args.output_dir, 'training_results.json')}")
    print(f"\n{'='*60}")
    print(f"  Training complete!")
    print(f"{'='*60}\n")


# ═══════════════════════════════════════════════════════════════════
#  SUBSET HELPER (applies different transforms to train/val splits)
# ═══════════════════════════════════════════════════════════════════

class AIDetectSubset(Dataset):
    """Wraps a parent dataset with specific indices and a transform."""

    def __init__(self, parent_dataset, indices, transform):
        self.parent = parent_dataset
        self.indices = indices
        self.transform = transform

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, idx):
        real_idx = self.indices[idx]
        row = self.parent.df.iloc[real_idx]
        img_path = os.path.join(self.parent.image_dir, str(row[self.parent.fname_col]))
        label = int(row[self.parent.label_col])

        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)

        return image, label


if __name__ == '__main__':
    main()
