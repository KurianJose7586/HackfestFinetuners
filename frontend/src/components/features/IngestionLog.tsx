
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";

const SIMULATED_LOGS = [
    "Initializing connection to Slack Gateway...",
    "Authenticating with OAuth2 user token...",
    "Fetching channel list...",
    "Found 12 active channels.",
    "Connecting to #project-alpha...",
    "Downloading message history (last 30 days)...",
    "Chunking message ID #8821...",
    "Warning: Noise detected in message #8822 (GIF attachment) - SKIPPED.",
    "Chunking message ID #8823...",
    "Vectorizing text chunk [0.032s]...",
    "Storing in Pinecone index...",
    "Connecting to Zoom API...",
    "Fetching transcript for 'Kickoff Call - 10/24'...",
    "Processing speaker diarization labels...",
    "Speaker A identified as 'Product Owner'.",
    "Cleaning transcript noise...",
    "Ingestion complete for batch #402."
];

export default function IngestionLog() {
    const [logs, setLogs] = useState<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < SIMULATED_LOGS.length) {
                const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
                setLogs(prev => [...prev, `[${timestamp}] ${SIMULATED_LOGS[currentIndex]}`]);
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, 800); // 800ms per log line

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="glass-panel h-full flex flex-col font-mono text-sm overflow-hidden border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            <div className="bg-black/40 p-3 border-b border-white/10 flex items-center gap-2">
                <Terminal size={14} className="text-green-500" />
                <span className="text-green-500/80 uppercase tracking-widest text-xs">Live Ingestion Stream</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/60 relative">
                {/* Scanline effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20" />

                <AnimatePresence>
                    {logs.map((log, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-green-400/90 break-words"
                        >
                            <span className="text-green-600 mr-2">{log.split(']')[0]}]</span>
                            {log.split(']')[1]}
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
