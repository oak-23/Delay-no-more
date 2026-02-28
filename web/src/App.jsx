import React, { useState, useRef } from 'react';
import { Upload, Sparkles, CheckCircle2, XCircle, ShieldCheck, Loader2, Image as ImageIcon } from 'lucide-react';
import { deepSeekAIWrapper } from './utils/aiWrapper';
import './App.css';

function App() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hashResult, setHashResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Reset state on new upload
      setHashResult(null);
      setVerificationResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setHashResult(null);
      setVerificationResult(null);
    }
  };

  const handleHashAndMint = async () => {
    if (!image) return;

    setIsProcessing(true);
    try {
      // 1. Hash the image using the DeepSeek wrapper
      const result = await deepSeekAIWrapper.analyzeAndHashImage(image);

      // 2. Simulate Minting to QDay
      setHashResult({
        hash: result.hash,
        mintStatus: 'Success',
        txId: `tx_qday_${Math.floor(Math.random() * 1000000)}`,
        timestamp: new Date().toLocaleString()
      });

    } catch (error) {
      console.error("Hashing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!image) return;

    setIsProcessing(true);
    try {
      // 1. Hash the current image
      const currentAnalysis = await deepSeekAIWrapper.analyzeAndHashImage(image);

      // 2. Simulate fetching from QDay RPC
      // In a real app, we would query Abelian RPC for this hash
      const isOnChain = hashResult ? currentAnalysis.hash === hashResult.hash : false;

      setVerificationResult({
        currentHash: currentAnalysis.hash,
        isAiGenerated: currentAnalysis.isAiGenerated,
        confidence: currentAnalysis.confidence,
        foundOnChain: isOnChain
      });

    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="title">Abelian AI Authenticator</h1>
        <p className="subtitle">Secure, verifiable AI provenance on the QDay Network</p>
      </header>

      <div className="glass-card">
        {/* Upload Section */}
        {!previewUrl ? (
          <div
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload size={48} className="upload-icon" />
            <div className="upload-text">Drag & Drop Image or Click to Upload</div>
            <div className="upload-subtext">Supports PNG, JPG, JPEG, WEBP</div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="file-input"
            />
          </div>
        ) : (
          <div className="preview-container" onClick={() => fileInputRef.current?.click()}>
            <img src={previewUrl} alt="Preview" className="image-preview" />
            <div className="preview-overlay">
              <div style={{ color: 'white', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: '500' }}>
                <ImageIcon size={20} /> Change Image
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="file-input"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={handleHashAndMint}
            disabled={!image || isProcessing}
          >
            {isProcessing && !verificationResult && !hashResult ? (
              <><Loader2 className="loader" size={20} /> Analyzing DeepSeek...</>
            ) : (
              <><Sparkles size={20} /> Hash & Mint (Creator)</>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleVerify}
            disabled={!image || isProcessing}
          >
            {isProcessing && (hashResult || verificationResult) ? (
              <><Loader2 className="loader" size={20} /> Verifying...</>
            ) : (
              <><ShieldCheck size={20} /> Verify (Consumer)</>
            )}
          </button>
        </div>

        {/* Results Sections */}
        {hashResult && !verificationResult && (
          <div className="status-card">
            <div className="status-header">
              <CheckCircle2 color="var(--success)" size={24} />
              <span>Successfully Minted to QDay</span>
            </div>
            <div className="status-row">
              <span className="status-label">DeepSeek Image Hash</span>
              <span className="status-value">{hashResult.hash}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Transaction ID</span>
              <span className="status-value">{hashResult.txId}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Timestamp</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{hashResult.timestamp}</span>
            </div>
          </div>
        )}

        {verificationResult && (
          <div className="status-card">
            <div className="status-header">
              {verificationResult.foundOnChain ? (
                <><ShieldCheck color="var(--success)" size={24} /> <span>Verification Complete</span></>
              ) : (
                <><XCircle color="var(--danger)" size={24} /> <span>Verification Failed</span></>
              )}
            </div>

            <div className="status-row">
              <span className="status-label">On-Chain Status</span>
              {verificationResult.foundOnChain ? (
                <span className="badge-authentic">Verified NFT Found</span>
              ) : (
                <span className="badge-fake">No NFT Found</span>
              )}
            </div>

            <div className="status-row">
              <span className="status-label">Computed Hash</span>
              <span className="status-value">{verificationResult.currentHash}</span>
            </div>

            <div className="status-row">
              <span className="status-label">DeepSeek Origin DB</span>
              {verificationResult.isAiGenerated ? (
                <span className="badge-fake">AI Generated Deepfake</span>
              ) : (
                <span className="badge-authentic">Authentic Content</span>
              )}
            </div>

            <div className="status-row">
              <span className="status-label">AI Confidence</span>
              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '500' }}>
                {(verificationResult.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
