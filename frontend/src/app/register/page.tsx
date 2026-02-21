"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { ArrowLeft, Loader2, Zap, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) { setError('Please enter your name.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }

        setLoading(true);
        // Simulate account creation — reuse login to set auth state
        await new Promise(r => setTimeout(r, 600));
        await login(email, password);
        router.push('/dashboard');
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-6 py-12"
            style={{ background: 'var(--bg-base)' }}
        >
            <div className="w-full max-w-md space-y-8">

                {/* Back */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm"
                >
                    <ArrowLeft size={14} /> Back to home
                </Link>

                {/* Header */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                            <Zap size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-bold text-white tracking-tight">
                            Beacon
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Create account</h1>
                    <p className="text-zinc-500 text-sm">
                        Get started — your first BRD session is free.
                    </p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 p-7 rounded-2xl border border-white/8"
                    style={{ background: 'rgba(14,14,14,0.96)' }}
                >
                    {error && (
                        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-300">Full name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="glass-input w-full px-4 py-3 text-sm"
                            placeholder="Jane Smith"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-300">Work email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="glass-input w-full px-4 py-3 text-sm"
                            placeholder="you@company.com"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-300">Password</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="glass-input w-full px-4 py-3 pr-10 text-sm"
                                placeholder="Min. 6 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                            >
                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-300">Confirm password</label>
                        <input
                            type="password"
                            required
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="glass-input w-full px-4 py-3 text-sm"
                            placeholder="Re-enter password"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,255,255,0.10)] hover:shadow-[0_4px_28px_rgba(255,255,255,0.18)]"
                        style={{ marginTop: '8px' }}
                    >
                        {loading ? (
                            <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                        ) : (
                            'Create Account'
                        )}
                    </button>

                    <p className="text-center text-xs text-zinc-600 pt-1">
                        Already have an account?{' '}
                        <Link href="/login" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
