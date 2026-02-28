import { NextResponse } from 'next/server';
import { abelianService } from '@/services/abelianBlockchain';
import { aiModelService } from '@/services/aiModel';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 1. Calculate Image Hash
        const hash = await aiModelService.calculateHash(file);

        // 2. Exact Match Query on Abelian Blockchain
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

        // 3. No exact match found, perform perceptual similarity (Deepfake detection)
        const similarity = await aiModelService.checkPerceptualSimilarity(hash);

        if (similarity.alert) {
            return NextResponse.json({
                status: 'high_probability',
                score: similarity.score,
                message: `Our AI analysis suggests this image has a very high probability of being AI-generated, though it is not an exact match to a minted original on the Abelian registry.`
            });
        }

        return NextResponse.json({
            status: 'unverified',
            score: similarity.score,
            message: `Warning: This image shows signs of potential manipulation but has no clear provenance or matches on the Abelian registry.`
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
