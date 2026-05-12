"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── File preview modal ─────────────────────────────────────
function FilePreviewModal({
  file,
  onClose,
}: {
  file: { url: string; name: string; title: string; mime: string | null } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!file) return null;

  const isPdf   = file.mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0"
          style={{ background: "#08080f" }}>
          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-sm truncate">{file.title}</p>
            <p className="font-tech text-xs text-white/40 truncate">{file.name}</p>
          </div>

          {/* Actions */}
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/12 bg-white/4 font-tech text-sm text-white/70 hover:text-white hover:border-white/20 transition-all shrink-0"
          >
            ↗ Open in new tab
          </a>
          <a
            href={file.url}
            download={file.name}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-tech text-sm shrink-0"
          >
            ↓ Download
          </a>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all shrink-0 font-display text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
          {isPdf && (
            <iframe
              src={file.url}
              className="w-full h-full rounded-xl border border-white/10"
              style={{ maxWidth: "100%", background: "#fff" }}
              title={file.title}
            />
          )}

          {isImage && !isPdf && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.title}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          )}

          {!isPdf && !isImage && (
            <div className="text-center">
              <p className="text-5xl mb-4">📄</p>
              <p className="font-display font-semibold text-white text-lg mb-2">{file.title}</p>
              <p className="font-tech text-sm text-white/50 mb-6">
                This file type can&apos;t be previewed in the browser.
              </p>
              <a href={file.url} download={file.name}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                ↓ Download file
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

type Upload = {
  id: string; title: string; college: string; branch: string;
  semester: number | null; course_code: string | null; course_name: string;
  year: number | null; type: string; file_url: string; file_name: string;
  file_size: number | null; mime_type: string | null;
  upvotes: number; downvotes: number; myVote: number;
  created_at: string;
  uploader: { pseudonym: string; avatar_color: string; vault_karma: number } | null;
};

const TYPE_COLOR: Record<string, string> = {
  pyq: "#a855f7", notes: "#3b82f6", lab: "#06b6d4", assignment: "#f59e0b", other: "#6b7280",
};
const TYPE_LABEL: Record<string, string> = {
  pyq: "PYQ", notes: "Notes", lab: "Lab", assignment: "Assignment", other: "Other",
};
const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1);

type PreviewFile = { url: string; name: string; title: string; mime: string | null };

export default function VaultPage() {
  const [uploads, setUploads]   = useState<Upload[]>([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState("");
  const [branch, setBranch]     = useState("");
  const [semester, setSemester] = useState("");
  const [type, setType]         = useState("");
  const [preview, setPreview]   = useState<PreviewFile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q)        params.set("q", q);
    if (branch)   params.set("branch", branch);
    if (semester) params.set("semester", semester);
    if (type)     params.set("type", type);
    const res  = await fetch(`/api/vault?${params}`);
    const data = await res.json();
    setUploads(data.uploads ?? []);
    setLoading(false);
  }, [q, branch, semester, type]);

  useEffect(() => { load(); }, [load]);

  const vote = async (uploadId: string, v: number, current: number) => {
    const newVote = current === v ? 0 : v; // toggle off
    await fetch("/api/vault/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, vote: newVote }),
    });
    load();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Academic Vault</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            PYQs &{" "}
            <span className="font-script italic gradient-text">Notes</span>
          </h1>
          <p className="font-tech text-sm text-white/40">
            Campus-gated · Verified uploads · Community-curated
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/vault/reviews"
            className="px-4 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            Prof Reviews
          </Link>
          <Link href="/vault/upload"
            className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm flex items-center gap-2">
            ↑ Upload
          </Link>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by course, code, or keyword…"
          className="flex-1 min-w-48 px-4 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
        <select value={semester} onChange={(e) => setSemester(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white bg-[#0d0d1a] focus:outline-none">
          <option value="">All sems</option>
          {SEMESTERS.map((s) => <option key={s} value={s}>Sem {s}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white bg-[#0d0d1a] focus:outline-none">
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={load} className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">Nothing here yet</p>
          <p className="font-tech text-sm text-white/40 mb-6">
            Be the first to upload notes for your campus.
          </p>
          <Link href="/vault/upload" className="inline-flex px-6 py-3 rounded-xl btn-primary text-white font-display font-semibold text-sm">
            Upload First →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {uploads.map((u, i) => {
            const color = TYPE_COLOR[u.type] ?? "#6b7280";
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/8 hover:border-white/15 transition-all group"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="p-5 flex items-start gap-4">
                  {/* Type badge */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-tech text-xs font-bold shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                    {TYPE_LABEL[u.type]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setPreview({ url: u.file_url, name: u.file_name, title: u.title, mime: u.mime_type ?? null })}
                      className="font-display font-bold text-white text-base hover:text-violet-200 transition-colors text-left group-hover:underline"
                    >
                      {u.title}
                    </button>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="font-tech text-xs text-white/40">{u.branch}</span>
                      {u.semester && <span className="font-tech text-xs text-white/40">Sem {u.semester}</span>}
                      {u.course_code && <span className="font-tech text-xs text-white/40">{u.course_code}</span>}
                      <span className="font-tech text-xs text-white/40">{u.course_name}</span>
                      {u.year && <span className="font-tech text-xs text-white/40">{u.year}</span>}
                      {u.file_size && <span className="font-tech text-xs text-white/30">{formatSize(u.file_size)}</span>}
                    </div>
                    {u.uploader && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-4 h-4 rounded flex items-center justify-center font-pixel text-[8px] text-white"
                          style={{ backgroundColor: u.uploader.avatar_color }}>
                          {u.uploader.pseudonym[0].toUpperCase()}
                        </div>
                        <span className="font-tech text-xs text-white/30">{u.uploader.pseudonym}</span>
                        {u.uploader.vault_karma >= 50 && (
                          <span className="font-pixel text-[10px] text-violet-400 tracking-wider">◈ CONTRIBUTOR</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vote */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button onClick={() => vote(u.id, 1, u.myVote)}
                      className={`px-2 py-1 rounded-lg font-tech text-xs transition-all ${
                        u.myVote === 1 ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30" : "text-white/30 hover:text-emerald-400"
                      }`}>
                      ▲ {u.upvotes}
                    </button>
                    <button onClick={() => vote(u.id, -1, u.myVote)}
                      className={`px-2 py-1 rounded-lg font-tech text-xs transition-all ${
                        u.myVote === -1 ? "text-red-400 bg-red-500/15 border border-red-500/30" : "text-white/30 hover:text-red-400"
                      }`}>
                      ▼ {u.downvotes}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* File preview modal */}
      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
