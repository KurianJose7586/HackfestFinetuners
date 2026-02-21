import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthStore {
    isAuthenticated: boolean;
    user: { name: string; email: string } | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    updateUser: (name: string, email: string) => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            _hasHydrated: false,

            setHasHydrated: (state) => {
                set({ _hasHydrated: state });
            },

            login: async (email: string, password: string) => {
                // Simulated authentication - in production, call your API
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

                if (email && password) {
                    set({
                        isAuthenticated: true,
                        user: { name: 'Admin User', email }
                    });
                    return true;
                }
                return false;
            },

            logout: () => {
                set({ isAuthenticated: false, user: null });
            },

            updateUser: (name: string, email: string) => {
                set((state) => ({
                    user: state.user ? { name, email } : null
                }));
            }
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            }
        }
    )
);
