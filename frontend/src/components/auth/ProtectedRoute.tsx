"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (hasHydrated) {
            if (!isAuthenticated) {
                // Redirect unauthenticated users to home page
                router.push('/');
            } else {
                setIsChecking(false);
            }
        }
    }, [isAuthenticated, hasHydrated, router]);

    // Show loading while hydrating or checking auth
    if (!hasHydrated || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
                <div className="text-center">
                    <Loader2 size={28} className="text-zinc-400 animate-spin mx-auto mb-3" />
                    <p className="text-zinc-600 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
