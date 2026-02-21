"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, AlertTriangle, Lock, Edit3, RefreshCw,
    ChevronDown, ChevronUp, X, Eye, RotateCcw, Link as LinkIcon,
    Clock, FileText, Unlock, Loader2, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Drawer from '@/components/ui/Drawer';
import { useBRDStore } from '@/store/useBRDStore';
import { useSessionStore } from '@/store/useSessionStore';

// ─── Types & Mock Data ────────────────────────────────────────────────────────

type SectionStatus = 'generated' | 'insufficient' | 'human_edited' | 'flagged' | 'locked';

interface BRDSection {
    id: string;
    number: number;
    title: string;
    version: string;
    status: SectionStatus;
    timestamp?: string;
    sourceCount?: number;
    content?: string;
    flagType?: string;
    flagSeverity?: 'high' | 'medium' | 'low';
    flagDescription?: string;
    missingSignals?: string[];
}

interface ValidationFlag {
    id: string;
    section: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    acknowledged: boolean;
}

// Section ID → display title mapping (matches backend section names)
const SECTION_META: { id: string; number: number; title: string }[] = [
    { id: 'executive_summary', number: 1, title: 'Executive Summary' },
    { id: 'functional_requirements', number: 2, title: 'Functional Requirements' },
    { id: 'stakeholder_analysis', number: 3, title: 'Stakeholder Analysis' },
    { id: 'timeline', number: 4, title: 'Timeline & Milestones' },
    { id: 'decisions', number: 5, title: 'Key Decisions' },
    { id: 'assumptions', number: 6, title: 'Assumptions & Constraints' },
    { id: 'success_metrics', number: 7, title: 'Success Metrics' },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SectionStatus }) {
    const map = {
        generated: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        insufficient: 'bg-zinc-700/30 border-zinc-600/30 text-zinc-400',
        human_edited: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
        flagged: 'bg-red-500/10 border-red-500/30 text-red-300',
        locked: 'bg-zinc-700/30 border-zinc-600/30 text-zinc-400',
    };
    const labels = { generated: 'Generated', insufficient: 'Insufficient Data', human_edited: 'Human Edited', flagged: 'Flagged', locked: 'Locked' };
    return <span className={cn('glass-badge', map[status])}>{labels[status]}</span>;
}

// ─── BRD Section Card ─────────────────────────────────────────────────────────

