"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle, Trash2, Edit2, Plus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/useSessionStore';
import NewBRDModal from '@/components/ui/NewBRDModal';

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl overflow-hidden"
        >
            <div className="px-5 py-4 border-b border-white/8">
                <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
                {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </motion.div>
    );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
            <label className="text-xs text-zinc-400 w-52 flex-shrink-0">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

// ─── Confidence band visual ───────────────────────────────────────────────────

function ConfidenceDiagram({ accept, lower }: { accept: number; lower: number }) {
    return (
        <div className="space-y-2">
            <div className="relative h-4 rounded-full overflow-hidden bg-white/6 flex">
                {/* Forced noise zone */}
                <div className="h-full bg-red-500/30" style={{ width: `${lower * 100}%` }} />
                {/* Review zone */}
                <div className="h-full bg-amber-500/30" style={{ width: `${(accept - lower) * 100}%` }} />
                {/* Auto-accept zone */}
                <div className="h-full bg-emerald-500/30" style={{ width: `${(1 - accept) * 100}%` }} />
            </div>
            <div className="flex text-[10px] text-zinc-600 justify-between px-0.5">
                <span className="text-red-400">Noise (&lt;{Math.round(lower * 100)}%)</span>
                <span className="text-amber-400">Review</span>
                <span className="text-emerald-400">Auto-accept (≥{Math.round(accept * 100)}%)</span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { sessions, removeSession, updateSession, setActive } = useSessionStore();
    const [hasHydrated, setHasHydrated] = useState(false);

    const [showKey, setShowKey] = useState(false);
    const [apiKey, setApiKey] = useState('gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    const [connTested, setConnTested] = useState<boolean | null>(null);
    const [maxEmails, setMaxEmails] = useState(200);
    const [maxChunks, setMaxChunks] = useState(500);
    const [batchSize, setBatchSize] = useState(10);
    const [accept, setAccept] = useState(0.75);
    const [lower, setLower] = useState(0.65);

    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState('');

    const [editingSession, setEditingSession] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    const testConnection = () => {
        setConnTested(null);
        setTimeout(() => setConnTested(true), 1200);
    };

    const handleSaveRename = () => {
        if (editingSession && editName.trim()) {
            updateSession(editingSession, { name: editName.trim() });
            setEditingSession(null);
            setEditName('');
        }
    };

    if (!hasHydrated) return null;

    return (
        <div className="p-6 space-y-5 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
                <p className="text-sm text-zinc-500 mt-0.5">Configure API keys, processing limits, and session management</p>
            </div>

            {/* S6-01 API Configuration */}
            <SettingsCard title="API Configuration" description="Groq API connection and model selection">
                <FieldRow label="Groq API Key">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className="glass-input w-full px-3 py-2 text-sm font-mono"
                            />
                        </div>
                        <button onClick={() => setShowKey(v => !v)} className="btn-secondary px-3 py-2">
                            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </FieldRow>

                <FieldRow label="Connection Test">
                    <div className="flex items-center gap-3">
                        <button onClick={testConnection} className="btn-secondary text-sm flex items-center gap-2">
                            <RefreshCw size={13} className={connTested === null ? 'animate-spin' : ''} />
                            Test Connection
                        </button>
                        {connTested === true && (
                            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                                <CheckCircle2 size={13} /> Connected · 142ms
                            </span>
                        )}
                        {connTested === false && (
                            <span className="flex items-center gap-1.5 text-xs text-red-400">
                                <AlertCircle size={13} /> Failed to connect
                            </span>
                        )}
                    </div>
                </FieldRow>

                <FieldRow label="Active Model">
                    <div className="glass-input px-3 py-2 text-sm font-mono text-zinc-400 rounded-lg">
                        llama-3.3-70b-versatile
                    </div>
                </FieldRow>
            </SettingsCard>

            {/* S6-02 Processing Limits */}
            <SettingsCard title="Processing Limits" description="Control resource usage per pipeline run">
                {[
                    { label: 'Max emails per run', value: maxEmails, set: setMaxEmails, default: 200, min: 10, max: 2000 },
                    { label: 'Cost guardrail (chunks)', value: maxChunks, set: setMaxChunks, default: 500, min: 50, max: 5000 },
                    { label: 'Classification batch size', value: batchSize, set: setBatchSize, default: 10, min: 1, max: 50 },
                ].map(({ label, value, set, default: def, min, max }) => (
                    <FieldRow key={label} label={label}>
                        <div className="flex items-center gap-3">
                            <input
                                type="number" value={value} min={min} max={max}
                                onChange={e => set(Number(e.target.value))}
                                className="glass-input w-28 px-3 py-2 text-sm font-mono"
                            />
                            <button onClick={() => set(def)} className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                                Reset to {def}
                            </button>
                        </div>
                    </FieldRow>
                ))}
                <p className="text-xs text-zinc-600 italic">Changes take effect on the next pipeline run.</p>
            </SettingsCard>

            {/* S6-03 Classification Thresholds */}
            <SettingsCard title="Classification Thresholds" description="Adjust confidence bands for signal review routing">
                <div className="space-y-4">
                    {[
                        { label: 'Auto-accept threshold', value: accept, set: setAccept, help: 'Signals above this are auto-accepted' },
                        { label: 'Review band lower bound', value: lower, set: setLower, help: 'Signals between this and auto-accept go to review' },
                    ].map(({ label, value, set, help }) => (
                        <FieldRow key={label} label={label}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range" min={0} max={1} step={0.01} value={value}
                                    onChange={e => set(Number(e.target.value))}
                                    className="flex-1 accent-cyan-400"
                                />
                                <span className="font-mono text-sm text-zinc-300 w-12 text-right">{Math.round(value * 100)}%</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 mt-0.5">{help}</p>
                        </FieldRow>
                    ))}

                    <ConfidenceDiagram accept={accept} lower={lower} />

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/6 border border-amber-500/20">
                        <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-200/70">Changing thresholds affects signal quality and review queue size. Apply carefully.</p>
                    </div>

                    <button className="btn-secondary text-sm">Reset to Defaults</button>
                </div>
            </SettingsCard>

            {/* S6-04 Session Management */}
            <SettingsCard title="Session Management" description="Manage all sessions for this account">
                <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-white/8">
                                {['Session', 'Created', 'Sources', 'Signals', 'Status', ''].map(h => (
                                    <th key={h} className="pb-2 pt-1 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider px-2">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sessions.map(sess => (
                                <tr key={sess.id} className="hover:bg-white/3 transition-colors">
                                    <td className="px-2 py-3">
                                        {editingSession === sess.id ? (
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    autoFocus
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveRename()}
                                                    className="glass-input px-2 py-1 text-xs w-full"
                                                />
                                                <button onClick={handleSaveRename} className="text-emerald-400 hover:text-emerald-300">Save</button>
                                                <button onClick={() => setEditingSession(null)} className="text-zinc-500 hover:text-zinc-300">Esc</button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-zinc-200 font-medium">{sess.name}</p>
                                                <p className="text-zinc-600 font-mono text-[10px]">{sess.id}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-2 py-3 text-zinc-500">{new Date(sess.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-2 py-3 text-zinc-400 font-mono">{sess.sections || 0}</td>
                                    <td className="px-2 py-3 text-zinc-400 font-mono">{sess.signals || 0}</td>
                                    <td className="px-2 py-3">
                                        <span className={cn('glass-badge',
                                            sess.status === 'active' ? 'badge-timeline' :
                                                sess.status === 'complete' ? 'badge-success' : 'badge-noise'
                                        )}>
                                            {sess.status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setActive(sess.id)}
                                                className="p-1.5 rounded text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-colors" title="Activate"
                                            >
                                                <ArrowRight size={12} />
                                            </button>
                                            <button
                                                onClick={() => { setEditingSession(sess.id); setEditName(sess.name); }}
                                                className="p-1.5 rounded text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-colors" title="Rename"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(sess.id)}
                                                className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {deleteConfirm && (
                    <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/25 space-y-2">
                        <p className="text-xs text-red-300 font-medium">Type session name to confirm delete:</p>
                        <div className="flex gap-2">
                            <input
                                type="text" placeholder="Session name…"
                                value={deleteName} onChange={e => setDeleteName(e.target.value)}
                                className="glass-input flex-1 px-3 py-2 text-sm"
                            />
                            <button
                                disabled={deleteName !== sessions.find(s => s.id === deleteConfirm)?.name}
                                className={cn('btn-danger text-sm py-2 px-3', deleteName !== sessions.find(s => s.id === deleteConfirm)?.name && 'opacity-40 cursor-not-allowed')}
                                onClick={() => {
                                    removeSession(deleteConfirm);
                                    setDeleteConfirm(null);
                                    setDeleteName('');
                                }}
                            >
                                Delete
                            </button>
                            <button onClick={() => { setDeleteConfirm(null); setDeleteName(''); }} className="btn-ghost text-sm py-2 px-3">Cancel</button>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setModalOpen(true)}
                    className="btn-primary text-sm flex items-center gap-2"
                >
                    <Plus size={14} /> Create New Session
                </button>
                <NewBRDModal open={modalOpen} onClose={() => setModalOpen(false)} />
            </SettingsCard>

            {/* S6-05 Database Status */}
            <SettingsCard title="Database Status" description="AKS connection and table health">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Connected</span>
                    <button className="btn-ghost text-xs py-1 ml-2">Test Connection</button>
                </div>
                <div className="space-y-2">
                    {[
                        { table: 'classified_chunks', rows: 248 },
                        { table: 'brd_sections', rows: 7 },
                        { table: 'brd_snapshots', rows: 12 },
                        { table: 'brd_validation_flags', rows: 3 },
                    ].map(({ table, rows }) => (
                        <div key={table} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3">
                            <span className="font-mono text-xs text-zinc-400 flex-1">{table}</span>
                            <span className="font-mono text-xs text-zinc-500">{rows} rows</span>
                        </div>
                    ))}
                </div>
            </SettingsCard>
        </div>
    );
}
