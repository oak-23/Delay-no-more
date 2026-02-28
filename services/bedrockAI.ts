/**
 * Server-side AWS Bedrock AI Service
 * 
 * Uses Llama 3.2 90B Vision (via Cross-Region inference) to analyze
 * whether an uploaded image is AI-generated or a real photograph.
 * 
 * This module runs ONLY on the server (Next.js API routes).
 * AWS credentials are read from .env.local and never exposed to the browser.
 */
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
});

// Cross-Region Inference profile
const MODEL_ID = 'us.meta.llama3-2-90b-instruct-v1:0';

export interface BedrockAnalysisResult {
    verdict: 'REAL' | 'AI_GENERATED' | 'UNCERTAIN';
    confidence: number;
    explanation: string;
    rawOutput: string;
}

/**
 * Sends an image to AWS Bedrock Llama 3.2 Vision for analysis.
 */
export async function analyzeImageWithBedrock(
    imageBuffer: Buffer,
    mimeType: string
): Promise<BedrockAnalysisResult> {

    // Map mimeType to Bedrock-supported format
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) mediaType = 'image/jpeg';
    else if (mimeType.includes('gif')) mediaType = 'image/gif';
    else if (mimeType.includes('webp')) mediaType = 'image/webp';

    // Safety-friendly prompt that focuses on content authenticity verification
    const prompt = `You are a helpful digital content authenticity assistant helping people understand images.

Please examine this image and share your professional assessment:

1. ORIGIN ASSESSMENT: Based on visual characteristics, does this image appear to be a natural photograph taken with a camera, or does it appear to be computer-generated/digitally created artwork?

2. VISUAL OBSERVATIONS: What specific visual elements inform your assessment? Consider things like:
   - Texture patterns and surface details
   - Lighting consistency and shadow behavior
   - Geometric accuracy and perspective
   - Fine details in complex areas (hair, foliage, reflections)
   - Overall composition style

3. Provide your assessment using this exact format at the end:
   ASSESSMENT: CAMERA_PHOTO
   or
   ASSESSMENT: DIGITALLY_CREATED
   CONFIDENCE_LEVEL: [number from 0 to 100]

Please be thorough but concise in your analysis.`;

    try {
        const command = new ConverseCommand({
            modelId: MODEL_ID,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            image: {
                                format: mediaType.split('/')[1] as 'jpeg' | 'png' | 'gif' | 'webp',
                                source: {
                                    bytes: imageBuffer
                                }
                            }
                        },
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            inferenceConfig: {
                maxTokens: 1024,
                temperature: 0.3,
                topP: 0.9
            }
        });

        const response = await bedrockClient.send(command);

        // Extract text from Converse API response
        let outputText = '';
        if (response.output?.message?.content) {
            for (const block of response.output.message.content) {
                if (block.text) {
                    outputText += block.text;
                }
            }
        }

        console.log('[Bedrock] Raw output:', outputText.substring(0, 500));

        // Parse the assessment
        const assessmentMatch = outputText.match(/ASSESSMENT:\s*(CAMERA_PHOTO|DIGITALLY_CREATED)/i);
        const confidenceMatch = outputText.match(/CONFIDENCE_LEVEL:\s*(\d+)/i);

        let verdict: 'REAL' | 'AI_GENERATED' | 'UNCERTAIN' = 'UNCERTAIN';
        if (assessmentMatch) {
            verdict = assessmentMatch[1].toUpperCase() === 'CAMERA_PHOTO' ? 'REAL' : 'AI_GENERATED';
        }

        let confidence = 0.7; // Default if model doesn't specify
        if (confidenceMatch) {
            confidence = Math.min(parseInt(confidenceMatch[1], 10) / 100, 1.0);
        }

        // Extract explanation (everything before the ASSESSMENT line)
        const explanation = outputText.split(/ASSESSMENT:/i)[0].trim();

        return {
            verdict,
            confidence,
            explanation: explanation || outputText,
            rawOutput: outputText
        };
    } catch (error: any) {
        console.error('[Bedrock] Error:', error.message);
        throw new Error(`Bedrock analysis failed: ${error.message}`);
    }
}
