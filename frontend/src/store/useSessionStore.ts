/**
 * useSessionStore.ts
 * Persists the active session ID + session list to localStorage (Problem 6 fix).
 * Creates real sessions via the FastAPI backend.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSession, type Session } from '@/lib/apiClient';

export interface BRDSession {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'complete' | 'draft';
    createdAt: string;
    sections?: number;
    signals?: number;
    words?: number;
}

interface SessionStore {
    sessions: BRDSession[];
    activeSessionId: string | null;
    loading: boolean;
    error: string | null;
    /** Create a new session in the backend, add it to the local list, and set as active. */
    addSession: (name: string, description: string) => Promise<string>;
    setActive: (id: string) => void;
    updateSession: (id: string, patch: Partial<Omit<BRDSession, 'id'>>) => void;
    removeSession: (id: string) => void;
}

export const useSessionStore = create<SessionStore>()(
    persist(
        (set, get) => ({
            sessions: [],
            activeSessionId: null,
            loading: false,
            error: null,

            addSession: async (name, description) => {
                set({ loading: true, error: null });
                try {
                    const res: Session = await createSession();
                    const newSession: BRDSession = {
                        id: res.session_id,
                        name,
                        description,
                        status: 'active',
                        createdAt: new Date().toISOString(),
                    };
                    set((state) => ({
                        sessions: [newSession, ...state.sessions],
                        activeSessionId: newSession.id,
                    }));
                    return newSession.id;
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Failed to create session';
                    set({ error: msg });
                    throw new Error(msg);
                } finally {
                    set({ loading: false });
                }
            },

            setActive: (id) => set({ activeSessionId: id }),

            updateSession: (id, patch) =>
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === id ? { ...s, ...patch } : s
                    ),
                })),

            removeSession: (id) => {
                const state = get();
                set({
                    sessions: state.sessions.filter((s) => s.id !== id),
                    activeSessionId:
                        state.activeSessionId === id
                            ? (state.sessions.find((s) => s.id !== id)?.id ?? null)
                            : state.activeSessionId,
                });
            },
        }),
        {
            name: 'beacon-sessions', // localStorage key — survives page refresh
            storage: createJSONStorage(() => localStorage),
            // Self-healing: Sanitise data on load to prevent React "object as child" crashes
            onRehydrateStorage: (state) => {
                return (rehydratedState) => {
                    if (rehydratedState && rehydratedState.sessions) {
                        rehydratedState.sessions = rehydratedState.sessions.map((s: any) => {
                            // If name is an object (corrupted data), extract string or fallback
                            if (typeof s.name === 'object' && s.name !== null) {
                                return { ...s, name: s.name.name || 'Recovered Session' };
                            }
                            return s;
                        });
                    }
                };
            },
        }
    )
);
