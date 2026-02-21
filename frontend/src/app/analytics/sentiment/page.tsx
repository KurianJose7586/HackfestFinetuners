"use client";

import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';

const stakeholders = [
    { name: 'Engineering Team', sentiment: 75, trend: 'up', concerns: ['Timeline', 'Technical Debt'] },
    { name: 'Product Team', sentiment: 85, trend: 'up', concerns: [] },
    { name: 'Executive Leadership', sentiment: 60, trend: 'down', concerns: ['Budget', 'ROI'] },
    { name: 'Sales Team', sentiment: 70, trend: 'neutral', concerns: ['Feature Completeness'] }
];

const sentimentData = [
    { topic: 'Timeline Feasibility', positive: 45, neutral: 30, negative: 25 },
    { topic: 'Budget Allocation', positive: 55, neutral: 25, negative: 20 },
    { topic: 'Technical Approach', positive: 70, neutral: 20, negative: 10 },
    { topic: 'Resource Availability', positive: 50, neutral: 35, negative: 15 }
];

export default function SentimentPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-zinc-100">Stakeholder Sentiment Analysis</h1>
                <p className="text-zinc-400 mt-1">
                    AI-powered analysis of stakeholder confidence and concerns
                </p>
            </div>

            {/* Overall Score */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-8 text-center">
                <p className="text-zinc-400 mb-2">Overall Project Confidence</p>
                <div className="flex items-center justify-center gap-3">
                    <span className="text-5xl font-bold text-cyan-400">72%</span>
                    <div className="flex items-center gap-1 text-green-400">
                        <TrendingUp size={20} />
                        <span className="text-sm">+5% this week</span>
                    </div>
                </div>
            </div>

            {/* Stakeholder Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                {stakeholders.map((stakeholder) => {
                    const TrendIcon = stakeholder.trend === 'up' ? TrendingUp : stakeholder.trend === 'down' ? TrendingDown : Minus;
                    const trendColor = stakeholder.trend === 'up' ? 'text-green-400' : stakeholder.trend === 'down' ? 'text-red-400' : 'text-zinc-400';

                    return (
                        <div key={stakeholder.name} className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                        <Users size={20} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-zinc-100">{stakeholder.name}</h3>
                                        <div className={`flex items-center gap-1 text-sm ${trendColor} mt-1`}>
                                            <TrendIcon size={14} />
                                            <span>{stakeholder.trend === 'neutral' ? 'Stable' : stakeholder.trend === 'up' ? 'Improving' : 'Declining'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-cyan-400">{stakeholder.sentiment}%</p>
                                    <p className="text-xs text-zinc-500">Confidence</p>
                                </div>
                            </div>

                            {/* Sentiment Bar */}
                            <div className="mb-4">
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                        style={{ width: `${stakeholder.sentiment}%` }}
                                    />
                                </div>
                            </div>

                            {/* Concerns */}
                            {stakeholder.concerns.length > 0 && (
                                <div>
                                    <p className="text-xs text-zinc-400 mb-2">Primary Concerns:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {stakeholder.concerns.map((concern) => (
                                            <span key={concern} className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded text-xs">
                                                {concern}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Topic Analysis */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Sentiment by Topic</h3>
                <div className="space-y-4">
                    {sentimentData.map((topic) => (
                        <div key={topic.topic}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-zinc-100 text-sm">{topic.topic}</span>
                                <span className="text-zinc-400 text-xs">{topic.positive}% positive</span>
                            </div>
                            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden flex">
                                <div className="bg-green-500" style={{ width: `${topic.positive}%` }} />
                                <div className="bg-zinc-600" style={{ width: `${topic.neutral}%` }} />
                                <div className="bg-red-500" style={{ width: `${topic.negative}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded" />
                        <span className="text-xs text-zinc-400">Positive</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-zinc-600 rounded" />
                        <span className="text-xs text-zinc-400">Neutral</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded" />
                        <span className="text-xs text-zinc-400">Negative</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
