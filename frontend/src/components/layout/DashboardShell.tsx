"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import {
    LayoutDashboard,
    Database,
    Zap,
    FileText,
    Download,
    Settings,
    Bell,
    User,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Wifi,
    WifiOff,
    ChevronDown,
    Clock,
    Plus,
    Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import PipelineStepper, { StageInfo } from '@/components/ui/PipelineStepper';
import NewBRDModal from '@/components/ui/NewBRDModal';
import { useSessionStore } from '@/store/useSessionStore';

// ─── Navigation config ────────────────────────────────────────────────────────
const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, stageIndex: -1 },
    { name: 'Sources', href: '/ingestion', icon: Database, stageIndex: 0 },
    { name: 'Signals', href: '/signals', icon: Zap, stageIndex: 1 },
    { name: 'BRD Draft', href: '/brd', icon: FileText, stageIndex: 3 },
    { name: 'Export', href: '/export', icon: Download, stageIndex: 5 },
    { name: 'Settings', href: '/settings', icon: Settings, stageIndex: -1 },
];

// ─── Mock pipeline stages (would come from store in production) ───────────────
const MOCK_STAGES: StageInfo[] = [
    { name: 'Ingestion', status: 'complete', timestamp: '14:02', itemCount: 248 },
    { name: 'Noise Filtering', status: 'complete', timestamp: '14:04', itemCount: 183 },
    { name: 'AKS Storage', status: 'running' },
    { name: 'BRD Generation', status: 'pending' },
    { name: 'Validation', status: 'pending' },
    { name: 'Export', status: 'pending' },
];

function getNavStatus(stageIndex: number, stages: StageInfo[]): 'complete' | 'running' | 'pending' | 'error' | 'none' {
    if (stageIndex < 0) return 'none';
    return stages[stageIndex]?.status ?? 'pending';
}

const STATUS_DOT: Record<string, string> = {
    complete: 'bg-emerald-400',
    running: 'bg-amber-400 animate-pulse',
    pending: 'bg-zinc-600',
    error: 'bg-red-400',
    none: 'hidden',
};

