import Link from 'next/link';

export default function Home() {
    return (
        <main className="auth-container">
            <div className="hero-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

                {/* Background glow effects */}
                <div style={{ position: 'absolute', top: '10%', left: '20%', width: '300px', height: '300px', background: 'var(--accent-primary)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '300px', height: '300px', background: 'var(--accent-secondary)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }} />

                <div className="glass-panel fade-in" style={{ padding: '4rem', maxWidth: '800px', width: '100%', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>

                    <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1.1 }}>
                        The <span className="text-gradient">Abelian AI</span> Authenticator
                    </h1>

                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6 }}>
                        A quantum-safe provenance hub. Restore trust in digital media by anchoring AI-generated content to the unbreakable Abelian blockchain.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <Link href="/mint" className="btn-primary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            Mint & Brand AI Media
                        </Link>
                        <Link href="/verify" className="btn-secondary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            Verify Provenance
                        </Link>
                    </div>

                    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Quantum-Resistant</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Secured by lattice-based cryptography.</p>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Immutable History</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Anchored to the QDay blockchain.</p>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
