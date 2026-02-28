"use client";

import React from 'react';

interface VerificationResultProps {
    status: 'verified' | 'similar_match' | 'high_probability' | 'likely_real' | 'unverified';
    txHash?: string;
    tokenId?: string;
    score?: number;
    message: string;
    explanation?: string;
}

export default function VerificationResult({ status, txHash, tokenId, score, message, explanation }: VerificationResultProps) {

    const getConfig = () => {
        switch (status) {
            case 'verified':
                return {
                    color: 'var(--success)',
                    bg: 'rgba(34, 197, 94, 0.1)',
                    icon: <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />,
                    title: "Verified AI-Generated on Abelian"
                };
            case 'similar_match':
                return {
                    color: '#f97316', // Orange
                    bg: 'rgba(249, 115, 22, 0.1)',
                    icon: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-16v10m-4-4h8" />,
                    title: "Perceptual Similarity Detected"
                };
            case 'high_probability':
                return {
                    color: 'var(--warning)',
                    bg: 'rgba(234, 179, 8, 0.1)',
                    icon: <path d="m10.29 3.86-7.5 13.06a1.5 1.5 0 0 0 1.3 2.25h15.02a1.5 1.5 0 0 0 1.3-2.25l-7.5-13.06a1.5 1.5 0 0 0-2.62 0M12 9v4m0 4h.01" />,
                    title: "High AI Similarity Score"
                };
            case 'likely_real':
                return {
                    color: '#22d3ee',
                    bg: 'rgba(34, 211, 238, 0.1)',
                    icon: <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />,
                    title: "Likely Real Photograph"
                };
            case 'unverified':
            default:
                return {
                    color: 'var(--danger)',
                    bg: 'rgba(239, 68, 68, 0.1)',
                    icon: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm-4-10h8" />,
                    title: "Deepfake Alert / No Provenance"
                };
        }
    };

    const config = getConfig();

    return (
        <div className="glass-panel fade-in" style={{ padding: '2rem', borderTop: `4px solid ${config.color}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                <div style={{
                    width: '48px', height: '48px',
                    borderRadius: '50%',
                    background: config.bg,
                    color: config.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {config.icon}
                    </svg>
                </div>

                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: config.color }}>{config.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                        {message}
                    </p>

                    {explanation && (
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            borderLeft: `3px solid ${config.color}`
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>AWS Bedrock AI Analysis</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {explanation}
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '8px' }}>
                        {score !== undefined && (
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {status === 'similar_match' ? 'Visual Similarity' : 'AI Confidence Score'}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{typeof score === 'number' && !isNaN(score) ? `${(score * 100).toFixed(1)}%` : '100.0%'}</div>
                            </div>
                        )}

                        {txHash && (
                            <div style={{ gridColumn: score !== undefined ? 'auto' : '1 / -1' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abelian On-Chain Tx</div>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--accent-secondary)',
                                    wordBreak: 'break-all',
                                    padding: '4px 8px',
                                    background: 'rgba(0, 210, 255, 0.1)',
                                    borderRadius: '4px',
                                    marginTop: '0.25rem',
                                    display: 'inline-block'
                                }}>
                                    {txHash}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