// ─── Session Selector ────────────────────────────────────────────────────────
function SessionSelector({ onNewBRD }: { onNewBRD: () => void }) {
    const [open, setOpen] = useState(false);
    const { sessions, activeSessionId, setActive } = useSessionStore();
    const [hasHydrated, setHasHydrated] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setHasHydrated(true);
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const active = sessions.find(s => s.id === activeSessionId) || sessions[0];

    if (!hasHydrated || !active) return (
        <div className="w-full h-[46px] rounded-lg bg-white/5 animate-pulse" />
    );

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 glass-card rounded-lg group hover:border-white/20 transition-all"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Clock size={12} className="text-zinc-500 flex-shrink-0" />
                    <div className="min-w-0 text-left">
                        <p className="text-xs font-medium text-zinc-200 truncate">{active.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{active.id}</p>
                    </div>
                </div>
                <ChevronDown size={12} className={cn('text-zinc-500 flex-shrink-0 transition-transform', open && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl overflow-hidden"
                        style={{ background: 'rgba(10,10,10,0.99)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                    >
                        {/* Session list */}
                        <div className="p-1.5 max-h-[240px] overflow-y-auto">
                            {sessions.map(sess => (
                                <button
                                    key={sess.id}
                                    onClick={() => { setActive(sess.id); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/6 text-left transition-colors"
                                >
                                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', sess.status === 'active' || sess.status === 'draft' ? 'bg-emerald-400' : 'bg-zinc-600')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-zinc-200 truncate">{sess.name}</p>
                                        <p className="text-[10px] text-zinc-600 font-mono">{sess.id}</p>
                                    </div>
                                    {sess.id === active.id && <Check size={11} className="text-zinc-300 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-white/8 p-1.5">
                            <button
                                onClick={() => { setOpen(false); onNewBRD(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/6 text-left transition-colors group"
                            >
                                <div className="w-5 h-5 rounded-md bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                                    <Plus size={10} className="text-zinc-300" />
                                </div>
                                <span className="text-xs text-zinc-300 font-medium group-hover:text-white transition-colors">New BRD Session…</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [groqConnected] = useState(true);
    const [notifCount] = useState(3);
    const [modalOpen, setModalOpen] = useState(false);
    const stages = MOCK_STAGES;

    const activeStage = stages.find(s => s.status === 'running');

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <>
            <NewBRDModal open={modalOpen} onClose={() => setModalOpen(false)} />
            <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

                {/* ── GS-01 Sidebar ─────────────────────────────────────────────── */}
                <AnimatePresence initial={false}>
                    {sidebarOpen && (
                        <motion.aside
                            key="sidebar"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 240, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                            className="glass-sidebar flex flex-col h-full overflow-hidden z-30 flex-shrink-0"
                        >
                            {/* Logo + Session selector */}
                            <div className="px-5 py-5 border-b border-white/8">
                                <div className="flex items-center gap-2 mb-4">
                                    {/* Logo mark */}
                                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center glow-white">
                                        <Zap size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-sm font-bold text-white leading-none tracking-tight">Beacon</h1>
                                        <p className="text-[10px] text-zinc-400 font-medium">BRD Agent</p>
                                    </div>
                                </div>

                                {/* Session selector */}
                                <SessionSelector onNewBRD={() => setModalOpen(true)} />
                            </div>

                            {/* Navigation */}
                            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                    const Icon = item.icon;
                                    const status = getNavStatus(item.stageIndex, stages);

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative',
                                                isActive
                                                    ? 'nav-item-active'
                                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                                            )}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="sidebar-active"
                                                    className="absolute inset-0 rounded-lg bg-white/6"
                                                    transition={{ type: 'spring', stiffness: 380, damping: 35 }}
                                                />
                                            )}
                                            <Icon size={16} className="relative z-10 flex-shrink-0" />
                                            <span className="relative z-10 flex-1 truncate">{item.name}</span>
                                            {status !== 'none' && (
                                                <span className={cn('w-1.5 h-1.5 rounded-full relative z-10 flex-shrink-0', STATUS_DOT[status])} />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Footer — pipeline indicator + API status */}
                            <div className="px-4 pb-4 space-y-3 border-t border-white/8 pt-3">
                                {/* Active pipeline stage */}
                                {activeStage && (
                                    <div className="px-3 py-2 rounded-lg glass-card">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Active Stage</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse flex-shrink-0" />
                                            <span className="text-xs font-medium text-zinc-300">{activeStage.name}</span>
                                        </div>
                                    </div>
                                )}

                                {/* API Connection */}
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-1.5">
                                        {groqConnected
                                            ? <Wifi size={12} className="text-emerald-400" />
                                            : <WifiOff size={12} className="text-red-400" />}
                                        <span className="text-[10px] text-zinc-500">
                                            Groq {groqConnected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                    <div className={cn('w-1.5 h-1.5 rounded-full', groqConnected ? 'bg-emerald-400' : 'bg-red-400')} />
                                </div>

                                {/* User */}
                                <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg glass-card">
                                    <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                                        <User size={12} className="text-zinc-200" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-zinc-200 truncate">{user?.name ?? 'User'}</p>
                                        <p className="text-[10px] text-zinc-500 truncate">{user?.email ?? ''}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        title="Logout"
                                        className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                        <LogOut size={12} />
                                    </button>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Main area ─────────────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                    {/* ── GS-02 Session Status Bar ───────────────────────────────── */}
                    <header className="glass-topbar h-12 flex items-center justify-between px-3 sm:px-4 flex-shrink-0 z-20 gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            {/* Hamburger */}
                            <button
                                onClick={() => setSidebarOpen(v => !v)}
                                className="p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors flex-shrink-0"
                            >
                                {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
                            </button>

                            {/* Session ID */}
                            <span className="font-mono text-[9px] sm:text-[11px] text-zinc-600 hidden md:block truncate">
                                sess_02a9fe3c
                            </span>

                            {/* Breadcrumb */}
                            <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-zinc-500 truncate">
                                <Link href="/" className="hover:text-zinc-300 transition-colors truncate">
                                    Home
                                </Link>
                                {pathname && pathname !== '/' && (
                                    <>
                                        <ChevronRight size={10} className="text-zinc-700 flex-shrink-0" />
                                        <span className="text-zinc-300 capitalize truncate">
                                            {pathname.split('/').filter(Boolean).at(-1)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                            {/* Mini pipeline stepper */}
                            <PipelineStepper stages={stages} variant="compact" className="hidden lg:flex" />

                            {/* Signal count */}
                            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px] sm:text-[11px]">
                                <Zap size={10} className="text-zinc-400" />
                                <span className="text-zinc-400 hidden md:inline">183 signals</span>
                            </div>

                            {/* Notification bell */}
                            <button className="relative p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors flex-shrink-0">
                                <Bell size={14} />
                                {notifCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                                        {notifCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </header>

                    {/* ── Page content ──────────────────────────────────────────── */}
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
