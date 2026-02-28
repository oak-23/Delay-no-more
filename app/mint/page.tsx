"use client";

import React, { useState } from 'react';
import UploadZone from '@/components/UploadZone';

interface MintResult {
    txHash: string;
    tokenId: string;
    timestamp: string;
    ownerAddress: string;
    metadataHash: string;
    aiScore: number;
}

type MintState = 'idle' | 'analyzing' | 'minting' | 'success' | 'error';

export default function MintPage() {
    const [file, setFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [mintState, setMintState] = useState<MintState>('idle');
    const [aiScore, setAiScore] = useState<number | null>(null);
    const [mintResult, setMintResult] = useState<MintResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setImagePreview(URL.createObjectURL(selectedFile));
        setMintState('idle');
        setAiScore(null);
        setMintResult(null);
        setErrorMsg('');
    };

    const handleMint = async () => {
        if (!file) return;
        try {
            setMintState('analyzing');

            // Brief delay for UX to show "Analyzing" state
            await new Promise(resolve => setTimeout(resolve, 800));

            setMintState('minting');

            // Send the image to the server-side minting API
            // The server handles EVERYTHING: hashing, AI scoring, and signing with the owner's wallet
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/mint', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Minting failed');
            }

            setAiScore(data.aiScore);
            setMintResult(data);
            setMintState('success');

            // Also save to localStorage for the registry page
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

        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred during minting.");
            setMintState('error');
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Mint & Brand <span className="text-gradient">AI Media</span></h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Anchor your AI-generated creations to the Abelian blockchain to establish unalterable provenance.
                </p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    No wallet required — minting is free and sponsored by the platform.
                </p>
            </div>

            {!file ? (
                <UploadZone onFileSelect={handleFileSelect} />
            ) : (
                <div className="glass-panel fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)' }}>
                            {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block' }} />}
                        </div>

                        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>File Details</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Name: {file.name}</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Size: {(file.size / 1024).toFixed(1)} KB</p>
                            </div>

                            {mintState === 'idle' && (
                                <button className="btn-primary" onClick={handleMint} style={{ width: '100%' }}>
                                    Analyze & Mint on Abelian
                                </button>
                            )}

                            {mintState === 'analyzing' && (
                                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ color: 'var(--accent-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Analyzing Image...</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Calculating quantum hash and AI provenance score</div>
                                </div>
                            )}

                            {mintState === 'minting' && (
                                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>Minting QNFT on QDay...</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Signing transaction via platform wallet — no wallet required from you!</div>
                                </div>
                            )}

                            {mintState === 'error' && (
                                <div>
                                    <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
                                        {errorMsg}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button className="btn-primary" onClick={() => { setMintState('idle'); setErrorMsg(''); }} style={{ flex: 1 }}>Try Again</button>
                                        <button className="btn-secondary" onClick={() => { setFile(null); setMintState('idle'); setErrorMsg(''); setMintResult(null); }} style={{ flex: 1 }}>Upload Different Image</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {mintState === 'success' && mintResult && (
                        <div className="fade-in" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginTop: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--success)', color: 'white' }}>✓</span>
                                <h3 style={{ color: 'var(--success)' }}>Successfully Minted!</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Token ID</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{mintResult.tokenId}</div>
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>QDay On-Chain Transaction</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', wordBreak: 'break-all', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                        {mintResult.txHash}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button className="btn-secondary" onClick={() => { setFile(null); setMintState('idle'); setMintResult(null); }} style={{ flex: 1 }}>Mint Another</button>
                                <button className="btn-primary" onClick={() => window.location.href = '/registry'} style={{ flex: 1 }}>View Public Registry</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
