"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Hash, Mail, Upload, CheckCircle2, AlertCircle, Database,
    Eye, RefreshCw, Trash2, FileText, File, Table2, X, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Drawer from '@/components/ui/Drawer';
import { uploadFile, ingestDemoDataset, getChunks, type Chunk } from '@/lib/apiClient';
import { useSessionStore } from '@/store/useSessionStore';

// ─── Static Connector Data ────────────────────────────────────────────────────

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

interface UploadedFile {
    name: string;
    size: string;
    ext: string;
    rawFile: File;
    status: 'queued' | 'uploading' | 'done' | 'error';
    chunkCount?: number;
    error?: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IngestionPage() {
    const { activeSessionId, addSession } = useSessionStore();
    const sessionId = activeSessionId ?? '';

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerSourceName, setDrawerSourceName] = useState('');
    const [chunks, setChunks] = useState<Chunk[]>([]);
    const [chunksLoading, setChunksLoading] = useState(false);

    const [dragOver, setDragOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [demoLoading, setDemoLoading] = useState(false);
    const [demoResult, setDemoResult] = useState<string | null>(null);
    const [demoLogs, setDemoLogs] = useState<string[]>([]);

    const [channels, setChannels] = useState(CHANNELS);
    const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

    const toggleChannel = (name: string) =>
        setChannels(prev => prev.map(c => c.name === name ? { ...c, selected: !c.selected } : c));

    const addFiles = (files: File[]) => {
        const newEntries: UploadedFile[] = files.map(f => {
            const ext = f.name.split('.').pop() ?? 'txt';
            const size = f.size > 1024 * 1024
                ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                : `${(f.size / 1024).toFixed(0)} KB`;
            return { name: f.name, size, ext, rawFile: f, status: 'queued' };
        });
        setUploadedFiles(prev => [...prev, ...newEntries]);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(Array.from(e.dataTransfer.files));
    }, []);

    const removeFile = (name: string) =>
        setUploadedFiles(prev => prev.filter(f => f.name !== name));

    const processFiles = async () => {
        if (!sessionId) {
            setUploadError('No active session. Create one from the Dashboard.');
            return;
        }
        const queued = uploadedFiles.filter(f => f.status === 'queued');
        if (queued.length === 0) return;

        setUploading(true);
        setUploadError(null);

        for (const uf of queued) {
            // mark uploading
            setUploadedFiles(prev => prev.map(f => f.name === uf.name ? { ...f, status: 'uploading' } : f));
            try {
                const ext = uf.ext.toLowerCase();
                const sourceType = ext === 'csv' ? 'csv' : 'file';
                const result = await uploadFile(sessionId, uf.rawFile, sourceType);
                setUploadedFiles(prev => prev.map(f =>
                    f.name === uf.name ? { ...f, status: 'done', chunkCount: result.chunk_count } : f
                ));
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Upload failed';
                setUploadedFiles(prev => prev.map(f =>
                    f.name === uf.name ? { ...f, status: 'error', error: msg } : f
                ));
                setUploadError(`Failed to upload ${uf.name}: ${msg}`);
            }
        }
        setUploading(false);
    };

