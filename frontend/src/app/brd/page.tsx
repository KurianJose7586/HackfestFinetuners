"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, AlertTriangle, Lock, Edit3, RefreshCw,
    ChevronDown, ChevronUp, X, Eye, RotateCcw, Link as LinkIcon,
    Clock, FileText, Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Drawer from '@/components/ui/Drawer';

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

const BRD_SECTIONS: BRDSection[] = [
    {
        id: 's1', number: 1, title: 'Executive Summary', version: 'v2', status: 'generated',
        timestamp: '14:08', sourceCount: 12,
        content: `## Executive Summary\n\nThis Business Requirements Document specifies the functional and non-functional requirements for the PS21 real-time notification platform. The system is designed to serve a multi-tenant SaaS architecture with support for 1,000 notifications per minute per tenant.\n\n**Project Scope:** Full-stack notification delivery system with sub-200ms latency SLA.\n\n**Key Stakeholders:** Product (Priya Sharma), Engineering (Raj Patel), Design (Ananya Singh).\n\n**Target Delivery:** Q2 2026 — mobile-first, investor-committed deadline.`,
    },
    {
        id: 's2', number: 2, title: 'Business Objectives', version: 'v1', status: 'human_edited',
        timestamp: '14:10', sourceCount: 8,
        content: `## Business Objectives\n\n1. Deliver a real-time notification system supporting the investor-committed Q2 mobile launch.\n2. Achieve sub-200ms notification latency to meet competitive benchmarks.\n3. Support multi-tenant rate limiting at 1,000 req/min per tenant.\n4. Ensure full auditability of notification delivery with source traceability.`,
    },
    {
        id: 's3', number: 3, title: 'Functional Requirements', version: 'v2', status: 'flagged',
        timestamp: '14:09', sourceCount: 34,
        flagType: 'Conflicting Requirements', flagSeverity: 'high',
        flagDescription: 'REQ-007 (PostgreSQL) and REQ-012 (NoSQL) specify contradictory database architectures. Requires resolution before implementation.',
        content: `## Functional Requirements\n\n**REQ-001** The system must support real-time notifications for all user-facing events with maximum latency of 200ms.\n\n**REQ-002** The API must enforce rate limiting at 1,000 req/min per tenant with 429 + Retry-After on breach.\n\n**REQ-003** The OAuth2 token refresh must handle edge cases around token expiry during active sessions.\n\n**REQ-007** [CONFLICT] Database: PostgreSQL with read replicas for notification state.\n\n**REQ-012** [CONFLICT] Database: Distributed NoSQL for horizontal scaling.`,
    },
    {
        id: 's4', number: 4, title: 'Non-Functional Requirements', version: 'v1', status: 'generated',
        timestamp: '14:09', sourceCount: 18,
        content: `## Non-Functional Requirements\n\n**NFR-001 Performance:** P99 notification delivery latency ≤ 200ms under nominal load.\n\n**NFR-002 Scalability:** System must scale to 10,000 concurrent tenants without degradation.\n\n**NFR-003 Availability:** 99.9% uptime SLA for the notification pipeline.\n\n**NFR-004 Security:** All inter-service communication encrypted via mTLS. OAuth2 for end-user authentication.`,
    },
    {
        id: 's5', number: 5, title: 'Technical Architecture', version: 'v1', status: 'insufficient',
        missingSignals: ['Architecture Decision Records', 'Deployment topology signals', 'Infra cost signals'],
        content: '',
    },
    {
        id: 's6', number: 6, title: 'Timeline & Milestones', version: 'v1', status: 'generated',
        timestamp: '14:08', sourceCount: 9,
        content: `## Timeline & Milestones\n\n**Sprint 3 (current):** Architecture decision — PostgreSQL vs NoSQL.\n\n**Q1 2026 — End:** Authentication flow complete, OAuth2 edge cases resolved.\n\n**Q2 2026:** Mobile app launch (investor-committed, immovable deadline).\n\n**Q3 2026:** Multi-region expansion contingent on Q2 success.`,
    },
    {
        id: 's7', number: 7, title: 'Acceptance Criteria', version: 'v1', status: 'generated',
        timestamp: '14:09', sourceCount: 6,
        content: `## Acceptance Criteria\n\n1. Notification latency P99 ≤ 200ms measured in production load test.\n2. Rate limiting correctly returns 429 with Retry-After header on threshold breach.\n3. Mobile app demonstrable end-to-end on iOS and Android by Q2 deadline.\n4. All conflicting requirements resolved and re-validated with stakeholders.`,
    },
];

const VALIDATION_FLAGS: ValidationFlag[] = [
    { id: 'f1', section: 'Functional Requirements', type: 'Conflicting Requirements', severity: 'high', description: 'REQ-007 and REQ-012 specify contradictory DB architectures.', acknowledged: false },
    { id: 'f2', section: 'Technical Architecture', type: 'Insufficient Signal Coverage', severity: 'medium', description: 'Section generated with fewer than 5 source signals.', acknowledged: false },
    { id: 'f3', section: 'Business Objectives', type: 'Human Edit Lock', severity: 'low', description: 'Section manually edited — may diverge from source signals.', acknowledged: true },
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
    const [attrDrawer, setAttrDrawer] = useState<BRDSection | null>(null);
    const [histDrawer, setHistDrawer] = useState<BRDSection | null>(null);
    const [flagsExpanded, setFlagsExpanded] = useState(false);
    const [flags, setFlags] = useState(VALIDATION_FLAGS);

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
                {BRD_SECTIONS.map(sec => (
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
                <div className="pt-3 border-t border-white/8 mt-2">
                    <button className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5">
                        <RefreshCw size={11} /> Regenerate All
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

                {/* Section cards */}
                <div className="p-6 space-y-5">
                    {BRD_SECTIONS.map((sec, i) => (
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
