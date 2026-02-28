import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
    title: 'ExposAI | Quantum-Safe Provenance Hub',
    description: 'ExposAI is a revolutionary web platform acting as a trust layer for the AI age. Mint and verify AI content securely on the Abelian blockchain.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} auth-container`}>
                <Header />
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    );
}
