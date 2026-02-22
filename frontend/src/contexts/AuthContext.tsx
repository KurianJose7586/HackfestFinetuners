'use client';

/**
 * AuthContext.tsx
 * Wraps the app with Firebase Auth state.
 * Subscribes to onAuthStateChanged once — keeps auth state globally in sync.
 * Use the `useAuth()` hook to access user/loading in any client component.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    AuthError,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser } from '@/lib/firestore/users';
import { useAuthStore } from '@/store/useAuthStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useRouter, usePathname } from 'next/navigation';



// ── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    clearError: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Error message mapper ──────────────────────────────────────────────────────

function mapFirebaseError(error: AuthError): string {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Check your internet connection.';
        case 'auth/popup-closed-by-user':
            return 'Sign in cancelled.';
        default:
            return 'Something went wrong. Please try again.';
    }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true); // true until first auth check completes
    const [error, setError] = useState<string | null>(null);
    const syncFromFirebase = useAuthStore((s) => s._syncFromFirebase);
    const initSessions = useSessionStore((s) => s.initSessions);
    const router = useRouter();
    const pathname = usePathname();

    // Helper: clears the server-side firebase-session cookie
    const clearSessionCookie = () =>
        fetch('/api/auth/session', { method: 'DELETE' }).catch(() => { });

    useEffect(() => {
        // Subscribe to Firebase auth state — handles token refresh & persistence automatically
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
            // Keep Zustand auth store in sync
            syncFromFirebase(
                firebaseUser
                    ? {
                        uid: firebaseUser.uid,
                        name: firebaseUser.displayName ?? firebaseUser.email ?? 'User',
                        email: firebaseUser.email ?? '',
                        photoURL: firebaseUser.photoURL ?? undefined,
                    }
                    : null
            );
            if (firebaseUser) {
                // Load all boards from Firestore for this user
                initSessions(firebaseUser.uid).catch(console.error);
            } else {
                // No Firebase user → ensure the session cookie is cleared
                // so middleware does not redirect to /dashboard incorrectly
                clearSessionCookie().then(() => {
                    // If we are on a protected route but auth says no user, 
                    // redirect to login immediately to stop "black dashboard" states.
                    const isProtectedRoute = ['/dashboard', '/brd', '/settings', '/signals', '/ingestion', '/invite'].some(
                        prefix => pathname.startsWith(prefix)
                    );
                    if (isProtectedRoute) {
                        router.push('/login');
                    }
                });
            }
        });
        return unsubscribe; // cleanup on unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncFromFirebase, initSessions, pathname, router]);



    const login = async (email: string, password: string) => {
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            const msg = mapFirebaseError(err as AuthError);
            setError(msg);
            throw new Error(msg);
        }
    };

    const signup = async (email: string, password: string, name: string) => {
        setError(null);
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            // Set display name on the Firebase Auth profile
            await updateProfile(credential.user, { displayName: name });
            // Create Firestore user document
            await createUser(credential.user.uid, {
                name,
                email,
                photoURL: credential.user.photoURL ?? '',
            });
        } catch (err) {
            const msg = mapFirebaseError(err as AuthError);
            setError(msg);
            throw new Error(msg);
        }
    };

    const loginWithGoogle = async () => {
        setError(null);
        try {
            const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user document exists in Firestore, if not create it
            const { getUser, createUser } = await import('@/lib/firestore/users');
            const existingUser = await getUser(user.uid);
            if (!existingUser) {
                await createUser(user.uid, {
                    name: user.displayName || 'Google User',
                    email: user.email || '',
                    photoURL: user.photoURL || '',
                });
            }
        } catch (err) {
            const msg = mapFirebaseError(err as AuthError);
            setError(msg);
            throw new Error(msg);
        }
    };

    const logout = async () => {
        setError(null);
        await signOut(auth);
        // Explicitly clear the cookie so middleware stops redirecting immediately
        await clearSessionCookie();
    };

    const resetPassword = async (email: string) => {
        setError(null);
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (err) {
            const msg = mapFirebaseError(err as AuthError);
            setError(msg);
            throw new Error(msg);
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{ user, loading, error, login, signup, loginWithGoogle, logout, resetPassword, clearError }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used inside <AuthProvider>');
    }
    return ctx;
}
