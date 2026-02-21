"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, X, Lock, User, Link as LinkIcon,
    CheckCircle, RotateCcw, Eye, AlertTriangle, BarChart2,
    Filter, SortDesc
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalLabel = 'Requirement' | 'Decision' | 'Feedback' | 'Timeline' | 'Noise';
type ClassPath = 'Heuristic' | 'Domain Gate' | 'LLM';
type CardStatus = 'active' | 'flagged' | 'suppressed';

interface SignalItem {
    id: string;
    label: SignalLabel;
    path: ClassPath;
    confidence: number;
    speaker: string;
    source: string;
    timestamp: string;
    text: string;
    reasoning?: string;
    status: CardStatus;
    suppressReason?: string;
    humanEdited?: boolean;
    downgradeReasons?: string[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const SIGNALS: SignalItem[] = [
    {
        id: 'sig_001', label: 'Requirement', path: 'LLM', confidence: 0.91,
        speaker: 'Priya Sharma', source: '#product-requirements', timestamp: '14:02:11',
        text: 'The system must support real-time notifications for all user-facing events, with a maximum latency of 200ms from event trigger to display.',
        reasoning: 'Strong imperative language ("must"), quantified SLA (200ms), user-facing scope — all hallmarks of a functional requirement.',
        status: 'active',
    },
    {
        id: 'sig_002', label: 'Decision', path: 'LLM', confidence: 0.83,
        speaker: 'Raj Patel', source: '#product-requirements', timestamp: '14:03:44',
        text: 'We need to decide on the database architecture before sprint 3 — PostgreSQL with read replicas or a distributed NoSQL approach.',
        reasoning: 'Architecture decision point with two named alternatives and a deadline reference.',
        status: 'active',
    },
    {
        id: 'sig_003', label: 'Feedback', path: 'Heuristic', confidence: 0.68,
        speaker: 'Ananya Singh', source: '#engineering-standup', timestamp: '14:04:20',
        text: 'Blocked on the authentication flow — the OAuth2 token refresh logic needs to handle edge cases around token expiry during active sessions.',
        reasoning: 'Heuristic pattern matched "blocked" keyword. Classified as feedback/blocker.',
        status: 'flagged',
        downgradeReasons: ['weak statement', 'embedding outlier'],
    },
    {
        id: 'sig_004', label: 'Timeline', path: 'LLM', confidence: 0.87,
        speaker: 'Priya Sharma', source: '#product-requirements', timestamp: '14:05:01',
        text: 'The mobile app must launch by end of Q2. We cannot miss that deadline given the investor commitments already made in the last board meeting.',
        reasoning: 'Explicit deadline (Q2) with organisational pressure context — strong timeline signal.',
        status: 'active',
    },
    {
        id: 'sig_005', label: 'Noise', path: 'Domain Gate', confidence: 0.22,
        speaker: 'Bot', source: '#general', timestamp: '14:01:00',
        text: 'Daily standup reminder: please update your Jira tickets by 9 AM.',
        status: 'suppressed', suppressReason: 'Structural Discard',
    },
    {
        id: 'sig_006', label: 'Requirement', path: 'LLM', confidence: 0.79,
        speaker: 'Raj Patel', source: '#product-requirements', timestamp: '14:06:33',
        text: 'The API must enforce rate limiting at 1000 requests per minute per tenant, with 429 responses and Retry-After headers on breach.',
        reasoning: 'Technical requirement with specific numeric thresholds and protocol-level detail.',
        status: 'active',
        humanEdited: true,
    },
];

// ─── Badge helpers ────────────────────────────────────────────────────────────

const LABEL_CLASS: Record<SignalLabel, string> = {
    Requirement: 'badge-requirement',
    Decision: 'badge-decision',
    Feedback: 'badge-feedback',
    Timeline: 'badge-timeline',
    Noise: 'badge-noise',
};
const PATH_CLASS: Record<ClassPath, string> = {
    Heuristic: 'badge-heuristic',
    'Domain Gate': 'badge-domain-gate',
    LLM: 'badge-llm',
};

function ConfidenceBar({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
    const pct = Math.round(value * 100);
    const cls = value >= 0.75 ? 'bg-emerald-400' : value >= 0.65 ? 'bg-amber-400' : 'bg-red-400';
    return (
        <div className={cn("flex items-center gap-1.5", size === 'lg' && 'flex-col items-start gap-1')}>
            {size === 'lg' && <span className="text-2xl font-bold text-zinc-100">{pct}<span className="text-base text-zinc-500">%</span></span>}
            <div className={cn("rounded-full bg-white/8 overflow-hidden", size === 'lg' ? 'h-1.5 w-full' : 'h-1 w-12')}>
                <div className={cn("h-full rounded-full", cls)} style={{ width: `${pct}%` }} />
            </div>
            {size === 'sm' && <span className="text-[10px] font-mono text-zinc-500">{pct}%</span>}
        </div>
    );
}

// ─── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({ signal, selected, onClick }: {
    signal: SignalItem;
    selected: boolean;
    onClick: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const truncated = signal.text.length > 160;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "glass-card rounded-xl p-4 cursor-pointer transition-all duration-200",
                signal.status === 'suppressed' ? 'border-l-4 border-l-zinc-600/50' : 'border-l-4',
                signal.label === 'Requirement' && signal.status !== 'suppressed' && 'border-l-blue-500/60',
                signal.label === 'Decision' && signal.status !== 'suppressed' && 'border-l-purple-500/60',
                signal.label === 'Feedback' && signal.status !== 'suppressed' && 'border-l-amber-500/60',
                signal.label === 'Timeline' && signal.status !== 'suppressed' && 'border-l-emerald-500/60',
                selected && 'border-cyan-400/50 bg-cyan-500/5',
            )}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={cn("glass-badge", LABEL_CLASS[signal.label])}>{signal.label}</span>
                <span className={cn("glass-badge", PATH_CLASS[signal.path])}>{signal.path}</span>
                {signal.humanEdited && (
                    <span className="glass-badge bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 flex items-center gap-1">
                        <Lock size={8} /> Human Edited
                    </span>
                )}
                {signal.status === 'flagged' && (
                    <span className="glass-badge badge-severity-medium">Flagged</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <ConfidenceBar value={signal.confidence} />
                    <span className="text-[10px] text-zinc-600">{signal.speaker}</span>
                </div>
            </div>

            {/* Body */}
            <p className="text-xs text-zinc-300 leading-relaxed">
                {expanded || !truncated ? signal.text : signal.text.slice(0, 160) + '…'}
            </p>
            {truncated && (
                <button
                    onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1 transition-colors"
                >
                    {expanded ? 'Collapse' : 'Read More'}
                </button>
            )}

            {/* Suppression reason */}
            {signal.status === 'suppressed' && signal.suppressReason && (
                <div className="mt-2">
                    <span className="glass-badge badge-noise">{signal.suppressReason}</span>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5" onClick={e => e.stopPropagation()}>
                <span className="font-mono text-[10px] text-zinc-600 flex-1">{signal.source} · {signal.timestamp}</span>
                {signal.status === 'active' && !signal.humanEdited && (
                    <button className="btn-ghost py-1 px-2 text-[11px]">Override Label</button>
                )}
                {signal.status === 'flagged' && (
                    <>
                        <button className="py-1 px-2 rounded-lg text-[11px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                            Accept
                        </button>
                        <button className="btn-ghost py-1 px-2 text-[11px]">Reclassify</button>
                    </>
                )}
                {signal.status === 'suppressed' && (
                    <button className="py-1 px-2 rounded-lg text-[11px] font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1">
                        <RotateCcw size={10} /> Restore
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ signal, onClose }: { signal: SignalItem; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="glass-card rounded-xl flex flex-col h-full overflow-hidden"
        >
            <div className="p-4 border-b border-white/8 flex items-start gap-2">
                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("glass-badge", LABEL_CLASS[signal.label])}>{signal.label}</span>
                        <span className={cn("glass-badge", PATH_CLASS[signal.path])}>{signal.path}</span>
                        {signal.humanEdited && (
                            <span className="glass-badge bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 flex items-center gap-1 text-[9px]">
                                <Lock size={7} /> Human Edited
                            </span>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 flex-shrink-0 p-1 rounded transition-colors">
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Full text */}
                <div>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5 font-medium">Full Text</p>
                    <p className="text-xs text-zinc-200 font-mono leading-relaxed bg-white/4 rounded-lg p-3 border border-white/6">
                        {signal.text}
                    </p>
                </div>

                {/* Confidence */}
                <div>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Confidence Score</p>
                    <ConfidenceBar value={signal.confidence} size="lg" />
                    {signal.downgradeReasons && signal.downgradeReasons.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] text-zinc-600">Downgraded:</span>
                            {signal.downgradeReasons.map(r => (
                                <span key={r} className="glass-badge badge-severity-medium text-[9px]">{r}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reasoning */}
                {signal.reasoning && (
                    <div>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5 font-medium">LLM Reasoning</p>
                        <p className="text-xs text-zinc-400 italic leading-relaxed bg-purple-500/5 border border-purple-500/15 rounded-lg p-3">
                            {signal.reasoning}
                        </p>
                    </div>
                )}

                {/* Attribution */}
                <div>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Source Attribution</p>
                    <div className="glass-card p-3 rounded-lg space-y-1.5">
                        <div className="flex items-center gap-2">
                            <User size={11} className="text-zinc-500" />
                            <span className="text-xs text-zinc-300">{signal.speaker}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <LinkIcon size={11} className="text-zinc-500" />
                            <span className="text-xs font-mono text-zinc-400">{signal.source}</span>
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono">{signal.timestamp}</div>
                    </div>
                </div>
            </div>

            {/* Actions footer */}
            <div className="p-4 border-t border-white/8 flex items-center gap-2">
                {signal.humanEdited ? (
                    <button className="btn-ghost text-xs flex items-center gap-1.5">
                        <Eye size={12} /> View History
                    </button>
                ) : (
                    <>
                        {signal.status === 'flagged' && (
                            <button className="btn-primary text-xs flex items-center gap-1.5 py-1.5">
                                <CheckCircle size={12} /> Accept
                            </button>
                        )}
                        <button className="btn-secondary text-xs py-1.5">Override Label</button>
                        <button className="btn-ghost text-xs flex items-center gap-1.5">
                            <Eye size={12} /> Attribution
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SignalsPage() {
    const [activeTab, setActiveTab] = useState<'active' | 'suppressed'>('active');
    const [selectedSignal, setSelectedSignal] = useState<SignalItem | null>(null);
    const [sortBy, setSortBy] = useState('confidence');

    // Filters
    const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set(['Requirement', 'Decision', 'Feedback', 'Timeline', 'Noise']));
    const [pathFilter, setPathFilter] = useState<Set<string>>(new Set(['Heuristic', 'Domain Gate', 'LLM']));

    const LABELS: SignalLabel[] = ['Requirement', 'Decision', 'Feedback', 'Timeline', 'Noise'];
    const PATHS: ClassPath[] = ['Heuristic', 'Domain Gate', 'LLM'];

    const filtered = SIGNALS.filter(s => {
        if (activeTab === 'active' && s.status === 'suppressed') return false;
        if (activeTab === 'suppressed' && s.status !== 'suppressed') return false;
        if (!labelFilter.has(s.label)) return false;
        if (!pathFilter.has(s.path)) return false;
        return true;
    });

    const total = SIGNALS.filter(s => s.status !== 'suppressed').length;
    const autoAccepted = SIGNALS.filter(s => s.status === 'active').length;
    const flagged = SIGNALS.filter(s => s.status === 'flagged').length;
    const suppressed = SIGNALS.filter(s => s.status === 'suppressed').length;
    const meanConf = SIGNALS.filter(s => s.status !== 'suppressed').reduce((a, b) => a + b.confidence, 0) / total;
    const autoAccPct = Math.round((autoAccepted / total) * 100);

    const toggleLabel = (l: string) => setLabelFilter(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n; });
    const togglePath = (p: string) => setPathFilter(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

    const LABEL_COUNT = (l: SignalLabel) => SIGNALS.filter(s => s.label === l).length;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* S3-07 Calibration Stats Bar */}
            <div className="px-5 py-2.5 border-b border-white/8 flex items-center gap-4 flex-wrap text-[11px] glass-topbar">
                <span className="text-zinc-500">{total} classified</span>
                <span className="text-zinc-600">·</span>
                <span className={autoAccPct > 90 ? 'text-amber-300 flex items-center gap-1' : 'text-emerald-400'}>
                    {autoAccPct > 90 && <AlertTriangle size={10} />}
                    {autoAccPct}% auto-accepted
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-amber-300">{flagged} flagged</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">{suppressed} suppressed</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">mean conf <span className="font-mono text-zinc-300">{Math.round(meanConf * 100)}%</span></span>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* S3-02 Filter Sidebar */}
                <aside className="w-52 flex-shrink-0 border-r border-white/8 overflow-y-auto p-4 space-y-5">
                    {/* Label filter */}
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Label</p>
                        <div className="space-y-1">
                            {LABELS.map(l => (
                                <label key={l} className="flex items-center gap-2 py-1 cursor-pointer group">
                                    <input
                                        type="checkbox" checked={labelFilter.has(l)} onChange={() => toggleLabel(l)}
                                        className="accent-cyan-400 w-3 h-3"
                                    />
                                    <span className={cn("text-xs flex-1 transition-colors", labelFilter.has(l) ? 'text-zinc-300' : 'text-zinc-600')}>
                                        {l}
                                    </span>
                                    <span className="text-[10px] text-zinc-600">({LABEL_COUNT(l)})</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Classification path */}
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Path</p>
                        <div className="space-y-1">
                            {PATHS.map(p => (
                                <label key={p} className="flex items-center gap-2 py-1 cursor-pointer">
                                    <input
                                        type="checkbox" checked={pathFilter.has(p)} onChange={() => togglePath(p)}
                                        className="accent-cyan-400 w-3 h-3"
                                    />
                                    <span className={cn("text-xs transition-colors", pathFilter.has(p) ? 'text-zinc-300' : 'text-zinc-600')}>{p}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Confidence  */}
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Review Status</p>
                        <div className="space-y-1 text-xs">
                            {['All', 'Auto-Accepted Only', 'Flagged Only'].map(opt => (
                                <label key={opt} className="flex items-center gap-2 py-1 cursor-pointer">
                                    <input type="radio" name="review" className="accent-cyan-400 w-3 h-3" defaultChecked={opt === 'All'} />
                                    <span className="text-zinc-400">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                        Clear All Filters
                    </button>
                </aside>

                {/* S3-01 Centre + Right */}
                <div className={cn("flex flex-1 overflow-hidden gap-0")}>
                    {/* Signal feed */}
                    <div className={cn("flex flex-col overflow-hidden transition-all duration-300", selectedSignal ? 'flex-1' : 'flex-1')}>
                        {/* S3-03 Feed Header */}
                        <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-3">
                            {/* Tabs */}
                            <div className="flex bg-white/5 rounded-lg p-0.5 text-xs font-medium">
                                {(['active', 'suppressed'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn('px-3 py-1.5 rounded-md capitalize transition-all', tab === activeTab ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
                                    >
                                        {tab === 'active' ? `Active (${total})` : `Suppressed (${suppressed})`}
                                    </button>
                                ))}
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs text-zinc-600">{filtered.length} shown</span>
                                <button className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors">
                                    <SortDesc size={13} />
                                </button>
                            </div>
                        </div>

                        {/* S3-04 Signal cards */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <AnimatePresence mode="popLayout">
                                {filtered.map(signal => (
                                    <SignalCard
                                        key={signal.id}
                                        signal={signal}
                                        selected={selectedSignal?.id === signal.id}
                                        onClick={() => setSelectedSignal(selectedSignal?.id === signal.id ? null : signal)}
                                    />
                                ))}
                            </AnimatePresence>
                            {filtered.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 gap-2">
                                    <Filter size={28} className="text-zinc-700" />
                                    <p className="text-sm text-zinc-600">No signals match current filters</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* S3-05 Detail panel */}
                    <AnimatePresence>
                        {selectedSignal && (
                            <motion.div
                                key="detail"
                                initial={{ width: 0 }}
                                animate={{ width: 340 }}
                                exit={{ width: 0 }}
                                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                                className="flex-shrink-0 overflow-hidden border-l border-white/8"
                            >
                                <div className="w-[340px] h-full p-3">
                                    <DetailPanel signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
