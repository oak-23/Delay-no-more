import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { abelianService } from '@/services/abelianBlockchain';
import { aiModelService } from '@/services/aiModel';
import { analyzeImageWithBedrock } from '@/services/bedrockAI';
import { imageProcessingService } from '@/services/imageProcessing';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 1. Calculate Image Hash (client-compatible pseudo-hash for blockchain matching)
        const hash = await aiModelService.calculateHash(file);

        // 2. Exact Match Query on QDay Blockchain
        const exactMatch = await abelianService.verifyExactMatch(hash);

        if (exactMatch.isVerified) {
            return NextResponse.json({
                status: 'verified',
                txHash: exactMatch.txHash,
                tokenId: exactMatch.tokenId,
                score: exactMatch.metadata?.aiScore,
                message: `This exact image was verified as AI-generated and minted on the Abelian blockchain.`
            });
        }

        // 3. Perceptual Similarity Check (dHash)
        // If no exact match, check if it's visually similar to an existing NFT
        try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const dHash = await imageProcessingService.generateDHash(buffer);

            const cachePath = path.join(process.cwd(), 'data', 'similarity_cache.json');
            if (fs.existsSync(cachePath)) {
                const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

                let bestMatch = null;
                let highestSimilarity = 0;

                for (const entry of cache) {
                    const similarity = imageProcessingService.calculateSimilarity(dHash, entry.dHash);
                    if (similarity > highestSimilarity) {
                        highestSimilarity = similarity;
                        bestMatch = entry;
                    }
                }

                // Threshold: > 85% similarity is considered a match
                if (bestMatch && highestSimilarity > 0.85) {
                    return NextResponse.json({
                        status: 'similar_match',
                        score: highestSimilarity,
                        tokenId: bestMatch.tokenId,
                        message: `Potential derivative detected! This image is ${(highestSimilarity * 100).toFixed(1)}% visually similar to an existing NFT (ID: ${bestMatch.tokenId}) on the Abelian registry.`
                    });
                }
            }
        } catch (err) {
            console.warn('[Verify API] Similarity check failed:', err);
        }

        // 4. No exact or similar match found — Run REAL AI Analysis via AWS Bedrock Llama 3.2 Vision
        try {
            const arrayBuffer = await file.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            const mimeType = file.type || 'image/png';

            const bedrockResult = await analyzeImageWithBedrock(imageBuffer, mimeType);

            if (bedrockResult.verdict === 'AI_GENERATED') {
                return NextResponse.json({
                    status: 'high_probability',
                    score: bedrockResult.confidence,
                    verdict: bedrockResult.verdict,
                    explanation: bedrockResult.explanation,
                    message: `AWS Bedrock AI Vision analysis indicates this image is AI-generated (${(bedrockResult.confidence * 100).toFixed(0)}% confidence), though it is not an exact match to any minted original on the Abelian registry.`
                });
            }

            if (bedrockResult.verdict === 'REAL') {
                return NextResponse.json({
                    status: 'likely_real',
                    score: 1 - bedrockResult.confidence,
                    verdict: bedrockResult.verdict,
                    explanation: bedrockResult.explanation,
                    message: `AWS Bedrock AI Vision analysis suggests this image is likely a real photograph (${(bedrockResult.confidence * 100).toFixed(0)}% confidence). No provenance record found on the Abelian registry.`
                });
            }

            // UNCERTAIN verdict
            return NextResponse.json({
                status: 'unverified',
                score: 0.5,
                verdict: bedrockResult.verdict,
                explanation: bedrockResult.explanation,
                message: `AI analysis was inconclusive. The image has no provenance record on the Abelian registry and the model could not determine its origin with high confidence.`
            });

        } catch (bedrockError: any) {
            console.error('Bedrock fallback error:', bedrockError);
            // If Bedrock fails (e.g., credentials not set), return a graceful degradation
            return NextResponse.json({
                status: 'unverified',
                score: null,
                message: `Warning: This image has no provenance record on the Abelian registry. AI analysis is currently unavailable (${bedrockError.message}).`
            });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
