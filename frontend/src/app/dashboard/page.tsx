"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ArrowRight, Zap, CheckCircle2, AlertTriangle, Download,
    TrendingUp, Database, FileText, Plus
} from 'lucide-react';
import PipelineStepper, { StageInfo } from '@/components/ui/PipelineStepper';

// ─── Mock data ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: StageInfo[] = [
    { name: 'Ingestion', status: 'complete', timestamp: '14:02', itemCount: 248 },
    { name: 'Noise Filtering', status: 'complete', timestamp: '14:04', itemCount: 183 },
    { name: 'AKS Storage', status: 'running' },
    { name: 'BRD Generation', status: 'pending' },
    { name: 'Validation', status: 'pending' },
    { name: 'Export', status: 'pending' },
];

const SIGNAL_DATA = [
    { label: 'Requirement', count: 82, color: '#3B82F6', className: 'badge-requirement' },
    { label: 'Decision', count: 41, color: '#8B5CF6', className: 'badge-decision' },
    { label: 'Feedback', count: 28, color: '#F59E0B', className: 'badge-feedback' },
    { label: 'Timeline', count: 19, color: '#10B981', className: 'badge-timeline' },
    { label: 'Noise', count: 13, color: '#6B7280', className: 'badge-noise' },
];

const STATS = [
    { label: 'Sources Connected', value: '3', icon: Database, color: 'text-cyan-400', glow: 'shadow-glow-cyan' },
    { label: 'Chunks Processed', value: '248', icon: TrendingUp, color: 'text-purple-400', glow: 'shadow-glow-purple' },
    { label: 'Signals Extracted', value: '183', icon: Zap, color: 'text-amber-400', glow: 'shadow-glow-amber' },
    { label: 'Validation Flags', value: '5', icon: AlertTriangle, color: 'text-red-400', glow: 'shadow-glow-red' },
];

// ─── Custom SVG Donut Chart ───────────────────────────────────────────────────

function DonutChart({
    data,
    onSegmentClick,
    activeSegment,
}: {
    data: typeof SIGNAL_DATA;
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
                    {/* Background ring */}
                    <circle
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={stroke}
                    />
                    {segments.map((seg) => (
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
                    {/* Centre text */}
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
                        <span className="text-[10px] text-zinc-600">{((d.count / total) * 100).toFixed(0)}%</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Contextual Action Centre ─────────────────────────────────────────────────

function ActionCentre() {
    // State: AKS running, BRD not started yet
    return (
        <div className="space-y-3 h-full">
            <div className="glass-card p-4 rounded-xl border-amber-500/20 hover:border-amber-500/30 transition-all">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <Zap size={16} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-300">AKS Storage Running</p>
                        <p className="text-xs text-zinc-500 mt-0.5">183 classified signals being indexed</p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium">Next Actions</p>
                <div className="space-y-2">
                    <Link href="/brd">
                        <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                            <FileText size={15} />
                            Generate BRD Draft
                            <ArrowRight size={14} className="ml-auto opacity-60" />
                        </button>
                    </Link>
                    <Link href="/signals">
                        <button className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2 mt-1">
                            <AlertTriangle size={14} className="text-amber-400" />
                            Review 5 Flagged Signals
                        </button>
                    </Link>
                </div>
            </div>

            <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Export Status</p>
                <div className="flex items-center gap-2">
                    <Download size={13} className="text-zinc-600" />
                    <span className="text-xs text-zinc-500">Awaiting BRD generation</span>
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
    const [activeSegment, setActiveSegment] = useState<string | null>(null);

    return (
        <div className="p-6 space-y-6 max-w-[1400px]">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Session Dashboard</h1>
                    <p className="text-sm text-zinc-500 mt-0.5">Hackfest Demo Session · 21 Feb 2026</p>
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
                        <p className="text-xs text-zinc-500 mt-0.5">6 stages · Stage 3 in progress</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[11px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-300 font-medium">Running</span>
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
                    <DonutChart
                        data={SIGNAL_DATA}
                        onSegmentClick={setActiveSegment}
                        activeSegment={activeSegment}
                    />
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
                    <ActionCentre />
                </motion.div>
            </div>
        </div>
    );
}
