import { create } from 'zustand';

export type AgentType = 'ingestion' | 'structure' | 'validation' | 'writing';
export type AgentStatusType = 'idle' | 'working' | 'done';
export type IngestionStatusType = 'idle' | 'processing' | 'complete';

export interface Project {
    id: string;
    name: string;
    status: 'draft' | 'in-progress' | 'completed';
    lastModified: Date;
    sourceCount: number;
    description?: string;
}

export interface Source {
    id: string;
    type: 'slack' | 'drive' | 'file';
    name: string;
    enabled: boolean;
}

interface ProjectStore {
    // State
    projects: Project[];
    currentProject: Project | null;
    ingestionStatus: IngestionStatusType;
    agentStatus: Record<AgentType, AgentStatusType>;
    sources: Source[];

    // Actions
    setProjects: (projects: Project[]) => void;
    addProject: (project: Project) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    setCurrentProject: (project: Project | null) => void;

    addSource: (source: Source) => void;
    toggleSource: (id: string) => void;

    startIngestion: () => void;
    setIngestionStatus: (status: IngestionStatusType) => void;

    updateAgentStatus: (agent: AgentType, status: AgentStatusType) => void;
    resetAgentStatus: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
    // Initial State
    projects: [
        {
            id: '1',
            name: 'Project Alpha',
            status: 'in-progress',
            lastModified: new Date('2026-02-10T10:00:00'),
            sourceCount: 15,
            description: 'Main authentication and authorization system'
        },
        {
            id: '2',
            name: 'Marketing Q3 Strategy',
            status: 'draft',
            lastModified: new Date('2026-02-09T14:30:00'),
            sourceCount: 8,
            description: 'Q3 marketing automation requirements'
        },
        {
            id: '3',
            name: 'Legacy Migration',
            status: 'completed',
            lastModified: new Date('2026-02-05T09:00:00'),
            sourceCount: 42,
            description: 'Database migration documentation'
        }
    ],
    currentProject: null,
    ingestionStatus: 'idle',
    agentStatus: {
        ingestion: 'idle',
        structure: 'idle',
        validation: 'idle',
        writing: 'idle'
    },
    sources: [
        { id: '1', type: 'slack', name: '#project-alpha', enabled: false },
        { id: '2', type: 'slack', name: '#general', enabled: false },
        { id: '3', type: 'drive', name: 'Project Docs', enabled: false }
    ],

    // Actions
    setProjects: (projects) => set({ projects }),

    addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
    })),

    updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
        )
    })),

    deleteProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject
    })),

    setCurrentProject: (project) => set({ currentProject: project }),

    addSource: (source) => set((state) => ({
        sources: [...state.sources, source]
    })),

    toggleSource: (id) => set((state) => ({
        sources: state.sources.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
        )
    })),

    startIngestion: () => set({ ingestionStatus: 'processing' }),
    setIngestionStatus: (status) => set({ ingestionStatus: status }),

    updateAgentStatus: (agent, status) => set((state) => ({
        agentStatus: { ...state.agentStatus, [agent]: status }
    })),

    resetAgentStatus: () => set({
        agentStatus: {
            ingestion: 'idle',
            structure: 'idle',
            validation: 'idle',
            writing: 'idle'
        }
    })
}));
