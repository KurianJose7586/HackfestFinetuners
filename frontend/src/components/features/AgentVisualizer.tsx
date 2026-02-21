
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, PenTool, Search, ShieldCheck, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const AGENTS = [
    { id: "scribe", name: "The Scribe", role: "Ingestion Agent", icon: PenTool, status: "idle", color: "text-blue-400" },
    { id: "analyst", name: "The Analyst", role: "Structure Agent", icon: Search, status: "thinking", color: "text-purple-400" },
    { id: "critic", name: "The Critic", role: "Validation Agent", icon: ShieldCheck, status: "waiting", color: "text-red-400" },
    { id: "architect", name: "The Architect", role: "Final Writer", icon: Cpu, status: "waiting", color: "text-cyan-400" },
];

const THOUGHTS = [
    "Analyst Agent is currently mapping 'User Login' requirements to 'Security Section'...",
    "Analyst Agent detected ambiguity in 'Admin Roles' definition...",
    "Querying Vector Store for similar authentication patterns...",
    "Drafting initial schema for Role-Based Access Control (RBAC)...",
    "Passing context to The Critic for security validation..."
];

export default function AgentVisualizer() {
    const [currentThought, setCurrentThought] = useState("");
    const [thoughtIndex, setThoughtIndex] = useState(0);
    const [activeAgent, setActiveAgent] = useState("analyst");

    // Typewriter effect for thoughts
    useEffect(() => {
        if (thoughtIndex >= THOUGHTS.length) return;

        const thought = THOUGHTS[thoughtIndex];
        let charIndex = 0;

        const typeInterval = setInterval(() => {
            if (charIndex <= thought.length) {
                setCurrentThought(thought.slice(0, charIndex));
                charIndex++;
            } else {
                clearInterval(typeInterval);
                setTimeout(() => {
                    setThoughtIndex(prev => (prev + 1) % THOUGHTS.length); // Loop for demo
                }, 2000);
            }
        }, 50);

        return () => clearInterval(typeInterval);
    }, [thoughtIndex]);

    return (
        <div className="flex flex-col h-full gap-8">
            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {AGENTS.map((agent) => {
                    const isActive = activeAgent === agent.id;
                    const Icon = agent.icon;

                    return (
                        <motion.div
                            key={agent.id}
                            layout
                            animate={{
                                scale: isActive ? 1.05 : 1,
                                borderColor: isActive ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.1)",
                                boxShadow: isActive ? "0 0 20px rgba(168,85,247,0.2)" : "none"
                            }}
                            className={cn(
                                "glass-panel p-6 flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors duration-500",
                                isActive ? "bg-purple-500/10" : "bg-white/5"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                />
                            )}

                            <div className={cn("p-4 rounded-full bg-white/5 mb-4 relative", agent.color)}>
                                <Icon size={32} />
                                {isActive && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-white">{agent.name}</h3>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{agent.role}</p>

                            <div className={cn(
                                "text-xs px-2 py-1 rounded border",
                                isActive ? "text-purple-300 border-purple-500/50 bg-purple-500/20" : "text-gray-500 border-gray-700 bg-gray-900/50"
                            )}>
                                {isActive ? "THINKING..." : agent.status.toUpperCase()}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Central Visualization (Abstract Graph/Connector) */}
            <div className="flex-1 relative flex items-center justify-center min-h-[200px]">
                {/* Connecting Lines (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                    <defs>
                        <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="50%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                    {/* Simplified connecting lines logic for visual feel */}
                    <path d="M 200,50 Q 400,150 600,50" fill="none" stroke="url(#line-gradient)" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" />
                    <circle cx="400" cy="100" r="40" fill="rgba(168,85,247,0.1)" stroke="#a855f7" strokeWidth="1" className="animate-pulse-slow" />
                </svg>

                {/* Thought Process Feed */}
                <div className="relative z-10 w-full max-w-2xl">
                    <div className="glass-panel p-6 border-purple-500/30 min-h-[120px] flex items-center justify-center">
                        <div className="font-mono text-purple-300 text-lg text-center">
                            <span className="opacity-50 mr-2">{">"}</span>
                            {currentThought}
                            <span className="animate-blink ml-1">_</span>
                        </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2 uppercase tracking-widest">Live Reasoning Engine</p>
                </div>
            </div>
        </div>
    );
}
