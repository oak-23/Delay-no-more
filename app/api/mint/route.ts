/**
 * Server-Side Minting API Route
 * 
 * This route handles "sponsored" minting — the server uses the OWNER's wallet
 * private key (from .env.local) to sign and pay gas for all transactions.
 * 
 * Visitors do NOT need MetaMask or any wallet at all!
 */
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { aiModelService } from '@/services/aiModel';
import { imageProcessingService } from '@/services/imageProcessing';

const QDAY_CONTRACT_ADDRESS = "0x14fEd8c1327479779fAe2cA7CE07237bAF498ad4";

const CONTRACT_ABI = [
    "function mintProvenance(address to, string memory imageHash) public",
    "function isHashRegistered(string memory imageHash) public view returns (bool)",
    "event ProvenanceMinted(address indexed creator, uint256 indexed tokenId, string imageHash, uint256 timestamp)"
];

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
        }

        // Validate environment
        const privateKey = process.env.QDAY_PRIVATE_KEY;
        const rpcUrl = process.env.QDAY_RPC_URL;

        if (!privateKey || privateKey === 'YOUR_METAMASK_PRIVATE_KEY_HERE') {
            return NextResponse.json({
                error: 'Server wallet not configured. The site owner needs to set QDAY_PRIVATE_KEY in .env.local.'
            }, { status: 500 });
        }

        // 1. Calculate Image Hash
        const imageHash = await aiModelService.calculateHash(file);

        // 2. Connect to QDay using the owner's private key (server-side wallet)
        const provider = new ethers.JsonRpcProvider(rpcUrl || 'https://rpc.qday.info');
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(QDAY_CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

        // 3. Check if this image hash is already minted
        try {
            const alreadyRegistered = await contract.isHashRegistered(imageHash);
            if (alreadyRegistered) {
                return NextResponse.json({
                    error: 'This exact image has already been minted on the QDay blockchain.'
                }, { status: 409 });
            }
        } catch {
            // If the check fails, proceed anyway (the contract will revert if duplicate)
        }

        // 4. Run AI analysis (client-side mock for now)
        const aiScore = await aiModelService.predictAIOrigin(file);

        // 5. Generate dHash (Perceptual Hash) for similarity lookups
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const dHash = await imageProcessingService.generateDHash(buffer);

        // 6. Mint the NFT using the owner's wallet (visitors pay nothing!)
        const feeData = await provider.getFeeData();
        const tx = await contract.mintProvenance(wallet.address, imageHash, {
            gasLimit: 3000000,
            gasPrice: feeData.gasPrice || ethers.parseUnits("1", "gwei")
        });

        // 7. Wait for the transaction to be mined on QDay
        const receipt = await tx.wait();
        const block = await provider.getBlock(receipt.blockNumber);
        const tokenId = `qnft_${receipt.blockNumber}`;
        const timestamp = new Date(Number(block?.timestamp) * 1000).toISOString();

        // 8. Update Server-Side Similarity Cache
        try {
            const cachePath = path.join(process.cwd(), 'data', 'similarity_cache.json');
            // Ensure data directory exists
            if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
                fs.mkdirSync(path.join(process.cwd(), 'data'));
            }

            const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : [];
            cache.push({
                sha256: imageHash,
                dHash: dHash,
                tokenId: tokenId,
                timestamp: timestamp
            });
            fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
        } catch (err) {
            console.warn('[Mint API] Cache sync failed:', err);
        }

        return NextResponse.json({
            success: true,
            txHash: receipt.hash,
            tokenId,
            timestamp,
            ownerAddress: wallet.address,
            metadataHash: imageHash,
            aiScore
        });

    } catch (error: any) {
        console.error('[Mint API] Error:', error);

        if (error.reason) {
            return NextResponse.json({ error: `Transaction reverted: ${error.reason}` }, { status: 400 });
        }

        return NextResponse.json({ error: error.message || 'Minting failed' }, { status: 500 });
    }
}
