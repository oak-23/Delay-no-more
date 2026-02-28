"use client";

import React from 'react';

interface VerificationResultProps {
    status: 'verified' | 'high_probability' | 'unverified';
    txHash?: string;
    score?: number;
    message: string;
}

export default function VerificationResult({ status, txHash, score, message }: VerificationResultProps) {

    const getConfig = () => {
        switch (status) {
            case 'verified':
                return {
                    color: 'var(--success)',
                    bg: 'rgba(34, 197, 94, 0.1)',
                    icon: <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />,
                    title: "Verified AI-Generated on Abelian"
                };
            case 'high_probability':
                return {
                    color: 'var(--warning)',
                    bg: 'rgba(234, 179, 8, 0.1)',
                    icon: <path d="m10.29 3.86-7.5 13.06a1.5 1.5 0 0 0 1.3 2.25h15.02a1.5 1.5 0 0 0 1.3-2.25l-7.5-13.06a1.5 1.5 0 0 0-2.62 0M12 9v4m0 4h.01" />,
                    title: "High AI Similarity Score"
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
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        {message}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '8px' }}>
                        {score !== undefined && (
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Confidence Score</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(score * 100).toFixed(1)}%</div>
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
