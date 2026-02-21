"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
}

export default function Drawer({
    open,
    onClose,
    title,
    subtitle,
    children,
    footer,
    width = 480,
}: DrawerProps) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (open) window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Dimmed backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Drawer panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 240 }}
                        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
                        style={{ width }}
                    >
                        <div className="glass-modal h-full flex flex-col rounded-none rounded-l-2xl overflow-hidden border-r-0">
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 border-b border-white/8 flex-shrink-0">
                                <div>
                                    <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                                    {subtitle && (
                                        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors -mt-0.5"
                                    title="Close (Esc)"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="flex items-center gap-3 p-4 border-t border-white/8 flex-shrink-0">
                                    {footer}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
