
"use client";

import AgentVisualizer from "@/components/features/AgentVisualizer";

export default function AgentsPage() {
    return (
        <div className="h-full flex flex-col gap-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gradient mb-2">Agent Orchestration</h1>
                    <p className="text-gray-400">Monitoring real-time cognitive processes.</p>
                </div>
                <div className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30 animate-pulse">
                    PROCESSING BATCH #402
                </div>
            </div>

            <AgentVisualizer />
        </div>
    );
}
