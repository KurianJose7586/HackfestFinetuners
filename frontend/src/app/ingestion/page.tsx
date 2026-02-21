"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Hash, Mail, Upload, CheckCircle2, AlertCircle, BarChart3,
    Eye, RefreshCw, Trash2, FileText, File, Table2, X
} from 'lucide-react';
import Drawer from '@/components/ui/Drawer';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SOURCES = [
    { id: '1', type: 'slack', name: '#product-requirements', status: 'complete', chunks: 142, duplicates: 18, synced: '14:02 today' },
    { id: '2', type: 'slack', name: '#engineering-standup', status: 'complete', chunks: 68, duplicates: 5, synced: '14:02 today' },
    { id: '3', type: 'file', name: 'requirements_v3.pdf', status: 'complete', chunks: 38, duplicates: 2, synced: '13:55 today' },
];

const MOCK_CHUNKS = [
    { id: 'chunk_001', speaker: 'Priya Sharma', source: '#product-requirements', words: 34, text: 'The system must support real-time notifications for all user-facing events, with a maximum latency of 200ms from event trigger to display.' },
    { id: 'chunk_002', speaker: 'Raj Patel', source: '#product-requirements', words: 28, text: 'We need to decide on the database architecture before sprint 3 — either PostgreSQL with read replicas or a distributed NoSQL approach.' },
    { id: 'chunk_003', speaker: 'Ananya Singh', source: '#engineering-standup', words: 22, text: 'Blocked on the authentication flow — the OAuth2 token refresh logic needs to handle edge cases around token expiry during active sessions.' },
    { id: 'chunk_004', speaker: 'Priya Sharma', source: '#product-requirements', words: 41, text: 'The mobile app should launch by end of Q2. We cannot miss that deadline given the investor commitments already made in the last board meeting.' },
];

const CHANNELS = [
    { name: '#product-requirements', members: 12, messages: 1204, selected: true },
    { name: '#engineering-standup', members: 8, messages: 892, selected: true },
    { name: '#design-feedback', members: 6, messages: 540, selected: false },
    { name: '#general', members: 45, messages: 8900, selected: false },
];

const FILE_ICONS: Record<string, React.ReactNode> = {
    pdf: <FileText size={14} className="text-red-400" />,
    txt: <File size={14} className="text-zinc-400" />,
    csv: <Table2 size={14} className="text-emerald-400" />,
};

// ─── Upload File entry ────────────────────────────────────────────────────────

