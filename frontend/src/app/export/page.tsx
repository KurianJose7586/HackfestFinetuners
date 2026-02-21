"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2, AlertCircle, ArrowRight, Download, FileText,
    File, Table2, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { exportBRD } from '@/lib/apiClient';
import { useSessionStore } from '@/store/useSessionStore';

// ─── Mock checklist ───────────────────────────────────────────────────────────

interface CheckItem {
    id: string;
    label: string;
    description: string;
    status: 'ok' | 'warn' | 'error';
    fixHref?: string;
}

const CHECKLIST: CheckItem[] = [
    { id: 'c1', label: 'All sections generated or marked', description: '5 of 7 sections have content; 2 need sources.', status: 'warn', fixHref: '/ingestion' },
    { id: 'c2', label: 'High-severity flags acknowledged', description: '1 high-severity flag still unacknowledged.', status: 'warn', fixHref: '/brd' },
    { id: 'c3', label: 'At least one source connected', description: '3 sources connected and processed.', status: 'ok' },
    { id: 'c4', label: 'BRD has been human reviewed', description: 'Section 2 was opened and edited by Priya Sharma.', status: 'ok' },
    { id: 'c5', label: 'Session has a name', description: 'Session: "Hackfest Demo Session"', status: 'ok' },
];

type ExportFormat = 'markdown' | 'docx';

