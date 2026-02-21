// @ts-nocheck
"use client";

import { useBRDStore } from '@/store/useBRDStore';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function ConflictsPage() {
    const { conflicts, resolveConflict } = useBRDStore();
    const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

    const severityColors = {
        high: 'border-red-500/20 bg-red-500/10',
        medium: 'border-yellow-500/20 bg-yellow-500/10',
        low: 'border-blue-500/20 bg-blue-500/10'
    };

    const severityText = {
        high: 'text-red-400',
        medium: 'text-yellow-400',
        low: 'text-blue-400'
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-zinc-100">Requirement Conflicts</h1>
                <p className="text-zinc-400 mt-1">
                    Detected conflicts across different data sources
                </p>
            </div>

            {/* Summary Banner */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <p className="text-zinc-400 text-sm">Total Conflicts</p>
                        <p className="text-3xl font-semibold text-zinc-100 mt-1">{conflicts.length}</p>
                    </div>
                    <div>
                        <p className="text-zinc-400 text-sm">Unresolved</p>
                        <p className="text-3xl font-semibold text-red-400 mt-1">{unresolvedConflicts.length}</p>
                    </div>
                    <div>
                        <p className="text-zinc-400 text-sm">Resolved</p>
                        <p className="text-3xl font-semibold text-green-400 mt-1">
                            {conflicts.length - unresolvedConflicts.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conflict List */}
            <div className="space-y-4">
                {conflicts.map((conflict) => (
                    <div
                        key={conflict.id}
                        className={`border rounded-xl p-6 ${severityColors[conflict.severity]} ${conflict.resolved ? 'opacity-50' : ''
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={20} className={severityText[conflict.severity]} />
                                <span className={`text-sm font-semibold uppercase ${severityText[conflict.severity]}`}>
                                    {conflict.severity} Severity
                                </span>
                            </div>
                            {conflict.resolved ? (
                                <div className="flex items-center gap-2 text-green-400 text-sm">
                                    <CheckCircle2 size={16} />
                                    Resolved
                                </div>
                            ) : (
                                <button
                                    onClick={() => resolveConflict(conflict.id)}
                                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Mark Resolved
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                                <p className="text-zinc-400 text-xs mb-2">Requirement A</p>
                                <p className="text-zinc-100">{conflict.requirement1}</p>
                                <p className="text-cyan-400 text-sm mt-2">Source: {conflict.source1}</p>
                            </div>

                            <div className="flex items-center justify-center">
                                <XCircle size={20} className="text-red-400" />
                            </div>

                            <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                                <p className="text-zinc-400 text-xs mb-2">Requirement B</p>
                                <p className="text-zinc-100">{conflict.requirement2}</p>
                                <p className="text-cyan-400 text-sm mt-2">Source: {conflict.source2}</p>
                            </div>
                        </div>

                        {!conflict.resolved && (
                            <div className="mt-4 p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                                <p className="text-zinc-400 text-sm">
                                    💡 <strong>Recommendation:</strong> Schedule a stakeholder alignment meeting to clarify the final requirement.
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
