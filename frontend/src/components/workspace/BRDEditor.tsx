// @ts-nocheck
"use client";

import { useBRDStore } from '@/store/useBRDStore';
import { useState } from 'react';
import { Bold, Italic, List, Download, MessageSquare, Link2, Sparkles } from 'lucide-react';

export default function BRDEditor({ projectId }: { projectId: string }) {
    const { sections, updateSection, addCitation, generateSection } = useBRDStore();
    const [activeSectionId, setActiveSectionId] = useState('exec-summary');
    const [activeRightTab, setActiveRightTab] = useState<'citations' | 'ai'>('citations');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const activeSection = sections.find((s) => s.id === activeSectionId);

    const handleGenerate = async () => {
        if (!activeSectionId) return;
        setIsGenerating(true);
        await generateSection(activeSectionId);
        setIsGenerating(false);
    };

    const handleAIEdit = () => {
        // Simulate AI editing
        setAiPrompt('');
        alert(`AI would process: "${aiPrompt}"`);
    };

    return (
        <div className="grid grid-cols-12 gap-6">
            {/* Left: Document Outline */}
            <div className="col-span-3 bg-zinc-900/50 border border-white/5 rounded-xl p-4 h-[700px] overflow-y-auto">
                <h3 className="font-semibold text-zinc-100 mb-4">Document Outline</h3>
                <div className="space-y-1">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSectionId(section.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeSectionId === section.id
                                ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500'
                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                                }`}
                        >
                            {section.title}
                            {section.content && (
                                <div className="w-2 h-2 bg-green-500 rounded-full ml-auto mt-1" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Center: Editor */}
            <div className="col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-100">{activeSection?.title}</h3>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                        <Sparkles size={14} />
                        {isGenerating ? 'Generating...' : 'AI Generate'}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-white/5 rounded-lg">
                    <button className="p-2 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-zinc-100">
                        <Bold size={16} />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-zinc-100">
                        <Italic size={16} />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-zinc-100">
                        <List size={16} />
                    </button>
                    <div className="flex-1" />
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-sm transition-colors">
                        <Download size={14} />
                        Export PDF
                    </button>
                </div>

                {/* Content Editor */}
                <textarea
                    value={activeSection?.content || ''}
                    onChange={(e) => activeSectionId && updateSection(activeSectionId, e.target.value)}
                    placeholder={`Write ${activeSection?.title} here... or click AI Generate`}
                    className="w-full h-[580px] bg-zinc-900/50 border border-white/5 rounded-xl p-6 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-sans resize-none"
                />
            </div>

            {/* Right: Citations & AI */}
            <div className="col-span-3 space-y-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveRightTab('citations')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeRightTab === 'citations'
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'text-zinc-400 hover:text-zinc-100'
                            }`}
                    >
                        Citations
                    </button>
                    <button
                        onClick={() => setActiveRightTab('ai')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeRightTab === 'ai'
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'text-zinc-400 hover:text-zinc-100'
                            }`}
                    >
                        Ask AI
                    </button>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 h-[650px] overflow-y-auto">
                    {activeRightTab === 'citations' ? (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-zinc-100 mb-3">Source Evidence</h4>
                            {activeSection?.citations && activeSection.citations.length > 0 ? (
                                activeSection.citations.map((citation, index) => (
                                    <div key={index} className="p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                                        <div className="flex items-start gap-2">
                                            <Link2 size={14} className="text-cyan-400 mt-0.5" />
                                            <p className="text-xs text-zinc-300">{citation}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-zinc-600 text-sm">No citations yet</p>
                                    <p className="text-zinc-700 text-xs mt-2">Add source links to support requirements</p>
                                </div>
                            )}

                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <p className="text-xs text-zinc-400">Sample Citations:</p>
                                {[
                                    'Slack #general - Dec 15, 10:30 AM',
                                    'Email from john@company.com',
                                    'Product Meeting Notes - Week 3'
                                ].map((sample, index) => (
                                    <button
                                        key={index}
                                        onClick={() => activeSectionId && addCitation(activeSectionId, sample)}
                                        className="w-full text-left p-2 bg-zinc-950/50 hover:bg-white/5 rounded border border-white/5 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
                                    >
                                        + {sample}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-zinc-100">AI Assistant</h4>
                            <p className="text-xs text-zinc-400">Ask the AI to edit or improve this section</p>

                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g., Make this more concise"
                                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                    onClick={handleAIEdit}
                                    disabled={!aiPrompt}
                                    className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <MessageSquare size={14} className="inline mr-2" />
                                    Send
                                </button>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <p className="text-xs text-zinc-400">Quick Actions:</p>
                                {[
                                    'Expand this section',
                                    'Add more technical details',
                                    'Simplify language',
                                    'Add success criteria'
                                ].map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setAiPrompt(action)}
                                        className="w-full text-left p-2 bg-zinc-950/50 hover:bg-white/5 rounded border border-white/5 text-xs text-zinc-400 hover:text-purple-400 transition-colors"
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
