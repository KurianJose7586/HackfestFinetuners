"use client";

import { useState } from 'react';
import { Zap, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

type AgentType = 'ingestion' | 'structure' | 'validation' | 'writing';
type AgentStatus = 'idle' | 'working' | 'done';

const agents = [
    { id: 'ingestion' as AgentType, name: 'Ingestion Agent', description: 'Collects and filters raw data', icon: '📥' },
    { id: 'structure' as AgentType, name: 'Structure Agent', description: 'Organizes data into categories', icon: '🗂️' },
    { id: ' validation' as AgentType, name: 'Validation Agent', description: 'Checks for conflicts & completeness', icon: '✓' },
    { id: 'writing' as AgentType, name: 'Writing Agent', description: 'Generates BRD content', icon: '✍️' }
];

export default function AgentOrchestrator({ projectId }: { projectId: string }) {
    const [agentStatuses, setAgentStatuses] = useState<Record<AgentType, AgentStatus>>({
        ingestion: 'idle',
        structure: 'idle',
        validation: 'idle',
        writing: 'idle'
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [thoughtProcess, setThoughtProcess] = useState<string[]>([]);

    const startGeneration = async () => {
        setIsGenerating(true);
        setThoughtProcess([]);

        const workflow = [
            {
                agent: 'ingestion' as AgentType, thoughts: [
                    'Analyzing connected data sources...',
                    'Found 245 Slack messages, 42 emails, 3 meeting transcripts',
                    'Applying noise filter to remove non-project content...',
                    'Extracted 35 relevant data points'
                ]
            },
            {
                agent: 'structure' as AgentType, thoughts: [
                    'Categorizing requirements by type...',
                    'Identified: 12 functional, 8 non-functional requirements',
                    'Grouping stakeholder inputs by theme',
                    'Mapped timeline milestones from meeting notes'
                ]
            },
            {
                agent: 'validation' as AgentType, thoughts: [
                    'Checking for requirement conflicts...',
                    'Found 2 medium-severity conflicts',
                    'Verifying completeness against BRD template...',
                    'All sections have supporting data'
                ]
            },
            {
                agent: 'writing' as AgentType, thoughts: [
                    'Generating Executive Summary...',
                    'Writing Functional Requirements section...',
                    'Adding citations to source data...',
                    'BRD generation complete!'
                ]
            }
        ];

        for (const step of workflow) {
            setAgentStatuses((prev) => ({ ...prev, [step.agent]: 'working' }));

            for (const thought of step.thoughts) {
                await new Promise((resolve) => setTimeout(resolve, 1200));
                setThoughtProcess((prev) => [...prev, `[${step.agent.toUpperCase()}] ${thought}`]);
            }

            setAgentStatuses((prev) => ({ ...prev, [step.agent]: 'done' }));
            await new Promise((resolve) => setTimeout(resolve, 800));
        }

        setIsGenerating(false);
    };

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-100">AI Agent Workflow</h3>
                    <p className="text-sm text-zinc-400 mt-1">Multi-agent system for BRD generation</p>
                </div>
                <button
                    onClick={startGeneration}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white rounded-lg font-medium shadow-lg shadow-cyan-500/20 transition-all"
                >
                    <Zap size={18} />
                    {isGenerating ? 'Generating...' : 'Start BRD Generation'}
                </button>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-4 gap-4">
                {agents.map((agent, index) => {
                    const status = agentStatuses[agent.id];
                    const isActive = status === 'working';

                    return (
                        <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-zinc-900/50 border rounded-xl p-6 transition-all ${isActive ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : status === 'done' ? 'border-green-500/50' : 'border-white/5'
                                }`}
                        >
                            <div className="text-3xl mb-3">{agent.icon}</div>
                            <h4 className="font-semibold text-zinc-100 mb-1">{agent.name}</h4>
                            <p className="text-xs text-zinc-400 mb-4">{agent.description}</p>

                            <div className="flex items-center justify-between">
                                {status === 'idle' && <span className="text-xs text-zinc-500">Idle</span>}
                                {status === 'working' && (
                                    <div className="flex items-center gap-2 text-cyan-400 text-xs">
                                        <Loader2 size={12} className="animate-spin" />
                                        Working
                                    </div>
                                )}
                                {status === 'done' && (
                                    <div className="flex items-center gap-2 text-green-400 text-xs">
                                        <CheckCircle2 size={12} />
                                        Complete
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Thought Process Feed */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Eye size={18} className="text-purple-400" />
                    <h4 className="font-semibold text-zinc-100">Agent Thought Process</h4>
                </div>

                <div className="bg-black/50 rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-sm">
                    {thoughtProcess.length === 0 ? (
                        <p className="text-zinc-600 text-center py-12">Agent thoughts will appear here during generation...</p>
                    ) : (
                        <div className="space-y-2">
                            {thoughtProcess.map((thought, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-purple-400"
                                >
                                    {thought}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
