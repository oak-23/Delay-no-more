/**
 * Service for QDay (Abelian L2) Blockchain Interactions
 * 
 * This uses standard ethers.js to connect to the QDay EVM Network.
 */
import { ethers } from 'ethers';

// The address of the AbelianAIAuthenticator deployed to the QDay network
const QDAY_CONTRACT_ADDRESS = "0x14fEd8c1327479779fAe2cA7CE07237bAF498ad4";

// Minimal ABI just for the functions we need from AbelianAIAuthenticator.sol
const CONTRACT_ABI = [
    "function mintProvenance(address to, string memory imageHash) public",
    "function isHashRegistered(string memory imageHash) public view returns (bool)",
    "event ProvenanceMinted(address indexed creator, uint256 indexed tokenId, string imageHash, uint256 timestamp)"
];

export interface AbelianIdentity {
    address: string;
    publicKey: string;
}

export interface MintResult {
    txHash: string;
    tokenId: string;
    timestamp: string;
    ownerAddress: string;
    metadataHash: string;
}

export interface VerificationRecord {
    isVerified: boolean;
    txHash?: string;
    tokenId?: string;
    timestamp?: string;
    metadata?: any;
}

export const abelianService = {

    /**
     * Request connection to the user's MetaMask (QDay network).
     */
    connectWallet: async (): Promise<AbelianIdentity> => {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("MetaMask (or compatible Web3 wallet) is not installed.");
        }

        try {
            // Request account access
            const provider = new ethers.BrowserProvider((window as any).ethereum);

            // Ensure we are on the new QDay Testnet Chain ID (44003)
            const network = await provider.getNetwork();
            if (Number(network.chainId) !== 44003) {
                try {
                    // Attempt to switch to QDay testnet automatically
                    await (window as any).ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xabc3' }], // 44003 in hex
                    });
                } catch (switchError: any) {
                    throw new Error("Please switch your MetaMask network to the new QDay Testnet (Chain ID 44003, RPC rpc.qday.info).");
                }
            }

            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            return {
                address: address,
                publicKey: "metamask_connected"
            };
        } catch (error: any) {
            console.error("Wallet connection failed:", error);
            throw new Error("Failed to connect wallet: " + error.message);
        }
    },

    /**
     * Mints an "AI-Generated" provenance NFT directly on the QDay blockchain
     */
    mintProvenanceNFT: async (
        identity: AbelianIdentity,
        imageHash: string,
        aiScore: number
    ): Promise<MintResult> => {

        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error("Wallet not connected.");
        }

        if (!QDAY_CONTRACT_ADDRESS) {
            throw new Error("You must set the QDAY_CONTRACT_ADDRESS in services/abelianBlockchain.ts after deploying your contract!");
        }

        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();

        // Connect to the deployed contract
        const contract = new ethers.Contract(QDAY_CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        try {
            // Get current gas price from the network to avoid EIP-1559 issues on QDay testnet
            const feeData = await provider.getFeeData();

            // 1. Send transaction to QDay Network (added manual gas limits and legacy gasPrice to prevent RPC Internal Errors)
            const tx = await contract.mintProvenance(identity.address, imageHash, {
                gasLimit: 3000000,
                gasPrice: feeData.gasPrice || ethers.parseUnits("1", "gwei") // Force legacy Type 0 transaction
            });

            // 2. Wait for the transaction to be mined (this provides the real latency!)
            const receipt = await tx.wait();

            // 3. Extract the exact block timestamp and block data
            const block = await provider.getBlock(receipt.blockNumber);

            // Retrieve Token ID from emitted events if needed, for now we will stub it referencing the Tx Hash
            const tokenId = `qnft_${receipt.blockNumber}`;

            // (We still optionally save to local storage for the prototype /registry page, 
            // though ideally that indexer would be a dedicated backend reading the QDay logs)
            const registry = JSON.parse(localStorage.getItem('abelian_registry') || '[]');
            registry.push({
                txHash: receipt.hash,
                tokenId,
                timestamp: new Date(Number(block?.timestamp) * 1000).toISOString(),
                imageHash,
                aiScore,
                ownerAddress: identity.address
            });
            localStorage.setItem('abelian_registry', JSON.stringify(registry));

            return {
                txHash: receipt.hash,
                tokenId,
                timestamp: new Date(Number(block?.timestamp) * 1000).toISOString(),
                ownerAddress: identity.address,
                metadataHash: imageHash
            };
        } catch (error: any) {
            console.error("QDay Minting Error:", error);
            if (error.reason) {
                throw new Error(`Transaction reverted: ${error.reason}`);
            }
            throw new Error("Minting transaction failed or was rejected.");
        }
    },

    /**
     * Mints an "AI-Generated" provenance NFT directly via the Server API
     * No wallet connection required.
     */
    mintProvenanceServerSide: async (
        imageHash: string,
        aiScore: number
    ): Promise<MintResult> => {

        try {
            const response = await fetch('/api/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageHash, aiScore })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to mint NFT via server.");
            }

            const data = await response.json();

            // Save to local storage for the prototype /registry page
            const registry = JSON.parse(localStorage.getItem('abelian_registry') || '[]');
            registry.push({
                txHash: data.txHash,
                tokenId: data.tokenId,
                timestamp: data.timestamp,
                imageHash: data.metadataHash,
                aiScore: data.aiScore,
                ownerAddress: data.ownerAddress
            });
            localStorage.setItem('abelian_registry', JSON.stringify(registry));

            return data;

        } catch (error: any) {
            console.error("Server Minting Error:", error);
            throw new Error(error.message || "Minting request failed.");
        }
    },

    /**
     * Queries the QDay blockchain for an exact matching image hash
     */
    verifyExactMatch: async (imageHash: string): Promise<VerificationRecord> => {
        // If we are server-side, we must use a generic JSON RPC provider since we lack MetaMask
        const isServer = typeof window === 'undefined';

        if (!QDAY_CONTRACT_ADDRESS) {
            return { isVerified: false }; // Failsafe if not configured
        }

        try {
            // Create a read-only provider pointed at the QDay Testnet
            const provider = isServer
                ? new ethers.JsonRpcProvider('https://rpc.qday.info')
                : new ethers.BrowserProvider((window as any).ethereum);

            const contract = new ethers.Contract(QDAY_CONTRACT_ADDRESS, CONTRACT_ABI, provider);

            // Call the smart contract view function
            const isRegistered = await contract.isHashRegistered(imageHash);

            if (isRegistered) {
                // In a full production app, you would query TheGraph or an Indexer to get the specific 
                // Tx Hash and TokenId that first recorded this image hash.
                // For the prototype ui, we'll try to pull it from the local registry mock if we are client-side.

                let matchData = null;
                if (!isServer) {
                    const registry = JSON.parse(localStorage.getItem('abelian_registry') || '[]');
                    matchData = registry.find((r: any) => r.imageHash === imageHash);
                }

                return {
                    isVerified: true,
                    txHash: matchData ? matchData.txHash : "verified_on_chain",
                    tokenId: matchData ? matchData.tokenId : "found_on_qday",
                    timestamp: matchData ? matchData.timestamp : new Date().toISOString(),
                    metadata: { aiScore: matchData ? matchData.aiScore : "unknown" }
                };
            }

            return { isVerified: false };
        } catch (error) {
            console.error("QDay verification error:", error);
            return { isVerified: false };
        }
    }
};
