import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type IntegrationType = 'gmail' | 'slack' | 'fireflies' | 'teams';

export interface Integration {
    id: string;
    type: IntegrationType;
    name: string;
    connected: boolean;
    lastSync?: Date;
    config?: {
        email?: string;
        workspace?: string;
        channels?: string[];
        autoSync?: boolean;
    };
}

interface IntegrationStore {
    integrations: Integration[];
    addIntegration: (integration: Integration) => void;
    updateIntegration: (id: string, updates: Partial<Integration>) => void;
    toggleConnection: (id: string) => void;
    syncIntegration: (id: string) => Promise<void>;
}

export const useIntegrationStore = create<IntegrationStore>()(
    persist(
        (set, get) => ({
            integrations: [
                {
                    id: '1',
                    type: 'gmail',
                    name: 'Gmail Account',
                    connected: false,
                    config: { autoSync: true }
                },
                {
                    id: '2',
                    type: 'slack',
                    name: 'Slack Workspace',
                    connected: false,
                    config: { workspace: '', channels: [], autoSync: true }
                },
                {
                    id: '3',
                    type: 'fireflies',
                    name: 'Fireflies.ai',
                    connected: false,
                    config: { autoSync: true }
                },
                {
                    id: '4',
                    type: 'teams',
                    name: 'Microsoft Teams',
                    connected: false,
                    config: { autoSync: false }
                }
            ],

            addIntegration: (integration) =>
                set((state) => ({
                    integrations: [...state.integrations, integration]
                })),

            updateIntegration: (id, updates) =>
                set((state) => ({
                    integrations: state.integrations.map((i) =>
                        i.id === id ? { ...i, ...updates } : i
                    )
                })),

            toggleConnection: (id) =>
                set((state) => ({
                    integrations: state.integrations.map((i) =>
                        i.id === id
                            ? { ...i, connected: !i.connected, lastSync: !i.connected ? new Date() : undefined }
                            : i
                    )
                })),

            syncIntegration: async (id) => {
                // Simulate sync
                const integration = get().integrations.find((i) => i.id === id);
                if (integration?.connected) {
                    set((state) => ({
                        integrations: state.integrations.map((i) =>
                            i.id === id ? { ...i, lastSync: new Date() } : i
                        )
                    }));
                }
            }
        }),
        {
            name: 'integration-storage',
            storage: createJSONStorage(() => localStorage)
        }
    )
);