function SectionCard({
    section,
    onViewAttribution,
    onViewHistory,
}: {
    section: BRDSection;
    onViewAttribution: (s: BRDSection) => void;
    onViewHistory: (s: BRDSection) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(section.content ?? '');
    const [flagAcknowledged, setFlagAcknowledged] = useState(false);

    return (
        <div
            id={`section-${section.id}`}
            className={cn("glass-card rounded-xl overflow-hidden", {
                'border-red-500/30': section.status === 'flagged' && !flagAcknowledged,
                'border-yellow-500/25': section.status === 'human_edited',
            })}
        >
            {/* Section header */}
            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs text-zinc-600">§{section.number}</span>
                <h3 className="text-sm font-semibold text-zinc-100 flex-1">{section.title}</h3>
                <span className="glass-badge bg-white/5 border-white/10 text-zinc-500 text-[9px] font-mono">{section.version}</span>
                <StatusBadge status={section.status} />
                {section.status === 'human_edited' && <Lock size={12} className="text-yellow-400" />}
                {section.timestamp && (
                    <span className="text-[10px] text-zinc-600 flex items-center gap-1"><Clock size={9} />{section.timestamp}</span>
                )}
                <div className="flex items-center gap-1 ml-1">
                    <button
                        onClick={() => setEditing(v => !v)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                        title={section.status === 'human_edited' ? 'Unlock & Edit' : 'Edit'}
                    >
                        {section.status === 'human_edited' ? <Unlock size={13} /> : <Edit3 size={13} />}
                    </button>
                    <button className="p-1.5 rounded-lg text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Regenerate">
                        <RefreshCw size={13} />
                    </button>
                </div>
            </div>

            {/* Flagged banner */}
            {section.status === 'flagged' && !flagAcknowledged && (
                <div className="mx-5 mt-4 p-3 rounded-lg bg-red-500/8 border border-red-500/25 flex items-start gap-3">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-red-300">{section.flagType}</span>
                            <span className="glass-badge badge-severity-high text-[9px]">HIGH</span>
                        </div>
                        <p className="text-xs text-red-200/70">{section.flagDescription}</p>
                    </div>
                    <button
                        onClick={() => setFlagAcknowledged(true)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 flex-shrink-0 bg-white/5 px-2.5 py-1 rounded-lg transition-colors"
                    >
                        Acknowledge
                    </button>
                </div>
            )}

            {/* Insufficient data state */}
            {section.status === 'insufficient' && (
                <div className="mx-5 mt-4 p-4 rounded-lg striped-bg border border-white/8 space-y-2">
                    <p className="text-sm text-zinc-400 font-medium">⚠ Insufficient signal coverage</p>
                    <p className="text-xs text-zinc-500">This section could not be generated due to missing signal types.</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {section.missingSignals?.map(s => (
                            <span key={s} className="glass-badge badge-noise text-[10px]">{s}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Body */}
            {section.content && !editing && (
                <div className="px-5 py-4">
                    <div className="prose prose-invert prose-sm max-w-none text-zinc-300 text-xs leading-relaxed whitespace-pre-line">
                        {section.content}
                    </div>
                </div>
            )}

            {/* Inline editor */}
            {editing && (
                <div className="px-5 py-4">
                    <textarea
                        className="glass-input w-full font-mono text-xs p-3 rounded-lg resize-none"
                        rows={12}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-zinc-600 font-mono">{editContent.length} chars</span>
                        <div className="flex gap-2">
                            <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5">Cancel</button>
                            <button onClick={() => setEditing(false)} className="btn-primary text-xs py-1.5">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            {section.sourceCount !== undefined && (
                <div className="px-5 py-3 border-t border-white/5 flex items-center gap-3">
                    <span className="text-[11px] text-zinc-600">Generated from {section.sourceCount} signals</span>
                    <button onClick={() => onViewAttribution(section)} className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                        View Attribution
                    </button>
                    <button onClick={() => onViewHistory(section)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                        Version History
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BRDPage() {
    const { activeSessionId } = useSessionStore();
    const sessionId = activeSessionId ?? '';
    const { sections, flags: apiFlags, loading, generating, error, generateAll, loadBRD, updateSection } = useBRDStore();

    const [attrDrawer, setAttrDrawer] = useState<BRDSection | null>(null);
    const [histDrawer, setHistDrawer] = useState<BRDSection | null>(null);
    const [flagsExpanded, setFlagsExpanded] = useState(false);
    const [flags, setFlags] = useState<ValidationFlag[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // Load BRD sections from the API when the page mounts
    useEffect(() => {
        if (sessionId) loadBRD(sessionId);
    }, [sessionId]);

    // Sync API flags into local state for acknowledge UI
    useEffect(() => {
        setFlags(apiFlags.map((f, i) => ({ id: String(i), section: f.section_name, type: f.flag_type, severity: f.severity, description: f.description, acknowledged: false })));
    }, [apiFlags]);

    const handleSave = async (sectionId: string) => {
        await updateSection(sessionId, sectionId, editContent);
        setEditingId(null);
    };

    // Build display sections by merging API content with metadata
    const displaySections: BRDSection[] = SECTION_META.map(meta => {
        const storeSection = sections.find(s => s.id === meta.id);
        const flagForSection = flags.find(f => f.section.toLowerCase().includes(meta.title.toLowerCase()));
        const content = storeSection?.content ?? '';
        const status: SectionStatus = storeSection?.humanEdited ? 'human_edited' : content ? (flagForSection && !flagForSection.acknowledged ? 'flagged' : 'generated') : 'insufficient';
        return {
            id: meta.id, number: meta.number, title: meta.title,
            version: 'v1', status, content,
            flagType: flagForSection?.type,
            flagSeverity: flagForSection?.severity,
            flagDescription: flagForSection?.description,
            sourceCount: content ? Math.floor(content.length / 50) : undefined,
        };
    });

    const unacknowledged = flags.filter(f => !f.acknowledged);
    const highCount = unacknowledged.filter(f => f.severity === 'high').length;
    const medCount = unacknowledged.filter(f => f.severity === 'medium').length;

    const acknowledgeFlag = (id: string) =>
        setFlags(prev => prev.map(f => f.id === id ? { ...f, acknowledged: true } : f));

    const scrollTo = (id: string) => {
        document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* S4-01 Section Sidebar */}
            <aside className="w-52 flex-shrink-0 border-r border-white/8 overflow-y-auto p-3 space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider px-2 mb-3 font-semibold">Sections</p>
                {displaySections.map(sec => (
                    <button
                        key={sec.id}
                        onClick={() => scrollTo(sec.id)}
                        className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left transition-colors group"
                    >
                        <span className="text-[10px] font-mono text-zinc-700 mt-0.5 flex-shrink-0">{sec.number}.</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors leading-tight">{sec.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono text-zinc-700">{sec.version}</span>
                                {sec.status === 'flagged' && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                                {sec.status === 'human_edited' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                                {sec.status === 'insufficient' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
                                {sec.status === 'generated' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                {sec.sourceCount && <span className="text-[9px] text-zinc-700">{sec.sourceCount}s</span>}
                            </div>
                        </div>
                    </button>
                ))}
                <div className="pt-3 border-t border-white/8 mt-2 space-y-2">
                    <button
                        onClick={() => generateAll(sessionId)}
                        disabled={generating || !sessionId}
                        className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {generating ? <><Loader2 size={11} className="animate-spin" /> Generating…</> : <><Zap size={11} /> Generate BRD</>}
                    </button>
                    <button
                        onClick={() => loadBRD(sessionId)}
                        disabled={loading || !sessionId}
                        className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                {/* S4-02 Validation Flags Banner */}
                {unacknowledged.length > 0 && (
                    <div className="mx-6 mt-5">
                        <div className={cn("glass-card rounded-xl overflow-hidden border-red-500/20")}>
                            <button
                                onClick={() => setFlagsExpanded(v => !v)}
                                className="w-full flex items-center gap-3 px-4 py-3"
                            >
                                <AlertTriangle size={14} className="text-red-400" />
                                <span className="text-sm font-medium text-red-300">
                                    {unacknowledged.length} Validation {unacknowledged.length === 1 ? 'Flag' : 'Flags'}
                                </span>
                                <div className="flex items-center gap-1.5 ml-1">
                                    {highCount > 0 && <span className="glass-badge badge-severity-high text-[9px]">{highCount} HIGH</span>}
                                    {medCount > 0 && <span className="glass-badge badge-severity-medium text-[9px]">{medCount} MEDIUM</span>}
                                </div>
                                <div className="ml-auto text-zinc-600">
                                    {flagsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </button>
                            <AnimatePresence>
                                {flagsExpanded && (
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 space-y-2 border-t border-white/8 pt-3">
                                            {flags.map(flag => (
                                                <div key={flag.id} className={cn("flex items-start gap-3 p-3 rounded-lg", flag.acknowledged ? 'opacity-40' : 'bg-white/3')}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-xs font-medium text-zinc-300">{flag.section}</span>
                                                            <span className={cn('glass-badge text-[9px]', { 'badge-severity-high': flag.severity === 'high', 'badge-severity-medium': flag.severity === 'medium', 'badge-severity-low': flag.severity === 'low' })}>
                                                                {flag.severity.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-zinc-500">{flag.description}</p>
                                                    </div>
                                                    {!flag.acknowledged && (
                                                        <button onClick={() => acknowledgeFlag(flag.id)} className="text-[11px] text-zinc-400 hover:text-zinc-200 flex-shrink-0 bg-white/5 px-2.5 py-1 rounded-lg transition-colors">
                                                            Acknowledge
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Loading / generating states */}
                {generating && (
                    <div className="mx-6 mt-5 glass-card rounded-xl p-5 flex items-center gap-4">
                        <Loader2 size={20} className="animate-spin text-cyan-400 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-cyan-300">Generating BRD sections…</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Running 7 parallel AI agents. This takes 30–90 seconds.</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="mx-6 mt-5 glass-card rounded-xl p-4 border-red-500/30">
                        <p className="text-sm text-red-300">⚠ {error}</p>
                    </div>
                )}

                {/* Section cards */}
                <div className="p-6 space-y-5">
                    {(generating ? [] : displaySections).map((sec, i) => (
                        <motion.div
                            key={sec.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: i * 0.05 }}
                        >
                            <SectionCard
                                section={sec}
                                onViewAttribution={s => setAttrDrawer(s)}
                                onViewHistory={s => setHistDrawer(s)}
                            />
                        </motion.div>
                    ))}
                    {!generating && displaySections.every(s => !s.content) && !loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                            <FileText size={36} className="text-zinc-700" />
                            <p className="text-sm text-zinc-500">No BRD generated yet.</p>
                            <button onClick={() => generateAll(sessionId)} className="btn-primary text-sm mt-1 flex items-center gap-2">
                                <Zap size={14} /> Generate BRD Draft
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* S4-05 Attribution Drawer */}
            <Drawer
                open={!!attrDrawer}
                onClose={() => setAttrDrawer(null)}
                title={attrDrawer?.title ?? ''}
                subtitle={`${attrDrawer?.sourceCount ?? 0} contributing signals`}
            >
                <div className="space-y-3">
                    {[
                        { text: 'The system must support real-time notifications with 200ms latency.', speaker: 'Priya Sharma', source: '#product-requirements', label: 'Requirement', conf: 91 },
                        { text: 'Rate limiting at 1,000 req/min per tenant with 429 + Retry-After.', speaker: 'Raj Patel', source: '#product-requirements', label: 'Requirement', conf: 87 },
                        { text: 'OAuth2 token refresh edge cases must be handled.', speaker: 'Ananya Singh', source: '#engineering-standup', label: 'Requirement', conf: 68 },
                    ].map((chunk, i) => (
                        <div key={i} className="glass-card p-3.5 rounded-xl">
                            <p className="text-xs text-zinc-200 leading-relaxed mb-2 italic">"{chunk.text}"</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="glass-badge badge-requirement text-[9px]">{chunk.label}</span>
                                <span className="text-[10px] text-zinc-500">{chunk.speaker}</span>
                                <span className="font-mono text-[10px] text-zinc-600">{chunk.source}</span>
                                <span className="ml-auto text-[10px] font-mono text-emerald-400">{chunk.conf}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Drawer>

            {/* S4-06 Version History Drawer */}
            <Drawer
                open={!!histDrawer}
                onClose={() => setHistDrawer(null)}
                title={histDrawer?.title ?? ''}
                subtitle="Version history"
            >
                <div className="space-y-3">
                    {[
                        { ver: 'v2', time: '14:09 today', sources: 34, preview: 'The system must support real-time notifications…', current: true },
                        { ver: 'v1', time: '14:05 today', sources: 18, preview: 'Initial generation: rate limiting and OAuth2 requirements…', current: false },
                    ].map((v, i) => (
                        <div key={i} className="glass-card p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-xs text-zinc-300 font-semibold">{v.ver}</span>
                                {v.current && <span className="glass-badge badge-timeline text-[9px]">Current</span>}
                                <span className="text-[10px] text-zinc-600 ml-auto flex items-center gap-1"><Clock size={9} />{v.time}</span>
                            </div>
                            <p className="text-xs text-zinc-500">{v.sources} sources · {v.preview}</p>
                            <div className="flex gap-2 mt-3">
                                <button className="btn-ghost text-xs py-1 flex items-center gap-1.5"><Eye size={11} /> View</button>
                                {!v.current && <button className="btn-secondary text-xs py-1 flex items-center gap-1.5"><RotateCcw size={11} /> Restore</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </Drawer>
        </div>
    );
}
