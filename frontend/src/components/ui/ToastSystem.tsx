"use client";

import { cn } from "@/lib/utils";
import { X, CheckCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastVariant = "success" | "warning" | "error" | "info";

export interface Toast {
    id: string;
    variant: ToastVariant;
    title: string;
    description?: string;
    undoAction?: () => void;
    duration?: number;
}

interface ToastItemProps {
    toast: Toast;
    onDismiss: (id: string) => void;
}

const BORDER_COLOURS: Record<ToastVariant, string> = {
    success: "border-l-4 border-l-emerald-400",
    warning: "border-l-4 border-l-amber-400",
    error: "border-l-4 border-l-red-400",
    info: "border-l-4 border-l-blue-400",
};

const ICON_COLOURS: Record<ToastVariant, string> = {
    success: "text-emerald-400",
    warning: "text-amber-400",
    error: "text-red-400",
    info: "text-blue-400",
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
    const undoTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const undoActive = useRef(true);

    useEffect(() => {
        const duration = toast.duration ?? 5000;
        const timer = setTimeout(() => onDismiss(toast.id), duration);

        if (toast.undoAction) {
            undoTimeoutRef.current = setTimeout(() => {
                undoActive.current = false;
            }, 8000);
        }

        return () => {
            clearTimeout(timer);
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        };
    }, [toast.id, toast.duration, toast.undoAction, onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "glass-card w-80 px-4 py-3 flex gap-3 items-start",
                BORDER_COLOURS[toast.variant]
            )}
        >
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", ICON_COLOURS[toast.variant])}>
                    {toast.title}
                </p>
                {toast.description && (
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{toast.description}</p>
                )}
                {toast.undoAction && (
                    <button
                        onClick={() => { toast.undoAction?.(); onDismiss(toast.id); }}
                        className="mt-1.5 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    >
                        <RotateCcw size={10} />
                        Undo
                    </button>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-0.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors flex-shrink-0"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}

interface ToastSystemProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

export default function ToastSystem({ toasts, onDismiss }: ToastSystemProps) {
    const visible = toasts.slice(-3);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
                {visible.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
                ))}
            </AnimatePresence>
        </div>
    );
}
