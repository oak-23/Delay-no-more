"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface RegistryItem {
    txHash: string;
    tokenId: string;
    timestamp: string;
    imageHash: string;
    aiScore: number;
    ownerAddress: string;
}

export default function RegistryPage() {
    const [items, setItems] = useState<RegistryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // In production, this would query the Abelian network or an indexer.
        // For the prototype, we read from the mocked local storage.
        const loadRegistry = () => {
            try {
                const data = localStorage.getItem('abelian_registry');
                if (data) {
                    const parsed = JSON.parse(data);
                    // Sort newest first
                    parsed.sort((a: RegistryItem, b: RegistryItem) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    setItems(parsed);
                }
            } catch (e) {
                console.error("Failed to load registry", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadRegistry();
    }, []);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Public <span className="text-gradient">Registry</span></h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Verified AI-generated content anchored to the Abelian blockchain.
                    </p>
                </div>
                <div>
                    <Link href="/mint" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                        Mint New QNFT
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    Loading registry data from Abelian nodes...
                </div>
            ) : items.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-tertiary)' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No records found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Be the first to create an unalterable provenance record for your AI art.
                    </p>
                    <Link href="/mint" className="btn-secondary">Get Started</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {items.map((item) => (
                        <div key={item.txHash} className="glass-panel fade-in" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s ease', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(8px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>

                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '8px',
                                background: 'var(--accent-gradient)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 'bold', fontSize: '0.8rem'
                            }}>
                                AI
                            </div>

                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1fr 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Token ID</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.tokenId}</div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Owner</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.ownerAddress.substring(0, 12)}...
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Date</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Tx Hash</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-secondary)' }}>
                                        {item.txHash.substring(0, 10)}...
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
