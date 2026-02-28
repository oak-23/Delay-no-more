import Link from 'next/link';

export default function Header() {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem 2rem',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '32px', height: '32px',
                    background: 'var(--accent-gradient)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold'
                }}>
                    A
                </div>
                <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
                    Abelian <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Trust</span>
                </Link>
            </div>

            <nav style={{ display: 'flex', gap: '2rem' }}>
                <Link href="/mint" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Mint</Link>
                <Link href="/verify" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Verify</Link>
                <Link href="/registry" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Registry</Link>
            </nav>

            <div>
                <button style={{
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                }}>
                    Connect Node
                </button>
            </div>
        </header>
    );
}
