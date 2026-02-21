"use client";

import { useAuthStore } from '@/store/useAuthStore';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import { User, Mail, MessageSquare, Video, Users as UsersIcon, FileText, Calendar, CheckCircle2, XCircle, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';

const dataSources = [
    {
        id: 'slack',
        name: 'Slack',
        icon: MessageSquare,
        color: 'from-purple-500 to-pink-500',
        description: 'Connect your Slack workspace to ingest conversations',
        fields: ['Workspace URL', 'Channel Access']
    },
    {
        id: 'gmail',
        name: 'Gmail',
        icon: Mail,
        color: 'from-red-500 to-orange-500',
        description: 'Sync email threads and discussions',
        fields: ['Email Address', 'Filter Rules']
    },
    {
        id: 'teams',
        name: 'MS Teams',
        icon: UsersIcon,
        color: 'from-blue-600 to-indigo-600',
        description: 'Import team conversations and channels',
        fields: ['Team ID', 'Channel Selection']
    },
    {
        id: 'meetings',
        name: 'Meetings (Fireflies)',
        icon: Video,
        color: 'from-blue-500 to-cyan-500',
        description: 'Auto-sync meeting transcriptions',
        fields: ['Account Email', 'Auto-Record']
    },
    {
        id: 'documents',
        name: 'Documents',
        icon: FileText,
        color: 'from-green-500 to-emerald-500',
        description: 'Upload and analyze PDF, DOCX, TXT files',
        fields: ['Storage Location', 'Auto-Scan']
    },
    {
        id: 'calendar',
        name: 'Calendar',
        icon: Calendar,
        color: 'from-yellow-500 to-amber-500',
        description: 'Extract requirements from calendar events',
        fields: ['Calendar Access', 'Event Keywords']
    }
];

export default function ProfilePage() {
    const { user, updateUser } = useAuthStore();
    const { integrations, toggleConnection, updateIntegration } = useIntegrationStore();
    const [editingProfile, setEditingProfile] = useState(false);

    const getIntegrationStatus = (sourceId: string) => {
        const integration = integrations.find(i => i.type === sourceId);
        return integration?.connected || false;
    };

    return (
        <div className="space-y-8">
            {/* User Profile Header */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-8">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-zinc-100">{user?.name || 'User Profile'}</h1>
                            <p className="text-zinc-400 mt-1">{user?.email}</p>
                            <p className="text-cyan-400 text-sm mt-2">Employee • Product Team</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setEditingProfile(!editingProfile)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 transition-colors"
                    >
                        <SettingsIcon size={16} />
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {editingProfile && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditingProfile(false)}>
                    <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-semibold text-zinc-100 mb-4">Edit Profile</h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const name = formData.get('name') as string;
                                const email = formData.get('email') as string;
                                updateUser(name, email);
                                setEditingProfile(false);
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    defaultValue={user?.name}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    defaultValue={user?.email}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingProfile(false)}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Data Ingestion Sources */}
            <div>
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-zinc-100">Data Ingestion Sources</h2>
                    <p className="text-zinc-400 text-sm mt-1">
                        Connect your accounts to automatically collect requirements and feedback
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dataSources.map((source) => {
                        const Icon = source.icon;
                        const integration = integrations.find(i => i.type === source.id);
                        const isConnected = integration?.connected || false;

                        return (
                            <div
                                key={source.id}
                                className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all group"
                            >
                                {/* Icon & Status */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-4 rounded-xl bg-gradient-to-br ${source.color} group-hover:scale-110 transition-transform`}>
                                        <Icon size={28} className="text-white" />
                                    </div>
                                    {isConnected ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                            <CheckCircle2 size={12} className="text-green-400" />
                                            <span className="text-xs font-medium text-green-400">Connected</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-white/5 rounded-full">
                                            <XCircle size={12} className="text-zinc-500" />
                                            <span className="text-xs font-medium text-zinc-500">Inactive</span>
                                        </div>
                                    )}
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-lg font-semibold text-zinc-100 mb-2">{source.name}</h3>
                                <p className="text-sm text-zinc-400 mb-4">{source.description}</p>

                                {/* Configuration Fields */}
                                {isConnected && (
                                    <div className="mb-4 space-y-2">
                                        {source.fields.map((field) => (
                                            <div key={field} className="flex items-center justify-between text-xs">
                                                <span className="text-zinc-500">{field}</span>
                                                <span className="text-cyan-400">✓ Set</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    onClick={() => {
                                        const integrationId = integrations.find(i => i.type === source.id)?.id;
                                        if (integrationId) {
                                            toggleConnection(integrationId);
                                        }
                                    }}
                                    className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${isConnected
                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                        : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                        }`}
                                >
                                    {isConnected ? 'Disconnect' : 'Connect Now'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Ingestion Statistics</h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-cyan-400">
                            {integrations.filter(i => i.connected).length}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">Active Sources</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-purple-400">1,247</p>
                        <p className="text-xs text-zinc-500 mt-1">Items Collected</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-green-400">89%</p>
                        <p className="text-xs text-zinc-500 mt-1">Relevant Content</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-yellow-400">3.2 GB</p>
                        <p className="text-xs text-zinc-500 mt-1">Data Synced</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
