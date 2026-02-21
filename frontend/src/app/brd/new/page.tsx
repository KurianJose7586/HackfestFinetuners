"use client";

import { useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, Hash, Zap, Check, FileText, ArrowRight, ArrowLeft,
    X, File, Loader2, Brain, Sparkles, Shield, Download,
} from 'lucide-react';
import Link from 'next/link';

// ─── Step header ──────────────────────────────────────────────────────────────
const STEPS = [
    { id: 'upload', label: 'Upload Sources', icon: Upload },
    { id: 'connect', label: 'Connect Channel', icon: Hash },
    { id: 'generate', label: 'Generate BRD', icon: Brain },
];

function StepBar({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < current;
                const active = i === current;
                return (
                    <div key={s.id} className="flex items-center">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-white/8 border border-white/14' : ''}`}>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${done ? 'bg-emerald-500/20 border border-emerald-500/30' : active ? 'bg-white/10 border border-white/20' : 'bg-white/4 border border-white/8'}`}>
                                {done ? <Check size={11} className="text-emerald-400" /> : <Icon size={11} className={active ? 'text-white' : 'text-zinc-700'} />}
                            </div>
                            <span className={`text-xs font-medium transition-colors ${active ? 'text-white' : done ? 'text-zinc-500' : 'text-zinc-700'}`}>{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className="w-8 h-px mx-1" style={{ background: done ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Step 1: Upload Sources ────────────────────────────────────────────────────
interface UploadedFile { name: string; size: number; type: string; }

function Step1Upload({ files, setFiles, onNext }: {
    files: UploadedFile[]; setFiles: (f: UploadedFile[]) => void; onNext: () => void;
}) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addFiles = useCallback((incoming: FileList | null) => {
        if (!incoming) return;
        const arr = Array.from(incoming).map(f => ({ name: f.name, size: f.size, type: f.type }));
        setFiles([...files, ...arr].filter((f, i, a) => a.findIndex(x => x.name === f.name) === i));
    }, [files, setFiles]);

    const remove = (name: string) => setFiles(files.filter(f => f.name !== name));

    const fmt = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    return (
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Upload source documents</h2>
                <p className="text-sm text-zinc-500">Add the raw materials your BRD will be generated from. Accepts emails, meeting notes, PDFs, DOCX, and plain text.</p>
            </div>

            {/* Drop zone */}
            <div
                onClick={() => inputRef.current?.click()}
                onDragEnter={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                className="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-10 text-center"
                style={{
                    borderColor: dragging ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.10)',
                    background: dragging ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                }}
            >
                <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.eml,.msg" className="hidden" onChange={e => addFiles(e.target.files)} />
                <Upload size={28} className="text-zinc-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-zinc-300 mb-1">Drop files here or click to browse</p>
                <p className="text-xs text-zinc-600">PDF · DOCX · TXT · MD · EML · MSG — up to 25 MB each</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-mono text-zinc-600">{files.length} file{files.length !== 1 ? 's' : ''} added</p>
                    {files.map(f => (
                        <div key={f.name} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <File size={14} className="text-zinc-500 flex-shrink-0" />
                            <p className="flex-1 text-sm text-zinc-300 truncate">{f.name}</p>
                            <span className="text-xs text-zinc-600 font-mono flex-shrink-0">{fmt(f.size)}</span>
                            <button onClick={() => remove(f.name)} className="text-zinc-700 hover:text-zinc-400 transition-colors ml-1">
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Accepted types reference */}
            <div className="grid grid-cols-3 gap-2">
                {[['📄', 'PDF / DOCX', 'Requirements docs'], ['📧', 'Email · EML', 'Thread exports'], ['💬', 'Text · MD', 'Meeting notes']].map(([emoji, name, desc]) => (
                    <div key={name} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="text-xl mb-1">{emoji}</div>
                        <p className="text-xs font-medium text-zinc-400">{name}</p>
                        <p className="text-[10px] text-zinc-700">{desc}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button onClick={onNext}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow-[0_2px_16px_rgba(255,255,255,0.10)] transition-all">
                    {files.length === 0 ? 'Skip — connect channel instead' : `Continue with ${files.length} file${files.length !== 1 ? 's' : ''}`} <ArrowRight size={14} />
                </button>
            </div>
        </motion.div>
    );
}

// ─── Step 2: Connect Slack channel ────────────────────────────────────────────
const MOCK_CHANNELS = [
    { id: 'C01AB', name: 'engineering', msgs: 1248, active: true },
    { id: 'C02CD', name: 'product-design', msgs: 832, active: true },
    { id: 'C03EF', name: 'requirements-sync', msgs: 420, active: false },
    { id: 'C04GH', name: 'sprint-planning', msgs: 374, active: true },
    { id: 'C05IJ', name: 'stakeholder-updates', msgs: 156, active: false },
];

function Step2Connect({ selected, setSelected, onNext, onBack }: {
    selected: string[]; setSelected: (s: string[]) => void; onNext: () => void; onBack: () => void;
}) {
    const toggle = (id: string) =>
        setSelected(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

    return (
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Connect Slack channels</h2>
                <p className="text-sm text-zinc-500">Select the channels that contain relevant conversations. Beacon will extract requirement signals from the last 90 days of messages.</p>
            </div>

            {/* Workspace status */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.5)' }} />
                <div>
                    <p className="text-sm font-medium text-zinc-200">Beacon workspace connected</p>
                    <p className="text-xs text-zinc-500">team-beacon.slack.com · 23 channels available</p>
                </div>
                <span className="ml-auto text-xs text-emerald-400 font-mono">linked</span>
            </div>

            {/* Channel list */}
            <div className="space-y-2">
                <p className="text-xs font-mono text-zinc-600 mb-3">Available channels</p>
                {MOCK_CHANNELS.map(ch => {
                    const sel = selected.includes(ch.id);
                    return (
                        <button key={ch.id} onClick={() => toggle(ch.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
                            style={{
                                background: sel ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                                border: sel ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.06)',
                            }}>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${sel ? 'bg-white border-white' : 'border-white/20 bg-white/4'}`}>
                                {sel && <Check size={10} className="text-zinc-900" />}
                            </div>
                            <Hash size={12} className="text-zinc-500 flex-shrink-0" />
                            <span className="flex-1 text-sm font-medium text-zinc-200">{ch.name}</span>
                            <span className="text-xs text-zinc-600 font-mono">{ch.msgs.toLocaleString()} msgs</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${ch.active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-zinc-600">Messages are read-only. Beacon never posts or modifies channel content.</p>

            <div className="flex items-center gap-3 pt-2">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all">
                    <ArrowLeft size={14} /> Back
                </button>
                <button onClick={onNext}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow-[0_2px_16px_rgba(255,255,255,0.10)] transition-all">
                    {selected.length === 0 ? 'Skip channels' : `Use ${selected.length} channel${selected.length !== 1 ? 's' : ''}`} <ArrowRight size={14} />
                </button>
            </div>
        </motion.div>
    );
}

// ─── Step 3: Generate BRD ─────────────────────────────────────────────────────
const GEN_STAGES = [
    { label: 'Ingesting sources', icon: Upload, duration: 1200 },
    { label: 'Noise filtering', icon: Shield, duration: 900 },
    { label: 'Extracting signals', icon: Zap, duration: 1100 },
    { label: 'Classifying requirements', icon: Brain, duration: 1300 },
    { label: 'Running model orchestration', icon: Sparkles, duration: 1500 },
    { label: 'Generating BRD sections', icon: FileText, duration: 1400 },
    { label: 'Validating & resolving', icon: Shield, duration: 800 },
    { label: 'Finalising document', icon: Download, duration: 600 },
];

import { useSessionStore } from '@/store/useSessionStore';

function Step3Generate({ brdId, brdName }: { brdId: string; brdName: string; }) {
    const [started, setStarted] = useState(false);
    const [stageIdx, setStageIdx] = useState(-1);
    const [done, setDone] = useState(false);
    const router = useRouter();
    const updateSession = useSessionStore(s => s.updateSession);

    const runGeneration = async () => {
        setStarted(true);
        for (let i = 0; i < GEN_STAGES.length; i++) {
            setStageIdx(i);
            await new Promise(r => setTimeout(r, GEN_STAGES[i].duration));
        }
        setDone(true);
        updateSession(brdId, { status: 'complete' });
    };

    return (
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Generate BRD</h2>
                <p className="text-sm text-zinc-500">Beacon will orchestrate multiple AI models to extract, classify, and synthesize your requirements into a complete Business Requirements Document.</p>
            </div>

            {/* BRD preview card */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                        <FileText size={15} className="text-zinc-300" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">{brdName || 'My BRD Session'}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">7 sections · Executive Summary, Business Objectives, Functional Requirements, Non-Functional Requirements, Constraints, Assumptions, Appendix</p>
                    </div>
                </div>
            </div>

            {/* Generation pipeline */}
            {started && (
                <div className="space-y-2">
                    {GEN_STAGES.map((stage, i) => {
                        const Icon = stage.icon;
                        const isActive = i === stageIdx;
                        const isDone = i < stageIdx || done;
                        return (
                            <motion.div key={stage.label}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: i <= stageIdx || done ? 1 : 0.3, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                                style={{
                                    background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.015)',
                                    border: `1px solid ${isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'}`,
                                }}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-emerald-500/15 border border-emerald-500/25' : isActive ? 'bg-white/8 border border-white/15' : 'bg-white/3 border border-white/7'}`}>
                                    {isDone ? <Check size={12} className="text-emerald-400" /> :
                                        isActive ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={12} className="text-white" /></motion.div> :
                                            <Icon size={12} className="text-zinc-700" />}
                                </div>
                                <span className={`text-sm flex-1 ${isDone ? 'text-zinc-400' : isActive ? 'text-white font-medium' : 'text-zinc-700'}`}>{stage.label}</span>
                                {isActive && <span className="text-[10px] font-mono text-zinc-600">running…</span>}
                                {isDone && <span className="text-[10px] font-mono text-emerald-600">done</span>}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Done state */}
            <AnimatePresence>
                {done && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl text-center space-y-3"
                        style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.18)' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto bg-emerald-500/15 border border-emerald-500/25">
                            <Check size={18} className="text-emerald-400" />
                        </div>
                        <p className="text-sm font-semibold text-white">BRD generated successfully</p>
                        <p className="text-xs text-zinc-500">7 sections · 2,840 words · 183 signals attributed</p>
                        <button onClick={() => router.push('/brd')}
                            className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-all shadow-[0_2px_16px_rgba(255,255,255,0.12)]">
                            Open BRD Draft <ArrowRight size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Start button */}
            {!started && (
                <div className="flex items-center gap-3 pt-2">
                    <button onClick={runGeneration}
                        className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.14)]">
                        <Zap size={14} /> Start Generation
                    </button>
                    <p className="text-xs text-zinc-600">Usually takes 30–60 seconds</p>
                </div>
            )}
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NewBRDPage() {
    const params = useSearchParams();
    const router = useRouter();
    const brdName = params.get('name') ?? 'New BRD Session';
    const brdId = params.get('id') ?? 'new';

    const [step, setStep] = useState(0);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [channels, setChannels] = useState<string[]>([]);

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
            {/* Top bar */}
            <div className="border-b border-white/6 px-6 py-4"
                style={{ background: 'rgba(6,6,6,0.92)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 40 }}>
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard">
                            <button className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition-colors text-sm">
                                <ArrowLeft size={14} /> Dashboard
                            </button>
                        </Link>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-white/8 border border-white/12 flex items-center justify-center">
                                <FileText size={10} className="text-zinc-300" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 truncate max-w-[200px]">{brdName}</span>
                            <span className="font-mono text-[10px] text-zinc-700">#{brdId}</span>
                        </div>
                    </div>
                    <StepBar current={step} />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-6 py-12">
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <Step1Upload key="step1" files={files} setFiles={setFiles} onNext={() => setStep(1)} />
                    )}
                    {step === 1 && (
                        <Step2Connect key="step2" selected={channels} setSelected={setChannels} onNext={() => setStep(2)} onBack={() => setStep(0)} />
                    )}
                    {step === 2 && (
                        <Step3Generate key="step3" brdId={brdId} brdName={brdName} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
