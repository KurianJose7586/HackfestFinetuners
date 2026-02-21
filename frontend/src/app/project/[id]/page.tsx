"use client";

import { useProjectStore } from '@/store/useProjectStore';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Database, Bot, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import IngestionPanel from '@/components/workspace/IngestionPanel';
import AgentOrchestrator from '@/components/workspace/AgentOrchestrator';
import BRDEditor from '@/components/workspace/BRDEditor';

const tabs = [
    { id: 'ingestion', label: 'Data Sources', icon: Database },
    { id: 'agents', label: 'Agent Orchestrator', icon: Bot },
    { id: 'editor', label: 'BRD Editor', icon: FileText },
];

export default function ProjectPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const projects = useProjectStore((state) => state.projects);
    const project = projects.find((p) => p.id === id);
    const [activeTab, setActiveTab] = useState('ingestion');

    if (!project) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-zinc-100">{project.name}</h1>
                        {project.description && (
                            <p className="text-zinc-400 text-sm mt-0.5">{project.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/5">
                <div className="flex gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors relative',
                                    isActive
                                        ? 'text-cyan-400'
                                        : 'text-zinc-400 hover:text-zinc-100'
                                )}
                            >
                                <Icon size={16} />
                                {tab.label}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'ingestion' && <IngestionPanel projectId={id} />}
                {activeTab === 'agents' && <AgentOrchestrator projectId={id} />}
                {activeTab === 'editor' && <BRDEditor projectId={id} />}
            </div>
        </div>
    );
}
