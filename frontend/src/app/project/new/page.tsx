"use client";

import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
    const router = useRouter();
    const addProject = useProjectStore((state) => state.addProject);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newProject = {
            id: Date.now().toString(),
            name,
            description,
            status: 'draft' as const,
            lastModified: new Date(),
            sourceCount: 0
        };

        addProject(newProject);
        router.push(`/project/${newProject.id}`);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Dashboard
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-zinc-100">Create New Project</h1>
                <p className="text-zinc-400 mt-1">Start a new Business Requirements Document</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Project Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-950 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="e.g., Customer Portal Redesign"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 bg-zinc-950 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="Brief description of the project..."
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Create Project
                    </button>
                    <Link href="/dashboard">
                        <button
                            type="button"
                            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
