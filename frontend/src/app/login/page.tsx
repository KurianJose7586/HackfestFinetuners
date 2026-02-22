"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ArrowLeft, Loader2, Zap } from 'lucide-react';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loginWithGoogle } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            // Set session cookie for middleware route protection
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login' }),
            });
            const redirect = searchParams.get('redirect') || '/dashboard';
            router.push(redirect);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login' }),
            });
            const redirect = searchParams.get('redirect') || '/dashboard';
            router.push(redirect);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Google login failed.');
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
                            autoComplete="email"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-zinc-300">
                                Password
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="glass-input w-full px-4 py-3 text-sm"
                            placeholder="••••••••"
                            autoComplete="current-password"
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

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-[#0e0e0e] text-zinc-500">or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-medium text-sm border border-white/10 text-white hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="text-center text-xs text-zinc-600 pt-1">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-zinc-400 hover:text-white transition-colors">
                            Sign up
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
                <Loader2 size={24} className="animate-spin text-zinc-500" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
