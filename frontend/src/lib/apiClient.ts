/**
 * apiClient.ts
 * Typed async functions wrapping every FastAPI backend endpoint.
 * All calls go through the apiFetch() helper which throws on non-2xx
 * responses so errors surface as exceptions rather than silent failures.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Core Fetch Wrapper ────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${url}`, options);
    if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`API error ${res.status}: ${errorText}`);
    }
    return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Session {
    session_id: string;
    status: string;
}

export interface Chunk {
    chunk_id: string;
    session_id: string;
    cleaned_text: string;
    signal_label: string;
    confidence: number;
    source_type: string;
    source_ref: string;
    speaker: string;
    reasoning?: string;
    classification_path: string;
    suppressed: boolean;
    flagged_for_review?: boolean;
}

export interface BRDSections {
    executive_summary?: string;
    functional_requirements?: string;
    stakeholder_analysis?: string;
    timeline?: string;
    decisions?: string;
    assumptions?: string;
    success_metrics?: string;
    [key: string]: string | undefined;
}

export interface ValidationFlag {
    section_name: string;
    flag_type: string;
    severity: "high" | "medium" | "low";
    description: string;
}

export interface BRDResponse {
    session_id: string;
    sections: BRDSections;
    flags: ValidationFlag[];
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(): Promise<Session> {
    return apiFetch<Session>("/sessions/", { method: "POST" });
}

export async function getSession(sessionId: string): Promise<Session> {
    return apiFetch<Session>(`/sessions/${sessionId}`);
}

// ─── Ingestion ────────────────────────────────────────────────────────────────

export interface RawDataChunk {
    source_type: string;
    source_ref: string;
    speaker?: string;
    text: string;
}

export async function ingestChunks(sessionId: string, chunks: RawDataChunk[]): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/sessions/${sessionId}/ingest/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunks }),
    });
}

/**
 * Upload a CSV or TXT file for ingestion.
 * Runs synchronously — resolves when classification is done.
 */
export async function uploadFile(
    sessionId: string,
    file: File,
    sourceType: string = "email"
): Promise<{ message: string; chunk_count: number; filename: string }> {
    const form = new FormData();
    form.append("file", file);
    form.append("source_type", sourceType);
    // Do NOT set Content-Type — fetch sets it automatically for FormData (with boundary)
    return apiFetch(`/sessions/${sessionId}/ingest/upload`, {
        method: "POST",
        body: form,
    });
}

/**
 * Ingest a sample of the pre-downloaded Enron emails.csv directly from disk
 * on the server. Avoids uploading the ~1.3 GB file through the browser.
 */
export async function ingestDemoDataset(
    sessionId: string,
    limit: number = 80
): Promise<{ message: string; chunk_count: number; filename: string }> {
    return apiFetch(`/sessions/${sessionId}/ingest/demo?limit=${limit}`, {
        method: "POST",
    });
}

// ─── Signal Review ────────────────────────────────────────────────────────────

export async function getChunks(
    sessionId: string,
    status: "signal" | "noise" | "all" = "signal"
): Promise<{ session_id: string; count: number; chunks: Chunk[] }> {
    return apiFetch(`/sessions/${sessionId}/chunks/?status=${status}`);
}

export async function restoreChunk(
    sessionId: string,
    chunkId: string
): Promise<{ message: string }> {
    return apiFetch(`/sessions/${sessionId}/chunks/${chunkId}/restore`, { method: "POST" });
}

// ─── BRD Generation ───────────────────────────────────────────────────────────

/**
 * Trigger BRD generation.
 * NOTE: This endpoint is SYNCHRONOUS — it only resolves when all 7 agents 
 * have finished writing to the database (30-90 seconds). Show a loading 
 * spinner + message while awaiting this call.
 */
export async function generateBRD(
    sessionId: string
): Promise<{ message: string; snapshot_id: string }> {
    return apiFetch(`/sessions/${sessionId}/brd/generate`, { method: "POST" });
}

export async function getBRD(sessionId: string): Promise<BRDResponse> {
    return apiFetch(`/sessions/${sessionId}/brd/`);
}

export async function editBRDSection(
    sessionId: string,
    sectionName: string,
    content: string,
    snapshotId: string
): Promise<{ message: string }> {
    return apiFetch(`/sessions/${sessionId}/brd/sections/${sectionName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, snapshot_id: snapshotId }),
    });
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Download the BRD as a file.
 * Triggers a browser file download — does not return content as a string.
 */
export async function exportBRD(
    sessionId: string,
    format: "markdown" | "docx" = "markdown"
): Promise<void> {
    const res = await fetch(`${BASE}/sessions/${sessionId}/brd/export?format=${format}`);
    if (!res.ok) {
        const errorText = await res.text().catch(() => "Export failed");
        throw new Error(`Export error ${res.status}: ${errorText}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brd_${sessionId}.${format === "docx" ? "docx" : "md"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