interface UploadedFile { name: string; size: string; ext: string; status: 'uploaded' | 'processing' | 'done' }

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IngestionPage() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState(MOCK_SOURCES[0]);
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
        { name: 'requirements_v3.pdf', size: '2.1 MB', ext: 'pdf', status: 'done' },
    ]);
    const [channels, setChannels] = useState(CHANNELS);
    const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

    const toggleChannel = (name: string) =>
        setChannels(prev => prev.map(c => c.name === name ? { ...c, selected: !c.selected } : c));

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        files.forEach(f => {
            const ext = f.name.split('.').pop() ?? 'txt';
            const size = f.size > 1024 * 1024
                ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                : `${(f.size / 1024).toFixed(0)} KB`;
            setUploadedFiles(prev => [...prev, { name: f.name, size, ext, status: 'uploaded' }]);
        });
    }, []);

    const removeFile = (name: string) =>
        setUploadedFiles(prev => prev.filter(f => f.name !== name));

    const openDrawer = (source: typeof MOCK_SOURCES[0]) => {
        setSelectedSource(source);
        setDrawerOpen(true);
    };

    return (
        <div className="p-6 space-y-6 max-w-[1400px]">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Source Management</h1>
                <p className="text-sm text-zinc-500 mt-0.5">Connect and manage your data sources</p>
            </div>

            {/* S2-01: Connector Cards */}
            <div className="grid md:grid-cols-3 gap-5">

                {/* Slack Connector */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                    className="glass-card p-5 rounded-xl space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#4A154B]/40 border border-[#4A154B]/60 flex items-center justify-center">
                            <Hash size={18} className="text-[#e01e5a]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-100">Slack</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-[11px] text-emerald-400 font-medium">Connected</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-500">Workspace: <span className="text-zinc-300 font-mono">hackfest-team.slack.com</span></p>

                    {/* Rate limit */}
                    <div>
                        <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-zinc-500">API token usage</span>
                            <span className="text-emerald-400 font-medium">42%</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                            <div className="h-full bg-emerald-400/70 rounded-full" style={{ width: '42%' }} />
                        </div>
                    </div>

                    {/* Channel selector */}
                    <div>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Channels</p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {channels.map(ch => (
                                <label
                                    key={ch.name}
                                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={ch.selected}
                                        onChange={() => toggleChannel(ch.name)}
                                        className="w-3.5 h-3.5 accent-cyan-400 cursor-pointer"
                                    />
                                    <span className="text-xs text-zinc-300 font-mono flex-1 truncate">{ch.name}</span>
                                    <span className="text-[10px] text-zinc-600">{ch.messages.toLocaleString()}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                        <RefreshCw size={13} />
                        Sync Selected
                    </button>
                </motion.div>

                {/* Gmail — Coming Soon */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }}
                    className="glass-card p-5 rounded-xl space-y-4 opacity-50 cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Mail size={18} className="text-zinc-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-zinc-400">Gmail</h3>
                                <span className="glass-badge bg-zinc-800/60 border border-white/10 text-zinc-500 text-[9px]">COMING SOON</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 mt-0.5">Out of scope for v1</p>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-600">Gmail integration will allow ingestion of email threads as signal sources.</p>
                    <button disabled className="btn-secondary w-full text-sm opacity-50 cursor-not-allowed">Connect Gmail</button>
                </motion.div>

                {/* File Upload */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }}
                    className="glass-card p-5 rounded-xl space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                            <Upload size={18} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-100">File Upload</h3>
                            <p className="text-[11px] text-zinc-500 mt-0.5">CSV, PDF, TXT · max 25MB</p>
                        </div>
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-all cursor-pointer ${dragOver
                                ? 'border-cyan-400/60 bg-cyan-400/5'
                                : 'border-white/10 hover:border-white/20 hover:bg-white/3'
                            }`}
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        <Upload size={22} className={dragOver ? 'text-cyan-400' : 'text-zinc-600'} />
                        <p className="text-xs text-zinc-400 text-center">
                            Drop files here or <span className="text-cyan-400">browse</span>
                        </p>
                        <input id="file-input" type="file" multiple accept=".csv,.pdf,.txt" className="hidden"
                            onChange={e => {
                                Array.from(e.target.files ?? []).forEach(f => {
                                    const ext = f.name.split('.').pop() ?? 'txt';
                                    const size = f.size > 1024 * 1024
                                        ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                                        : `${(f.size / 1024).toFixed(0)} KB`;
                                    setUploadedFiles(prev => [...prev, { name: f.name, size, ext, status: 'uploaded' }]);
                                });
                            }}
                        />
                    </div>

                    {/* File list */}
                    {uploadedFiles.length > 0 && (
                        <div className="space-y-1.5">
                            {uploadedFiles.map(f => (
                                <div key={f.name} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/4">
                                    {FILE_ICONS[f.ext] ?? <File size={14} className="text-zinc-400" />}
                                    <span className="text-xs text-zinc-300 flex-1 truncate">{f.name}</span>
                                    <span className="text-[10px] text-zinc-600 flex-shrink-0">{f.size}</span>
                                    {f.status === 'done' && <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />}
                                    <button onClick={() => removeFile(f.name)} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                        <Upload size={13} />
                        Process Files
                    </button>
                </motion.div>
            </div>

            {/* S2-02: Active Sources Table */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
                className="glass-card rounded-xl overflow-hidden"
            >
                <div className="px-5 py-4 border-b border-white/8">
                    <h2 className="text-sm font-semibold text-zinc-200">Active Sources</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Source', 'Status', 'Chunks', 'Deduped', 'Last Synced', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {MOCK_SOURCES.map((src, i) => (
                                <motion.tr
                                    key={src.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                    className="hover:bg-white/4 transition-colors"
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            {src.type === 'slack'
                                                ? <Hash size={13} className="text-[#e01e5a]" />
                                                : <FileText size={13} className="text-cyan-400" />}
                                            <span className="font-mono text-xs text-zinc-300">{src.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="glass-badge badge-timeline">Complete</span>
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-300">{src.chunks}</td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">−{src.duplicates}</td>
                                    <td className="px-5 py-3.5 text-xs text-zinc-500">{src.synced}</td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openDrawer(src)}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                                title="View Chunks"
                                            >
                                                <Eye size={13} />
                                            </button>
                                            <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors" title="Re-sync">
                                                <RefreshCw size={13} />
                                            </button>
                                            <button className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Remove">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* S2-03: Raw Chunks Drawer */}
            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={selectedSource?.name}
                subtitle={`${MOCK_CHUNKS.length} chunks · read-only transparency view`}
                footer={
                    <button onClick={() => setDrawerOpen(false)} className="btn-secondary ml-auto text-sm">
                        Close
                    </button>
                }
            >
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search chunks..."
                    className="glass-input w-full px-3 py-2 text-sm"
                />

                {/* Chunk list */}
                <div className="space-y-3">
                    {MOCK_CHUNKS.map(chunk => (
                        <div key={chunk.id} className="glass-card p-3.5 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-[10px] text-zinc-600">{chunk.id}</span>
                                <span className="text-[10px] text-zinc-500">·</span>
                                <span className="text-[10px] text-zinc-400">{chunk.speaker}</span>
                                <span className="text-[10px] text-zinc-500">·</span>
                                <span className="text-[10px] text-zinc-600">{chunk.words}w</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                {expandedChunk === chunk.id
                                    ? chunk.text
                                    : chunk.text.slice(0, 120) + (chunk.text.length > 120 ? '…' : '')}
                            </p>
                            {chunk.text.length > 120 && (
                                <button
                                    onClick={() => setExpandedChunk(expandedChunk === chunk.id ? null : chunk.id)}
                                    className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1.5 transition-colors"
                                >
                                    {expandedChunk === chunk.id ? 'Collapse' : 'View Full Text'}
                                </button>
                            )}
                            <div className="mt-2 font-mono text-[10px] text-zinc-600">{chunk.source}</div>
                        </div>
                    ))}
                </div>
            </Drawer>
        </div>
    );
}
