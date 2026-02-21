"use client";

import { CheckCircle2, Circle, GitBranch } from 'lucide-react';

const requirements = [
    { id: 'FR-001', name: 'OAuth Authentication', sources: 3, tests: 5, status: 'complete' },
    { id: 'FR-002', name: 'Real-time Dashboard', sources: 5, tests: 8, status: 'complete' },
    { id: 'FR-003', name: 'API Rate Limiting', sources: 2, tests: 3, status: 'partial' },
    { id: 'NFR-001', name: 'Sub-2s Page Load', sources: 4, tests: 6, status: 'complete' },
    { id: 'NFR-002', name: '99.9% Uptime SLA', sources: 3, tests: 4, status: 'partial' }
];

const sources = ['Slack #general', 'Email Thread', 'Meeting Notes', 'Product Doc', 'Tech Spec'];
const testCases = ['TC-001', 'TC-002', 'TC-003', 'TC-004', 'TC-005', 'TC-006', 'TC-007', 'TC-008'];

export default function TraceabilityPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-zinc-100">Requirement Traceability Matrix</h1>
                <p className="text-zinc-400 mt-1">
                    Track relationships between requirements, sources, and test cases
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Requirements', value: requirements.length, color: 'text-cyan-400' },
                    { label: 'Sources', value: sources.length, color: 'text-purple-400' },
                    { label: 'Test Cases', value: testCases.length, color: 'text-green-400' },
                    { label: 'Coverage', value: '94%', color: 'text-yellow-400' }
                ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                        <p className="text-zinc-400 text-sm">{stat.label}</p>
                        <p className={`text-2xl font-semibold ${stat.color} mt-1`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Matrix */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-zinc-900/80">
                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                                    Requirement
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                                    Sources
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                                    Test Cases
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {requirements.map((req) => (
                                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-4">
                                        <div>
                                            <p className="font-mono text-cyan-400 text-sm">{req.id}</p>
                                            <p className="text-zinc-100 mt-0.5">{req.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 text-sm">
                                            <GitBranch size={12} />
                                            {req.sources} linked
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
                                            {req.tests} tests
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {req.status === 'complete' ? (
                                            <span className="inline-flex items-center gap-1 text-green-400">
                                                <CheckCircle2 size={16} />
                                                <span className="text-sm">Complete</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-yellow-400">
                                                <Circle size={16} />
                                                <span className="text-sm">Partial</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-300 transition-colors">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-100 mb-3">Matrix Legend</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-zinc-400">• Sources: </span>
                        <span className="text-zinc-100">Number of data sources mentioning this requirement</span>
                    </div>
                    <div>
                        <span className="text-zinc-400">• Test Cases: </span>
                        <span className="text-zinc-100">Verification tests mapped to requirement</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
