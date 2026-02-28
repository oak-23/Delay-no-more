import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// The address of the AbelianAIAuthenticator deployed to the QDay network
const QDAY_CONTRACT_ADDRESS = "0x14fEd8c1327479779fAe2cA7CE07237bAF498ad4";

// Minimal ABI just for the functions we need
const CONTRACT_ABI = [
    "function mintProvenance(address to, string memory imageHash) public",
    "event ProvenanceMinted(address indexed creator, uint256 indexed tokenId, string imageHash, uint256 timestamp)"
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageHash, aiScore } = body;

        if (!imageHash) {
            return NextResponse.json({ error: "imageHash is required" }, { status: 400 });
        }

        const privateKey = process.env.QDAY_PRIVATE_KEY;
        if (!privateKey) {
            console.error("QDAY_PRIVATE_KEY is missing from environment variables.");
            return NextResponse.json({ error: "Server misconfiguration: Wallet not set up." }, { status: 500 });
        }

        if (!QDAY_CONTRACT_ADDRESS) {
            return NextResponse.json({ error: "Server misconfiguration: Contract address not set up." }, { status: 500 });
        }

        // Connect to QDay Testnet
        const provider = new ethers.JsonRpcProvider('https://rpc.qday.info');
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(QDAY_CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

        // We'll mint the NFT to the wallet's own address
        const destinationAddress = wallet.address;

        // Get current gas price
        const feeData = await provider.getFeeData();

        // Send transaction
        const tx = await contract.mintProvenance(destinationAddress, imageHash, {
            gasLimit: 3000000,
            gasPrice: feeData.gasPrice || ethers.parseUnits("1", "gwei")
        });

        // Wait for it to be mined
        const receipt = await tx.wait();
        const block = await provider.getBlock(receipt.blockNumber);

        const tokenId = `qnft_${receipt.blockNumber}`;

        return NextResponse.json({
            txHash: receipt.hash,
            tokenId,
            timestamp: new Date(Number(block?.timestamp) * 1000).toISOString(),
            ownerAddress: destinationAddress,
            metadataHash: imageHash,
            aiScore
        });

    } catch (error: any) {
        console.error("Mint API Error:", error);
        return NextResponse.json(
            { error: error.reason || error.message || "Failed to mint NFT via server." },
            { status: 500 }
        );
    }
}
