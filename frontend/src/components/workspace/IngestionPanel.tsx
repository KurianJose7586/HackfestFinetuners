"use client";

import { useIntegrationStore } from '@/store/useIntegrationStore';
import { CheckCircle2, XCircle, Play, Upload, Terminal } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function IngestionPanel({ projectId }: { projectId: string }) {
    const { integrations } = useIntegrationStore();
    const [isIngesting, setIsIngesting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const connectedIntegrations = integrations.filter((i) => i.connected);

    const startIngestion = () => {
        setIsIngesting(true);
        setLogs([]);

        const logMessages = [
            '[00:00] Starting data ingestion...',
            '[00:02] Connecting to Slack workspace...',
            '[00:04] ✓ Found 15 channels',
            '[00:05] Processing #general (245 messages)...',
            '[00:08] ✓ Extracted 12 requirements',
            '[00:10] Processing #product (156 messages)...',
            '[00:12] ✓ Extracted 8 decisions',
            '[00:14] Connecting to Gmail...',
            '[00:16] ✓ Found 42 relevant threads',
            '[00:18] Analyzing email content...',
            '[00:20] ✓ Extracted 15 stakeholder inputs',
            '[00:22] Running noise filter...',
            '[00:24] Removed 67% non-relevant content',
            '[00:26] ✓ Ingestion complete! Collected 35 data points'
        ];

        logMessages.forEach((msg, index) => {
            setTimeout(() => {
                setLogs((prev) => [...prev, msg]);
                if (index === logMessages.length - 1) {
                    setTimeout(() => setIsIngesting(false), 1000);
                }
            }, index * 800);
        });
    };

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="grid grid-cols-2 gap-6">
            {/* Left: Connectors */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-100">Active Data Sources</h3>
                    <button
                        onClick={startIngestion}
                        disabled={isIngesting || connectedIntegrations.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                        <Play size={14} />
                        {isIngesting ? 'Ingesting...' : 'Start Ingestion'}
                    </button>
                </div>

                <div className="space-y-3">
                    {integrations.map((integration) => (
                        <div
                            key={integration.id}
                            className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-zinc-100 capitalize">{integration.type}</p>
                                    <p className="text-sm text-zinc-400 mt-0.5">
                                        {integration.connected ? integration.name : 'Not configured'}
                                    </p>
                                </div>
                                {integration.connected ? (
                                    <div className="flex items-center gap-2 text-green-400">
                                        <CheckCircle2 size={16} />
                                        <span className="text-xs">Active</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <XCircle size={16} />
                                        <span className="text-xs">Inactive</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* File Upload */}
                <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-lg p-8 text-center hover:border-cyan-500/50 transition-colors">
                    <Upload size={32} className="mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-400 text-sm mb-2">Drop files here or click to upload</p>
                    <p className="text-zinc-600 text-xs">PDF, DOCX, TXT (max 10MB)</p>
                </div>
            </div>

            {/* Right: Live Logs */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Terminal size={18} className="text-green-400" />
                    <h3 className="text-lg font-semibold text-zinc-100">Ingestion Log</h3>
                </div>

                <div className="bg-black border border-green-500/20 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-xs">
                    {logs.length === 0 ? (
                        <p className="text-green-500/50">Waiting for ingestion to start...</p>
                    ) : (
                        <div className="space-y-1">
                            {logs.map((log, index) => (
                                <div key={index} className="text-green-500">
                                    {log}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
