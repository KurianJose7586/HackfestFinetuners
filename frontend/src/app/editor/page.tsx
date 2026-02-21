
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, MessageSquare, Search, ChevronRight, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

const OUTLINE = [
    "1. Executive Summary",
    "2. Scope & Objectives",
    "3. Functional Requirements",
    "3.1 User Authentication",
    "3.2 Role Management",
    "4. Non-Functional Requirements",
    "5. Risks & Mitigation"
];

const MOCK_CONTENT = `
## 3.1 User Authentication

The system shall support Single Sign-On (SSO) integration with Azure AD. Users must be able to log in using their existing corporate credentials.

**Requirement ID:** REQ-AUTH-001
**Priority:** High
**Source:** Tech Specs v2.pdf (Page 4), Slack Thread #security

The system must also support Multi-Factor Authentication (MFA) for all administrative accounts.
`;

export default function BRDEditor() {
    const [activeSection, setActiveSection] = useState("3.1 User Authentication");
    const [rightTab, setRightTab] = useState<"source" | "ai">("source");
    const [chatInput, setChatInput] = useState("");

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            {/* Left Sidebar: Outline */}
            <div className="w-64 glass-panel p-4 flex flex-col overflow-y-auto">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Document Outline</h3>
                <nav className="space-y-1">
                    {OUTLINE.map((item) => (
                        <button
                            key={item}
                            onClick={() => setActiveSection(item)}
                            className={cn(
                                "text-left w-full px-3 py-2 text-sm rounded transition-colors truncate",
                                activeSection === item ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500" : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Center: Document Editor */}
            <motion.div
                layoutId="editor"
                className="flex-1 glass-panel bg-zinc-900/50 p-12 overflow-y-auto font-serif relative"
            >
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

                <div className="max-w-3xl mx-auto space-y-6 text-gray-200 leading-relaxed">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 mb-8 border-b border-white/10 pb-4">
                        Business Requirements Document
                    </h1>

                    <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white max-w-none">
                        <div className="whitespace-pre-wrap">{MOCK_CONTENT}</div>

                        <div className="h-64 border-l-2 border-cyan-500/20 pl-4 italic text-gray-500">
                            [Start typing to generate next section...]
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Right Sidebar: Context & AI */}
            <div className="w-80 glass-panel flex flex-col">
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setRightTab("source")}
                        className={cn("flex-1 py-3 text-sm font-medium border-b-2 transition-colors", rightTab === "source" ? "border-cyan-500 text-cyan-400" : "border-transparent text-gray-500 hover:text-white")}
                    >Source Evidence</button>
                    <button
                        onClick={() => setRightTab("ai")}
                        className={cn("flex-1 py-3 text-sm font-medium border-b-2 transition-colors", rightTab === "ai" ? "border-purple-500 text-purple-400" : "border-transparent text-gray-500 hover:text-white")}
                    >Ask AI</button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    {rightTab === "source" ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-white/5 rounded border border-cyan-500/30 text-xs">
                                <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold">
                                    <MessageSquare size={12} />
                                    <span>Slack: #security</span>
                                </div>
                                <p className="text-gray-300 italic">"Yeah, we definitely need SSO with Azure AD. It's a hard requirement from IT." - @mike.s (Chief Security Officer)</p>
                            </div>

                            <div className="p-3 bg-white/5 rounded border border-white/5 text-xs text-gray-500">
                                <Search size={12} className="mb-1" />
                                <span>Linked to Paragraph 2</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 text-sm text-gray-400 space-y-4">
                                <div className="bg-purple-500/10 p-3 rounded-lg mr-4">
                                    I can help refine this section. For example, should we specify the MFA methods supported?
                                </div>
                            </div>

                            <div className="mt-4 relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Refine this section..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <button className="absolute right-2 top-2 text-purple-400 hover:text-white">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
