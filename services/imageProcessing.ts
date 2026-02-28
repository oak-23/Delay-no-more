import sharp from 'sharp';

/**
 * Server-side image processing for perceptual hashing (dHash).
 */
export const imageProcessingService = {
    /**
     * Generates a 64-bit dHash (Difference Hash) of an image.
     * dHash is robust to resizing and aspect ratio changes.
     */
    async generateDHash(imageBuffer: Buffer): Promise<string> {
        try {
            // 1. Resize to 9x8 and grayscale
            // 9x8 allows for 8 horizontal differences per row across 8 rows
            const { data, info } = await sharp(imageBuffer)
                .grayscale()
                .resize(9, 8, { fit: 'fill' })
                .raw()
                .toBuffer({ resolveWithObject: true });

            let hash = '';
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const left = data[row * 9 + col];
                    const right = data[row * 9 + col + 1];
                    hash += left > right ? '1' : '0';
                }
            }

            // Convert binary string to 16-character hex
            return parseInt(hash, 2).toString(16).padStart(16, '0');
        } catch (error) {
            console.error('[dHash] Error:', error);
            throw new Error('Failed to generate perceptual hash');
        }
    },

    /**
     * Calculates the Hamming distance between two hex hashes.
     * Distance of 0 means identical, higher means more different.
     * Max distance is 64.
     */
    calculateHammingDistance(hash1: string, hash2: string): number {
        const bin1 = BigInt('0x' + hash1).toString(2).padStart(64, '0');
        const bin2 = BigInt('0x' + hash2).toString(2).padStart(64, '0');

        let distance = 0;
        for (let i = 0; i < 64; i++) {
            if (bin1[i] !== bin2[i]) distance++;
        }
        return distance;
    },

    /**
     * Calculates similarity percentage based on Hamming distance.
     */
    calculateSimilarity(hash1: string, hash2: string): number {
        const distance = this.calculateHammingDistance(hash1, hash2);
        return 1 - (distance / 64);
    }
};
