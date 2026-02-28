"use client";

import React, { useState, useRef } from 'react';

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    title?: string;
    subtitle?: string;
    isLoading?: boolean;
}

export default function UploadZone({
    onFileSelect,
    title = "Upload Image",
    subtitle = "Drag & drop or click to select",
    isLoading = false
}: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (e.dataTransfer.files[0].type.startsWith('image/')) {
                onFileSelect(e.dataTransfer.files[0]);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div
            className={`glass-panel upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            style={{
                padding: '3rem',
                textAlign: 'center',
                border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                background: isDragging ? 'rgba(88, 51, 255, 0.05)' : 'var(--glass-bg)',
                opacity: isLoading ? 0.6 : 1
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleChange}
                accept="image/*"
                style={{ display: 'none' }}
                disabled={isLoading}
            />

            <div style={{ pointerEvents: 'none' }}>
                <svg
                    style={{
                        width: '64px', height: '64px',
                        margin: '0 auto 1.5rem',
                        color: isDragging ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                        transition: 'color 0.3s ease'
                    }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: isDragging ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>
                    {title}
                </h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                    {isLoading ? 'Processing...' : subtitle}
                </p>
            </div>
        </div>
    );
}
