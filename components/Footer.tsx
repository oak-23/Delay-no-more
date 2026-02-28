export default function Footer() {
    return (
        <footer style={{
            padding: '3rem 2rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto'
        }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                &copy; {new Date().getFullYear()} ExposAI. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                <a href="https://pqabelian.io" target="_blank" rel="noopener noreferrer">Abelian Network</a>
                <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener noreferrer">AWS Bedrock</a>
                <a href="#">Privacy Framework</a>
                <a href="#">Terms of Service</a>
            </div>
        </footer>
    );
}
