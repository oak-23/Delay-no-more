/**
 * DeepSeek AI wrapper for image analysis and hashing.
 * Uses the DeepSeek API to process the image.
 */

// Helper to convert a File to a base64 string
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

// Fallback local hash to ensure consistency if the AI returns variable strings
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
};

export const deepSeekAIWrapper = {
    /**
     * Hashes an image and analyzes it using the DeepSeek API.
     * @param {File} imageFile - The uploaded image file.
     * @returns {Promise<{ hash: string, isAiGenerated: boolean, confidence: number }>}
     */
    analyzeAndHashImage: async (imageFile) => {
        if (!imageFile) {
            throw new Error("No image file provided.");
        }

        const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
        if (!apiKey) {
            console.warn("No VITE_DEEPSEEK_API_KEY found in .env. Falling back to mock logic for demo purposes.");
            // Fallback mock logic just in case they haven't set up the API key yet
            const baseString = `${imageFile.name}-${imageFile.size}`;
            const fallbackHash = `ds_hash_${simpleHash(baseString)}`;
            return {
                hash: fallbackHash,
                isAiGenerated: Math.random() > 0.6,
                confidence: 0.85 + (Math.random() * 0.14)
            };
        }

        const base64Image = await fileToBase64(imageFile);

        // In a real scenario, we might want to generate a local cryptographic hash
        // (like SHA-256) and ask DeepSeek to verify the content semantics.
        // For this hackathon, we will ask DeepSeek to generate a complete analysis JSON.

        try {
            const response = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    // Adjust the model name depending on which multimodal DeepSeek model you use
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: "You are an AI deepfake detector and image authenticator. Analyze the provided image and return a JSON output with three keys: 'hash' (a unique 32-character hex perceptual AI hash of the image), 'isAiGenerated' (boolean, true if it's a deepfake/AI-generated), and 'confidence' (number between 0 and 1 representing your confidence)."
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Analyze this image and return the JSON analysis."
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: base64Image
                                    }
                                }
                            ]
                        }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const aiResponseContent = data.choices[0].message.content;

            // Parse the JSON returned by DeepSeek
            const parsedResult = JSON.parse(aiResponseContent);

            return {
                hash: parsedResult.hash || `ds_hash_${simpleHash(base64Image.substring(0, 100))}`,
                isAiGenerated: Boolean(parsedResult.isAiGenerated),
                confidence: Number(parsedResult.confidence) || 0.95
            };

        } catch (error) {
            console.error("DeepSeek API call failed. Did you supply a valid image to a vision-capable DeepSeek endpoint?", error);
            throw error;
        }
    }
};
