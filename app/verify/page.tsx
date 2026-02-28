"use client";

import React, { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import VerificationResult from '@/components/VerificationResult';

export default function VerifyPage() {
    const [file, setFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleVerify = async (selectedFile: File) => {
        setFile(selectedFile);
        setImagePreview(URL.createObjectURL(selectedFile));
        setIsVerifying(true);
        setResult(null);
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch('/api/verify', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            setResult(data);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Verify & <span className="text-gradient">Trace</span></h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Upload an image to verify its provenance against the Abelian blockchain or detect AI manipulation.
                </p>
            </div>

            {!file ? (
                <UploadZone onFileSelect={handleVerify} title="Upload to Verify" subtitle="Drop image here to start tracing..." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ width: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)' }}>
                            {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Analyzing Source Material</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>{file.name}</p>
                            {isVerifying ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--accent-secondary)' }}>
                                    <div className="spinner"></div>
                                    <span>Querying Abelian Registry & Perceptual AI check...</span>
                                </div>
                            ) : (
                                <button className="btn-secondary" onClick={() => { setFile(null); setResult(null); }}>
                                    Verify Another Image
                                </button>
                            )}
                        </div>
                    </div>

                    {!isVerifying && result && (
                        <VerificationResult
                            status={result.status}
                            message={result.message}
                            score={result.score}
                            txHash={result.txHash}
                        />
                    )}

                    {!isVerifying && errorMsg && (
                        <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                            Error: {errorMsg}
                        </div>
                    )}
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(0, 210, 255, 0.3);
          border-radius: 50%;
          border-top-color: var(--accent-secondary);
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
        </div>
    );
}
