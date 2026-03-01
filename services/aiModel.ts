import crypto from 'crypto';

/**
 * Service for AI Model Analysis and Hashing
 */

// Simulated processing delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const aiModelService = {
    /**
     * Generates a real SHA-256 fingerprint of the image file content.
     * This ensures that even if a file is renamed, the hash remains identical
     * as long as the content hasn't changed.
     */
    calculateHash: async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Create a real SHA-256 hash of the binary content
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');

            console.log(`[Hashing] File: ${file.name}, SHA-256: ${hash}`);
            return `sha256_${hash}`;
        } catch (error) {
            console.error('[Hashing] Error:', error);
            // Fallback to a pseudo-hash if content reading fails
            const str = `${file.name}-${file.size}-${file.type}`;
            let h = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                h = ((h << 5) - h) + char;
                h = h & h;
            }
            return `fallback_hash_${Math.abs(h).toString(16).padStart(16, '0')}`;
        }
    },

    /**
     * Mock AI model that "analyzes" an image and returns a probability [0, 1]
     * that the image is AI-generated.
     * (Note: Real analysis is now handled by bedrockAI.ts)
     */
    predictAIOrigin: async (file: File): Promise<number> => {
        await delay(1000);
        const pseudoRandom = (file.name.length * file.size) % 100;
        if (pseudoRandom > 20) {
            return 0.85 + (pseudoRandom / 100) * 0.14;
        } else {
            return 0.1 + (pseudoRandom / 100) * 0.4;
        }
    }
};
