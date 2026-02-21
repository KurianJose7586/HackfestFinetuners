"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ArrowRight, Zap, CheckCircle2, AlertTriangle, Download,
    TrendingUp, Database, FileText, Plus, Loader2
} from 'lucide-react';
import PipelineStepper, { StageInfo } from '@/components/ui/PipelineStepper';
import { getChunks } from '@/lib/apiClient';
import { useSessionStore } from '@/store/useSessionStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignalCounts {
    total: number;
    requirement: number;
    decision: number;
    feedback: number;
    timeline: number;
    noise: number;
    flags: number;
}

// ─── Custom SVG Donut Chart ───────────────────────────────────────────────────

const COLORS: Record<string, string> = {
    Requirement: '#3B82F6',
    Decision: '#8B5CF6',
    Feedback: '#F59E0B',
    Timeline: '#10B981',
    Noise: '#6B7280',
};

function DonutChart({
    data,
    onSegmentClick,
    activeSegment,
}: {
    data: Array<{ label: string; count: number; color: string; className: string }>;
    onSegmentClick: (label: string | null) => void;
    activeSegment: string | null;
}) {
    const total = data.reduce((s, d) => s + d.count, 0);
    const cx = 80, cy = 80, r = 60, stroke = 22;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    const segments = data.map(d => {
        const pct = d.count / total;
        const len = pct * circumference;
        const seg = { ...d, pct, len, offset };
        offset += len;
        return seg;
    });

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={stroke}
                    />
                    {total > 0 && segments.map((seg) => (
                        <circle
                            key={seg.label}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={activeSegment === seg.label ? stroke + 4 : stroke}
                            strokeDasharray={`${seg.len} ${circumference - seg.len}`}
                            strokeDashoffset={-seg.offset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`}
                            style={{
                                opacity: activeSegment && activeSegment !== seg.label ? 0.3 : 1,
                                filter: activeSegment === seg.label ? `drop-shadow(0 0 8px ${seg.color})` : undefined,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={() => onSegmentClick(activeSegment === seg.label ? null : seg.label)}
                        />
                    ))}
                    <text x={cx} y={cy - 6} textAnchor="middle" className="fill-zinc-100" style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Inter' }}>
                        {total}
                    </text>
                    <text x={cx} y={cy + 12} textAnchor="middle" className="fill-zinc-500" style={{ fontSize: 9, fontFamily: 'Inter' }}>
                        SIGNALS
                    </text>
                </svg>
            </div>

            {/* Legend */}
            <div className="w-full space-y-1.5">
                {data.map(d => (
                    <button
                        key={d.label}
                        onClick={() => onSegmentClick(activeSegment === d.label ? null : d.label)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all ${activeSegment === d.label ? 'bg-white/8' : 'hover:bg-white/5'
                            }`}
                    >
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-zinc-300 flex-1">{d.label}</span>
                        <span className="text-xs font-mono text-zinc-500">{d.count}</span>
                        <span className="text-[10px] text-zinc-600">
                            {d.count > 0 && data.reduce((a, b) => a + b.count, 0) > 0
                                ? ((d.count / data.reduce((a, b) => a + b.count, 0)) * 100).toFixed(0)
                                : 0}%
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Contextual Action Centre ─────────────────────────────────────────────────

function ActionCentre({ hasBRDData }: { hasBRDData: boolean }) {
    return (
        <div className="space-y-3 h-full">
            <div className="glass-card p-4 rounded-xl border-amber-500/20 hover:border-amber-500/30 transition-all">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <Zap size={16} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-300">Pipeline Ready</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Signals classified and stored in AKS</p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium">Next Actions</p>
                <div className="space-y-2">
                    <Link href="/brd">
                        <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                            <FileText size={15} />
                            {hasBRDData ? 'View BRD Draft' : 'Generate BRD Draft'}
                            <ArrowRight size={14} className="ml-auto opacity-60" />
                        </button>
                    </Link>
                    <Link href="/signals">
                        <button className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2 mt-1">
                            <AlertTriangle size={14} className="text-amber-400" />
                            Review Signals
                        </button>
                    </Link>
                </div>
            </div>

            <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Export Status</p>
                <div className="flex items-center gap-2">
                    {hasBRDData ? (
                        <Link href="/export" className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                            <Download size={13} /> Download BRD
                        </Link>
                    ) : (
                        <>
                            <Download size={13} className="text-zinc-600" />
                            <span className="text-xs text-zinc-500">Awaiting BRD generation</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
    const { activeSessionId } = useSessionStore();
    const sessionId = activeSessionId ?? '';

    const [activeSegment, setActiveSegment] = useState<string | null>(null);
    const [counts, setCounts] = useState<SignalCounts>({ total: 0, requirement: 0, decision: 0, feedback: 0, timeline: 0, noise: 0, flags: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        getChunks(sessionId, 'all')
            .then(res => {
                const c: SignalCounts = { total: 0, requirement: 0, decision: 0, feedback: 0, timeline: 0, noise: 0, flags: 0 };
                res.chunks.forEach(ch => {
                    if (ch.suppressed) { c.noise++; return; }
                    c.total++;
                    const label = (ch.signal_label ?? '').toLowerCase();
                    if (label === 'requirement') c.requirement++;
                    else if (label === 'decision') c.decision++;
                    else if (label === 'stakeholder_feedback' || label === 'feedback') c.feedback++;
                    else if (label === 'timeline_reference' || label === 'timeline') c.timeline++;
                    if (ch.confidence < 0.7) c.flags++;
                });
                setCounts(c);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [sessionId]);

    const SIGNAL_DATA = [
        { label: 'Requirement', count: counts.requirement, color: COLORS.Requirement, className: 'badge-requirement' },
        { label: 'Decision', count: counts.decision, color: COLORS.Decision, className: 'badge-decision' },
        { label: 'Feedback', count: counts.feedback, color: COLORS.Feedback, className: 'badge-feedback' },
        { label: 'Timeline', count: counts.timeline, color: COLORS.Timeline, className: 'badge-timeline' },
        { label: 'Noise', count: counts.noise, color: COLORS.Noise, className: 'badge-noise' },
    ];

    const STATS = [
        { label: 'Sources Connected', value: sessionId ? '—' : '0', icon: Database, color: 'text-cyan-400', glow: 'shadow-glow-cyan' },
        { label: 'Chunks Processed', value: loading ? '…' : String(counts.total + counts.noise), icon: TrendingUp, color: 'text-purple-400', glow: 'shadow-glow-purple' },
        { label: 'Signals Extracted', value: loading ? '…' : String(counts.total), icon: Zap, color: 'text-amber-400', glow: 'shadow-glow-amber' },
        { label: 'Low-Confidence', value: loading ? '…' : String(counts.flags), icon: AlertTriangle, color: 'text-red-400', glow: 'shadow-glow-red' },
    ];

    const PIPELINE_STAGES: StageInfo[] = [
        { name: 'Ingestion', status: counts.total + counts.noise > 0 ? 'complete' : 'pending', itemCount: counts.total + counts.noise },
        { name: 'Noise Filtering', status: counts.total + counts.noise > 0 ? 'complete' : 'pending', itemCount: counts.total },
        { name: 'AKS Storage', status: counts.total > 0 ? 'complete' : 'pending' },
        { name: 'BRD Generation', status: 'pending' },
        { name: 'Validation', status: 'pending' },
        { name: 'Export', status: 'pending' },
    ];

    return (
        <div className="p-6 space-y-6 max-w-[1400px]">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Session Dashboard</h1>
                    <p className="text-sm text-zinc-500 mt-0.5">
                        {sessionId
                            ? <span className="font-mono">{sessionId.slice(0, 8)}… · {new Date().toLocaleDateString('en-IN')}</span>
                            : 'No active session — create one to get started'}
                    </p>
                </div>
                <Link href="/ingestion">
                    <button className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={15} />
                        Add Sources
                    </button>
                </Link>
            </div>

            {/* Row 1: Pipeline Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="glass-card p-5 rounded-xl"
            >
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-200">Pipeline Status</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">6 stages · derived from live session data</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[11px]">
                        {loading
                            ? <><Loader2 size={10} className="animate-spin text-zinc-400" /><span className="text-zinc-400">Loading</span></>
                            : counts.total > 0
                                ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-emerald-300 font-medium">Ready</span></>
                                : <><div className="w-1.5 h-1.5 rounded-full bg-zinc-500" /><span className="text-zinc-400 font-medium">Idle</span></>
                        }
                    </div>
                </div>
                <PipelineStepper stages={PIPELINE_STAGES} variant="expanded" />
            </motion.div>

            {/* Row 2: Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.06 }}
                            className="glass-card p-4 rounded-xl flex items-center gap-3"
                        >
                            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 ${stat.glow}`}>
                                <Icon size={18} className={stat.color} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
                                <p className="text-[11px] text-zinc-500 leading-tight">{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Row 3: Donut + Action Centre */}
            <div className="grid lg:grid-cols-3 gap-5">
                {/* Donut Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="glass-card p-5 rounded-xl"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-zinc-200">Signal Breakdown</h2>
                        {activeSegment && (
                            <button
                                onClick={() => setActiveSegment(null)}
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-zinc-500 text-xs">
                            <Loader2 size={14} className="animate-spin" /> Loading signals…
                        </div>
                    ) : (
                        <DonutChart
                            data={SIGNAL_DATA}
                            onSegmentClick={setActiveSegment}
                            activeSegment={activeSegment}
                        />
                    )}
                    {activeSegment && (
                        <div className="mt-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                            Signals filtered to <strong>{activeSegment}</strong> — go to{' '}
                            <Link href="/signals" className="underline hover:text-cyan-200">Signal Review</Link>
                        </div>
                    )}
                </motion.div>

                {/* Action Centre — spans 2 cols */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.32 }}
                    className="glass-card p-5 rounded-xl lg:col-span-2"
                >
                    <h2 className="text-sm font-semibold text-zinc-200 mb-4">Action Centre</h2>
                    <ActionCentre hasBRDData={counts.total > 0} />
                </motion.div>
            </div>
        </div>
    );
}
