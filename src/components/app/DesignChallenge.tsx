"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type Challenge = {
  id: string; title: string; description: string;
  difficulty: number; time_limit_seconds: number;
  reference_image_url: string | null;
};

const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];
const DIFF_LABEL = ["", "Level 1", "Level 2", "Level 3"];
const MAX_MB     = 10;

export default function DesignChallenge({ challenge }: { challenge: Challenge }) {
  const [file, setFile]             = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus]         = useState<"under_review" | null>(null);
  const [error, setError]           = useState("");
  const inputRef                    = useRef<HTMLInputElement>(null);

  const isLevel3 = challenge.difficulty === 3; // Original prompt — no reference image

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      setError("Only PNG, JPG, or WebP accepted."); return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB} MB.`); return;
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setError("");
    setSubmitting(true);
    const form = new FormData();
    form.append("challengeId", challenge.id);
    form.append("file", file);

    const res  = await fetch("/api/challenges/submit/design", { method: "POST", body: form });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setStatus("under_review");
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-tech text-xs px-2 py-0.5 rounded"
              style={{ color: DIFF_COLOR[challenge.difficulty], background: `${DIFF_COLOR[challenge.difficulty]}15`, border: `1px solid ${DIFF_COLOR[challenge.difficulty]}25` }}>
              {DIFF_LABEL[challenge.difficulty]}
            </span>
            <span className="font-tech text-xs text-white/40">DESIGN</span>
          </div>
          <h1 className="font-display font-bold text-white text-2xl mb-1">{challenge.title}</h1>
          <p className="font-tech text-sm text-amber-400">Peer reviewed — badge after 2 approvals from verified designers</p>
        </div>
        <div className="font-tech text-sm px-3 py-1.5 rounded-lg border border-white/10 text-white/50 shrink-0">
          {Math.round(challenge.time_limit_seconds / 3600)}h limit
        </div>
      </div>

      <div className={`grid gap-6 ${isLevel3 ? "" : "lg:grid-cols-2"}`}>
        {/* Reference image (L1 and L2 only) */}
        {!isLevel3 && challenge.reference_image_url && (
          <div>
            <p className="font-tech text-sm font-semibold text-white/60 mb-3">Reference</p>
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/2">
              <Image
                src={challenge.reference_image_url}
                alt="Design reference"
                width={800}
                height={600}
                className="w-full h-auto"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Right: prompt + upload */}
        <div>
          {/* Prompt */}
          <div className="rounded-2xl p-5 border border-white/5 mb-6" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="font-tech text-xs font-semibold text-violet-400 mb-3 tracking-wider">BRIEF</p>
            {challenge.description.split("\n").map((line, i) => {
              if (line.startsWith("**")) return <p key={i} className="font-display font-semibold text-white text-sm mb-2">{line.replace(/\*\*/g, "")}</p>;
              if (!line.trim()) return <div key={i} className="h-2" />;
              return <p key={i} className="font-tech text-sm text-white/60 leading-relaxed">{line}</p>;
            })}
          </div>

          {/* Upload area */}
          {!status && (
            <>
              <p className="font-tech text-sm font-semibold text-white/60 mb-3">Your submission</p>
              <div
                onClick={() => inputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer group ${
                  preview ? "border-violet-500/40" : "border-white/10 hover:border-violet-500/30"
                }`}
                style={{ minHeight: 200, background: "rgba(255,255,255,0.02)" }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onFilePick}
                  className="hidden"
                />
                {preview ? (
                  <Image src={preview} alt="Your design" width={800} height={600} className="w-full h-auto rounded-2xl" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center text-2xl text-white/30 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-colors">
                      ↑
                    </div>
                    <p className="font-display font-semibold text-white/60 text-sm">Click to upload your design</p>
                    <p className="font-tech text-xs text-white/30">PNG, JPG, WebP · max {MAX_MB} MB</p>
                  </div>
                )}
              </div>

              {preview && (
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="font-tech text-xs text-white/30 hover:text-white/60 transition-colors mt-2"
                >
                  Remove and re-upload
                </button>
              )}
            </>
          )}

          {error && <p className="font-tech text-sm text-red-400 mt-3">{error}</p>}

          <AnimatePresence>
            {status === "under_review" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 px-5 py-5 rounded-2xl border border-amber-500/25 bg-amber-500/5"
              >
                <p className="font-display font-bold text-amber-300 text-base mb-1">Submitted for peer review.</p>
                <p className="font-tech text-sm text-white/50">
                  Two verified designers will evaluate your work. Badge is minted after both approve.
                  Track it in the <a href="/challenges/review" className="text-violet-400 hover:text-violet-300 underline">Review Queue</a>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!status && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={!file || submitting}
              className="w-full mt-5 py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Uploading…" : "Submit for Peer Review →"}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