    const processDemoDataset = async () => {
        setDemoLoading(true);
        setUploadError(null);
        setDemoResult(null);
        setDemoLogs([]);

        const logLines = [
            "Initializing Noise Filter pipeline...",
            "Connecting to Enron mail corpus cache (200 docs)...",
            "Applying heuristic RegEx rules for system mail & social noise...",
            "Filtered chunks as pure noise (fast path).",
            "Batching remaining chunks for LLM classification...",
            "Connecting to Groq API (Llama 4 Maverick)...",
            "Classifying batch 1/4...",
            "Classifying batch 2/4...",
            "Classifying batch 3/4...",
            "Classifying batch 4/4...",
            "Writing classified chunks to Attributed Knowledge Store (AKS)...",
            "Pipeline complete."
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < logLines.length) {
                // Not the real time, just a log format
                const time = new Date().toISOString().split('T')[1].slice(0, 12);
                setDemoLogs(prev => [...prev, `[${time}] ${logLines[i]}`]);
                i++;
            }
        }, 800);

        try {
            // Auto-create a session if one doesn't exist yet
            let sid = sessionId;
            if (!sid) {
                sid = await addSession('Demo Session', 'Auto-created for Enron demo dataset');
            }
            const res = await ingestDemoDataset(sid, 200);
            clearInterval(interval);

            const time = new Date().toISOString().split('T')[1].slice(0, 12);
            setDemoLogs(prev => [...prev, `[${time}] ✅ Success: ${res.chunk_count} chunks stored.`]);
            setDemoResult(`✅ Demo dataset loaded — ${res.chunk_count} email chunks classified and stored.`);
        } catch (e) {
            clearInterval(interval);
            const time = new Date().toISOString().split('T')[1].slice(0, 12);
            const msg = e instanceof Error ? e.message : 'Demo ingestion failed';
            setDemoLogs(prev => [...prev, `[${time}] ❌ ERROR: ${msg}`]);
            setUploadError(msg);
        } finally {
            setDemoLoading(false);
        }
    };

    const openDrawer = async (sourceName: string) => {
        setDrawerSourceName(sourceName);
        setDrawerOpen(true);
        if (!sessionId) return;
        setChunksLoading(true);
        try {
            const res = await getChunks(sessionId, 'all');
            setChunks(res.chunks);
        } catch {
            setChunks([]);
        } finally {
            setChunksLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px]">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Source Management</h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Connect and manage your data sources</p>
            </div>

            {/* Error banner */}
            {uploadError && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    {uploadError}
                    <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* S2-01: Connector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">

                {/* Slack Connector */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                    className="glass-card p-3 sm:p-5 rounded-xl space-y-3 sm:space-y-4"
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
                    className="glass-card p-3 sm:p-5 rounded-xl space-y-3 sm:space-y-4 opacity-50 cursor-not-allowed"
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
                    className="glass-card p-3 sm:p-5 rounded-xl space-y-3 sm:space-y-4 sm:col-span-2 lg:col-span-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                            <Upload size={18} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-100">File Upload</h3>
                            <p className="text-[11px] text-zinc-500 mt-0.5">CSV, TXT · max 25MB</p>
                        </div>
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-4 sm:p-6 flex flex-col items-center gap-2 transition-all cursor-pointer ${dragOver
                            ? 'border-cyan-400/60 bg-cyan-400/5'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/3'
                            }`}
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        <Upload size={18} className={dragOver ? 'text-cyan-400' : 'text-zinc-600'} />
                        <p className="text-xs text-zinc-400 text-center">
                            Drop files here or <span className="text-cyan-400">browse</span>
                        </p>
                        <input id="file-input" type="file" multiple accept=".csv,.txt" className="hidden"
                            onChange={e => addFiles(Array.from(e.target.files ?? []))}
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
                                    {f.status === 'uploading' && <Loader2 size={12} className="text-cyan-400 animate-spin flex-shrink-0" />}
                                    {f.status === 'done' && (
                                        <span className="text-[10px] text-emerald-400 flex-shrink-0 flex items-center gap-0.5">
                                            <CheckCircle2 size={10} /> {f.chunkCount ?? '?'} chunks
                                        </span>
                                    )}
                                    {f.status === 'error' && <AlertCircle size={12} className="text-red-400 flex-shrink-0" />}
                                    {f.status !== 'uploading' && (
                                        <button onClick={() => removeFile(f.name)} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {demoResult && (
                        <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                            {demoResult}
                        </div>
                    )}

                    <button
                        onClick={processFiles}
                        disabled={uploading || demoLoading || uploadedFiles.filter(f => f.status === 'queued').length === 0 || !sessionId}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading
                            ? <><Loader2 size={13} className="animate-spin" /> Processing…</>
                            : <><Upload size={13} /> Process Files</>}
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/8" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-zinc-900 px-2 text-[10px] text-zinc-600">or use demo data</span>
                        </div>
                    </div>

                    <button
                        onClick={processDemoDataset}
                        disabled={demoLoading || uploading}
                        className="btn-secondary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-dashed"
                    >
                        {demoLoading
                            ? <><Loader2 size={13} className="animate-spin" /> Retrieving Emails…</>
                            : <><Database size={13} className="text-cyan-400" /> Use Demo Dataset (Enron)</>}
                    </button>

                    {/* Terminal Logger for Demo Ingestion */}
                    {demoLogs.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-black/80 border border-white/10 rounded-lg p-3 mt-4 h-48 overflow-y-auto font-mono text-[10px] space-y-1.5 flex flex-col"
                        >
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 sticky top-0 bg-black/80 backdrop-blur z-10">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                                </div>
                                <span className="text-zinc-500 ml-2">noise_filter.log</span>
                            </div>

                            {demoLogs.map((log, idx) => {
                                const isError = log.includes('ERROR');
                                const isSuccess = log.includes('Success');
                                const isHeuristic = log.includes('Heuristic');
                                const isLLM = log.includes('LLM');

                                return (
                                    <div key={idx} className={cn(
                                        "leading-relaxed transition-opacity animate-in fade-in duration-300",
                                        isError ? "text-red-400" :
                                            isSuccess ? "text-emerald-400" :
                                                isHeuristic ? "text-amber-300" :
                                                    isLLM ? "text-purple-300" : "text-zinc-300"
                                    )}>
                                        {log}
                                    </div>
                                )
                            })}
                            {demoLoading && (
                                <div className="flex items-center gap-2 text-zinc-500 mt-2">
                                    <span className="animate-pulse">_</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* S2-02: Active Sources Table — shows real uploaded files */}
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
                                {['Source', 'Status', 'Chunks', 'Type', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {uploadedFiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-zinc-600">
                                        No files uploaded yet. Use the File Upload panel above.
                                    </td>
                                </tr>
                            ) : uploadedFiles.map((src, i) => (
                                <motion.tr
                                    key={src.name}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                    className="hover:bg-white/4 transition-colors"
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            {FILE_ICONS[src.ext] ?? <File size={13} className="text-zinc-400" />}
                                            <span className="font-mono text-xs text-zinc-300">{src.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {src.status === 'done' && <span className="glass-badge badge-timeline">Done</span>}
                                        {src.status === 'uploading' && <span className="glass-badge badge-severity-medium">Processing</span>}
                                        {src.status === 'queued' && <span className="glass-badge bg-zinc-700/40 border border-white/10 text-zinc-400">Queued</span>}
                                        {src.status === 'error' && <span className="glass-badge badge-severity-high">Error</span>}
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-300">{src.chunkCount ?? '—'}</td>
                                    <td className="px-5 py-3.5 text-xs text-zinc-500 uppercase font-mono">{src.ext}</td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openDrawer(src.name)}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                                title="View Chunks"
                                            >
                                                <Eye size={13} />
                                            </button>
                                            <button
                                                onClick={() => removeFile(src.name)}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Remove"
                                            >
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
                title={drawerSourceName}
                subtitle={`${chunks.length} chunks · read-only transparency view`}
                footer={
                    <button onClick={() => setDrawerOpen(false)} className="btn-secondary ml-auto text-sm">
                        Close
                    </button>
                }
            >
                {chunksLoading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-zinc-500 text-sm">
                        <Loader2 size={16} className="animate-spin" /> Loading chunks…
                    </div>
                ) : chunks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-600">
                        No chunks found. Process files first.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {chunks.map(chunk => (
                            <div key={chunk.chunk_id} className="glass-card p-3.5 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono text-[10px] text-zinc-600">{chunk.chunk_id.slice(0, 8)}</span>
                                    <span className="text-[10px] text-zinc-500">·</span>
                                    <span className="text-[10px] text-zinc-400">{chunk.speaker ?? 'Unknown'}</span>
                                    <span className="text-[10px] text-zinc-500">·</span>
                                    <span className="glass-badge text-[9px]">{chunk.signal_label}</span>
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                    {expandedChunk === chunk.chunk_id
                                        ? chunk.cleaned_text
                                        : chunk.cleaned_text.slice(0, 120) + (chunk.cleaned_text.length > 120 ? '…' : '')}
                                </p>
                                {chunk.cleaned_text.length > 120 && (
                                    <button
                                        onClick={() => setExpandedChunk(expandedChunk === chunk.chunk_id ? null : chunk.chunk_id)}
                                        className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1.5 transition-colors"
                                    >
                                        {expandedChunk === chunk.chunk_id ? 'Collapse' : 'View Full Text'}
                                    </button>
                                )}
                                <div className="mt-2 font-mono text-[10px] text-zinc-600">{chunk.source_ref}</div>
                            </div>
                        ))}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
