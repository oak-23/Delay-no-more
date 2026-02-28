/**
 * Mock Service for AI Model Analysis
 * 
 * In production, `calculateHash` runs client-side.
 * `predictAIOrigin` might run client-side (TensorFlow.js) for privacy,
 * or server-side (PyTorch/ONNX API) for verification robust checks.
 */

// Simulated processing delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const aiModelService = {
    /**
     * Generates a SHA-256 fingerprint of the image file.
     * We mock it by creating a pseudo-hash from the file name, size and type
     * for prototype demonstration purposes so the same file yields the same hash.
     */
    calculateHash: async (file: File): Promise<string> => {
        // A quick pseudo-hash for demonstration
        const str = `${file.name}-${file.size}-${file.type}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        await delay(800); // simulate hashing time
        return `hash_${Math.abs(hash).toString(16).padStart(16, '0')}`;
    },

    /**
     * Mock AI model that "analyzes" an image and returns a probability [0, 1]
     * that the image is AI-generated.
     */
    predictAIOrigin: async (file: File): Promise<number> => {
        await delay(2000); // Simulate neural network inference

        // For demonstration, we'll pseudo-randomly determine it based on file name length
        // so it's consistent for the exact same file during a session.
        const pseudoRandom = (file.name.length * file.size) % 100;

        // Shift the distribution to make it look like a high-confidence AI detector
        // 80% of arbitrary uploads will be flagged as high-probability AI for demo effect
        if (pseudoRandom > 20) {
            return 0.85 + (pseudoRandom / 100) * 0.14; // Returns 0.85 -> 0.99
        } else {
            return 0.1 + (pseudoRandom / 100) * 0.4; // Returns 0.1 -> 0.5
        }
    },

    /**
     * Server-side mock to compare vector embeddings (simulated).
     */
    checkPerceptualSimilarity: async (imageHash: string): Promise<{ score: number, alert: boolean }> => {
        await delay(1500);
        // Mocking an arbitrary similarity score
        const randomScore = 0.5 + (Math.random() * 0.45); // 50% to 95%
        return {
            score: randomScore,
            alert: randomScore > 0.8
        };
    }
};
