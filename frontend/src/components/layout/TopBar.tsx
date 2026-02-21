
"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const TopBar = () => {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    // Default "Project Alpha" context for demo sake if in a project route
    const isProjectView = segments.includes('project');
    const displaySegments = isProjectView ? [...segments.filter(s => s !== 'project'), 'Project Alpha'] : segments;

    return (
        <header className="flex items-center justify-between w-full mb-8 z-10 relative">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-gray-400 font-medium">
                <Link href="/" className="hover:text-cyan-400 transition-colors">
                    <Home size={16} />
                </Link>
                {displaySegments.length > 0 && <ChevronRight size={14} className="text-gray-600" />}

                {displaySegments.map((segment, index) => {
                    const isLast = index === displaySegments.length - 1;
                    const cleanName = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                    return (
                        <div key={segment} className="flex items-center">
                            <span className={cn(
                                "capitalize",
                                isLast ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" : "hover:text-gray-200 transition-colors"
                            )}>
                                {cleanName}
                            </span>
                            {!isLast && <ChevronRight size={14} className="ml-2 text-gray-600" />}
                        </div>
                    )
                })}
            </nav>

            {/* System Status */}
            <div className="glass-pill px-4 py-1.5 flex items-center space-x-2 border-white/10">
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                </div>
                <span className="text-xs text-green-400 font-medium tracking-wide">SYSTEM OPERATIONAL</span>
            </div>
        </header>
    );
};
