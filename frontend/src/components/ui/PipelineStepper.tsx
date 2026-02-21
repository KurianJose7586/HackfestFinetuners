"use client";

import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";

export type PipelineStage = "Ingestion" | "Noise Filtering" | "AKS Storage" | "BRD Generation" | "Validation" | "Export";
export type StageStatus = "complete" | "running" | "pending" | "error";

export interface StageInfo {
    name: PipelineStage;
    status: StageStatus;
    timestamp?: string;
    itemCount?: number;
}

const STAGES: PipelineStage[] = [
    "Ingestion",
    "Noise Filtering",
    "AKS Storage",
    "BRD Generation",
    "Validation",
    "Export",
];

interface PipelineStepperProps {
    stages?: StageInfo[];
    variant?: "compact" | "expanded";
    className?: string;
}

const defaultStages: StageInfo[] = STAGES.map((name, i) => ({
    name,
    status: i === 0 ? "complete" : i === 1 ? "running" : "pending",
}));

function StageIcon({ status }: { status: StageStatus }) {
    if (status === "complete") return <Check size={10} strokeWidth={3} />;
    if (status === "error") return <X size={10} strokeWidth={3} />;
    if (status === "running") return <Loader2 size={10} className="animate-spin" />;
    return null;
}

export default function PipelineStepper({
    stages = defaultStages,
    variant = "expanded",
    className,
}: PipelineStepperProps) {
    if (variant === "compact") {
        return (
            <div className={cn("flex items-center gap-1.5", className)}>
                {stages.map((stage, i) => (
                    <div key={stage.name} className="flex items-center gap-1.5">
                        <div
                            className={cn("w-2 h-2 rounded-full transition-all", {
                                "bg-emerald-400": stage.status === "complete",
                                "bg-amber-400 animate-pulse": stage.status === "running",
                                "bg-zinc-600": stage.status === "pending",
                                "bg-red-400": stage.status === "error",
                            })}
                            title={stage.name}
                        />
                        {i < stages.length - 1 && (
                            <div className={cn("w-3 h-px", {
                                "bg-emerald-400/50": stage.status === "complete",
                                "bg-zinc-600": stage.status !== "complete",
                            })} />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={cn("relative", className)}>
            {/* Connecting line */}
            <div className="absolute top-5 left-5 right-5 h-px bg-white/5" />

            <div className="relative grid grid-cols-6 gap-2">
                {stages.map((stage, i) => {
                    const prevComplete = i === 0 || stages[i - 1].status === "complete";
                    return (
                        <div key={stage.name} className="flex flex-col items-center gap-2">
                            {/* Node */}
                            <div
                                className={cn(
                                    "relative w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300",
                                    {
                                        "glassmorphic-complete bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-glow-green":
                                            stage.status === "complete",
                                        "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]":
                                            stage.status === "running",
                                        "bg-white/5 border-white/10 text-zinc-600":
                                            stage.status === "pending",
                                        "bg-red-500/20 border-red-400 text-red-300 shadow-glow-red":
                                            stage.status === "error",
                                    }
                                )}
                            >
                                {stage.status === "complete" && (
                                    <Check size={16} strokeWidth={2.5} className="text-emerald-300" />
                                )}
                                {stage.status === "running" && (
                                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                                )}
                                {stage.status === "error" && (
                                    <X size={16} strokeWidth={2.5} className="text-red-300" />
                                )}
                                {stage.status === "pending" && (
                                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                )}
                            </div>

                            {/* Label */}
                            <div className="text-center">
                                <p className={cn("text-xs font-medium leading-tight", {
                                    "text-emerald-300": stage.status === "complete",
                                    "text-amber-300": stage.status === "running",
                                    "text-zinc-500": stage.status === "pending",
                                    "text-red-300": stage.status === "error",
                                })}>
                                    {stage.name}
                                </p>
                                {stage.timestamp && (
                                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{stage.timestamp}</p>
                                )}
                                {stage.itemCount !== undefined && stage.status === "complete" && (
                                    <p className="text-[10px] text-zinc-500 mt-0.5">{stage.itemCount} items</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
