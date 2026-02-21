"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { ArrowLeft, Loader2, Zap } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await login(email, password);

        if (success) {
            router.push('/dashboard');
        } else {
            setError('Invalid credentials. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-6"
            style={{ background: 'var(--bg-base)' }}
        >
            <div className="w-full max-w-md space-y-8">

                {/* Back link */}
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
                        <span className="text-sm font-bold text-white tracking-tight">Beacon</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Sign in</h1>
                    <p className="text-zinc-500 text-sm">Continue to your BRD workspace.</p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 p-7 rounded-2xl border border-white/8"
                    style={{ background: 'rgba(14,14,14,0.95)' }}
                >
                    {error && (
                        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-300">
                            Email address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="glass-input w-full px-4 py-3 text-sm"
                            placeholder="you@company.com"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-300">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="glass-input w-full px-4 py-3 text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,255,255,0.10)] hover:shadow-[0_4px_28px_rgba(255,255,255,0.18)]"
                        style={{ marginTop: '8px' }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Signing in…
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    <p className="text-center text-xs text-zinc-600 pt-1">
                        Demo mode — any email + password works
                    </p>
                </form>
            </div>
        </div>
    );
}