const FORMAT_CARDS = [
    {
        id: 'markdown' as ExportFormat,
        label: 'Markdown',
        icon: <FileText size={22} className="text-zinc-300" />,
        desc: 'Raw content, no styling. All sections, metadata footer.',
        sub: 'Plain .md file',
    },
    {
        id: 'docx' as ExportFormat,
        label: 'DOCX',
        icon: <Table2 size={22} className="text-blue-300" />,
        desc: 'Template-based layout with table of contents and figure captions.',
        sub: 'Template-based layout',
    },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExportPage() {
    const { activeSessionId } = useSessionStore();
    const sessionId = activeSessionId ?? '';

    const [proceedAnyway, setProceedAnyway] = useState(false);
    const [downloading, setDownloading] = useState<ExportFormat | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    const allOk = CHECKLIST.every(c => c.status === 'ok') || proceedAnyway;
    const warnCount = CHECKLIST.filter(c => c.status === 'warn').length;

    const handleExport = async (format: ExportFormat) => {
        if (!sessionId) {
            setExportError('No active session. Go to Dashboard to create one.');
            return;
        }
        setDownloading(format);
        setExportError(null);
        try {
            await exportBRD(sessionId, format);
        } catch (e) {
            setExportError(e instanceof Error ? e.message : 'Export failed');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Export BRD</h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                    Review and download your Business Requirements Document
                    {sessionId && <span className="font-mono text-zinc-600"> · {sessionId.slice(0, 8)}</span>}
                </p>
            </div>

            {/* Error banner */}
            {exportError && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                    ⚠ {exportError}
                </div>
            )}

            {/* S5-01 Pre-Export Checklist */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className="glass-card rounded-xl overflow-hidden"
            >
                <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-zinc-200 flex-1">Pre-Export Checklist</h2>
                    {allOk
                        ? <span className="glass-badge badge-timeline">All Clear</span>
                        : <span className="glass-badge badge-severity-medium">{warnCount} Issues</span>}
                </div>
                <div className="p-5 space-y-3">
                    {CHECKLIST.map((item, i) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-xl transition-all",
                                item.status === 'ok' ? 'bg-emerald-500/5 border border-emerald-500/15' :
                                    item.status === 'warn' ? 'bg-amber-500/5 border border-amber-500/15' :
                                        'bg-red-500/5 border border-red-500/15'
                            )}
                        >
                            {item.status === 'ok'
                                ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                : <AlertCircle size={16} className="text-amber-400  flex-shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-200">{item.label}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                            </div>
                            {item.fixHref && item.status !== 'ok' && (
                                <Link href={item.fixHref}>
                                    <button className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 flex-shrink-0 transition-colors">
                                        Fix Now <ArrowRight size={11} />
                                    </button>
                                </Link>
                            )}
                        </motion.div>
                    ))}
                    {!allOk && (
                        <button
                            onClick={() => setProceedAnyway(true)}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
                        >
                            Proceed anyway (override logged with timestamp)
                        </button>
                    )}
                </div>
            </motion.div>

            {/* S5-02 Document Preview */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
                className="glass-card rounded-xl p-5"
            >
                <h2 className="text-sm font-semibold text-zinc-200 mb-4">Document Preview</h2>
                <div className="flex gap-5 items-start">
                    <div className="w-48 flex-shrink-0 rounded-lg border border-white/10 bg-white/4 p-4 space-y-2.5">
                        <div className="h-2 rounded bg-gradient-to-r from-cyan-500/40 to-purple-500/40 w-3/4" />
                        <div className="h-1 rounded bg-white/10 w-1/2" />
                        <div className="mt-3 space-y-1">
                            <div className="h-1 rounded bg-white/8 w-full" />
                            <div className="h-1 rounded bg-white/6 w-5/6" />
                            <div className="h-1 rounded bg-white/8 w-4/5" />
                            <div className="h-1 rounded bg-white/6 w-full" />
                            <div className="h-1 rounded bg-white/8 w-3/4" />
                        </div>
                        <div className="pt-2 border-t border-white/6 mt-2">
                            <div className="h-1 rounded bg-cyan-500/20 w-1/3" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2 text-xs text-zinc-400">
                        <p><strong className="text-zinc-300">Cover page:</strong> Session name, generation date, source count</p>
                        <p><strong className="text-zinc-300">7 sections:</strong> Executive Summary through Acceptance Criteria</p>
                        <p><strong className="text-zinc-300">Validation appendix:</strong> All flags and acknowledgement status</p>
                        <p><strong className="text-zinc-300">Metadata footer:</strong> Session ID, generation timestamp, AI disclaimer</p>
                        <p><strong className="text-zinc-300">Attribution table:</strong> Source-to-requirement traceability</p>
                    </div>
                </div>
            </motion.div>

            {/* S5-03 Format Options */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}
            >
                <h2 className="text-sm font-semibold text-zinc-200 mb-3">Export Format</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {FORMAT_CARDS.map((fmt, i) => {
                        const isDownloading = downloading === fmt.id;
                        const disabled = !allOk || !sessionId || isDownloading;
                        return (
                            <motion.div
                                key={fmt.id}
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 + i * 0.07 }}
                                className="glass-card rounded-xl p-5 flex flex-col gap-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                        {fmt.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-100">{fmt.label}</p>
                                        <p className="text-[10px] text-zinc-600">{fmt.sub}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed flex-1">{fmt.desc}</p>
                                <button
                                    disabled={disabled}
                                    onClick={() => handleExport(fmt.id)}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg font-medium transition-all",
                                        disabled
                                            ? "bg-white/5 text-zinc-600 border border-white/8 cursor-not-allowed"
                                            : "btn-primary"
                                    )}
                                >
                                    {isDownloading
                                        ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
                                        : <><Download size={14} /> Download {fmt.label}</>}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* S5-04 Export Metadata */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }}
                className="glass-card rounded-xl p-5"
            >
                <h2 className="text-sm font-semibold text-zinc-200 mb-4">Export Metadata</h2>
                <div className="grid md:grid-cols-2 gap-4 text-xs">
                    {[
                        ['Session ID', sessionId || '—'],
                        ['Export Timestamp', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
                        ['Sections Included', '7 sections'],
                        ['Validation Flags', `${warnCount} issues`],
                    ].map(([k, v]) => (
                        <div key={k} className="flex items-start gap-3">
                            <span className="text-zinc-600 flex-shrink-0 w-36">{k}</span>
                            <span className="text-zinc-300 font-mono break-all">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/8">
                    <p className="text-[11px] text-zinc-600 italic leading-relaxed">
                        ⚠ This document was generated by an AI agent (Beacon). All requirements should be reviewed and validated by qualified stakeholders before implementation. Source attributions are provided for traceability.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
