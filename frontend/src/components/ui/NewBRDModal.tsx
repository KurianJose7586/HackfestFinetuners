// @ts-nocheck
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/store/useSessionStore';

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function NewBRDModal({ open, onClose }: Props) {
    const router = useRouter();
    const addSession = useSessionStore((s) => s.addSession);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);

        let sessionId: string;
        try {
            // Try to create session via the backend API
            sessionId = await addSession(name.trim(), description.trim());
        } catch {
            // Backend offline — create a local-only session so the UI doesn't crash
            sessionId = `sess_${Math.random().toString(36).slice(2, 10)}`;
        }

        onClose();
        const savedName = name.trim();
        setName('');
        setDescription('');
        setLoading(false);
        router.push(`/brd/new?name=${encodeURIComponent(savedName)}&id=${sessionId}`);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-50"
                        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.92, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 16 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="relative w-full max-w-md rounded-2xl p-7 pointer-events-auto"
                            style={{
                                background: 'rgba(10,10,10,0.98)',
                                border: '1px solid rgba(255,255,255,0.10)',
                                boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
                            }}
                            onKeyDown={handleKey}
                        >
                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/6 transition-all"
                            >
                                <X size={14} />
                            </button>

                            {/* Icon + title */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                                    <FileText size={16} className="text-zinc-200" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white leading-tight">New BRD Session</h2>
                                    <p className="text-xs text-zinc-600 mt-0.5">Give your session a name to get started</p>
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-zinc-400">
                                        Session name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCreate()}
                                        className="glass-input w-full px-3.5 py-2.5 text-sm"
                                        placeholder="e.g. Q2 Product BRD, Checkout Redesign…"
                                        maxLength={80}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-zinc-400">
                                        Description <span className="text-zinc-700">(optional)</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={3}
                                        className="glass-input w-full px-3.5 py-2.5 text-sm resize-none"
                                        placeholder="What is this BRD for? Which team, product area, or initiative?"
                                        maxLength={300}
                                    />
                                    <p className="text-right text-[10px] text-zinc-700">{description.length}/300</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 mt-6">
                                <button
                                    onClick={handleCreate}
                                    disabled={!name.trim() || loading}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_2px_16px_rgba(255,255,255,0.10)]"
                                >
                                    {loading
                                        ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
                                        : 'Create & Configure →'
                                    }
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>

                            <p className="text-center text-[10px] text-zinc-700 mt-4">
                                Next: upload sources &amp; connect channels
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
