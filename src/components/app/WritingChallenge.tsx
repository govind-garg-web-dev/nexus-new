"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Challenge = {
  id: string; title: string; description: string;
  difficulty: number; time_limit_seconds: number; word_limit: number;
};

const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];
const DIFF_LABEL = ["", "Level 1", "Level 2", "Level 3"];

function useTimer(limitSeconds: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = limitSeconds - elapsed;
  const over = remaining < 0;
  const mins = Math.floor(Math.abs(remaining) / 60);
  const secs = Math.abs(remaining) % 60;
  return { display: `${over ? "+" : ""}${mins}:${String(secs).padStart(2, "0")}`, over, elapsed };
}

export default function WritingChallenge({ challenge }: { challenge: Challenge }) {
  const [text, setText]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict]     = useState<"passed" | null>(null);
  const [error, setError]         = useState("");
  const { display, over, elapsed } = useTimer(challenge.time_limit_seconds);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wordPct   = Math.min((wordCount / challenge.word_limit) * 100, 100);

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/challenges/submit/writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.id, text, timeTakenSeconds: elapsed }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setVerdict("passed");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-pixel text-[10px] px-2 py-0.5 rounded"
              style={{ color: DIFF_COLOR[challenge.difficulty], background: `${DIFF_COLOR[challenge.difficulty]}15`, border: `1px solid ${DIFF_COLOR[challenge.difficulty]}25` }}>
              {DIFF_LABEL[challenge.difficulty]}
            </span>
            <span className="font-pixel text-[10px] text-[#4a4a6a]">WRITING</span>
          </div>
          <h1 className="font-display font-bold text-white text-2xl">{challenge.title}</h1>
        </div>
        <div className={`font-tech text-sm px-3 py-1.5 rounded-lg border shrink-0 ${
          over ? "text-red-400 border-red-500/30 bg-red-500/[0.07]" : "text-[#7a7a9a] border-white/[0.08]"
        }`}>{display}</div>
      </div>

      {/* Prompt */}
      <div className="glass rounded-2xl p-6 border border-white/[0.05] mb-6">
        <p className="font-pixel text-[11px] tracking-widest text-violet-400 mb-3">PROMPT</p>
        {challenge.description.split("\n").map((line, i) => {
          if (line.startsWith("**")) {
            return <p key={i} className="font-display font-semibold text-white text-sm mb-2">{line.replace(/\*\*/g, "")}</p>;
          }
          if (!line.trim()) return <div key={i} className="h-2" />;
          return <p key={i} className="font-tech text-xs text-[#8888aa] leading-relaxed">{line}</p>;
        })}
        <div className="mt-4 flex items-center gap-3">
          <span className="font-pixel text-[10px] text-[#5a5a7a] tracking-widest">WORD LIMIT: {challenge.word_limit}</span>
          <span className="font-pixel text-[10px] text-[#5a5a7a] tracking-widest">TIME: {Math.round(challenge.time_limit_seconds / 60)} MIN</span>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing here…"
          rows={14}
          disabled={!!verdict}
          className="w-full px-5 py-4 rounded-2xl glass border border-white/[0.08] text-white placeholder-[#3a3a5a] font-tech text-sm leading-relaxed resize-none focus:outline-none focus:border-violet-500/40 transition-colors disabled:opacity-60"
        />
        {/* Word count */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <div className="w-20 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-200"
              style={{ width: `${wordPct}%`, backgroundColor: wordPct >= 100 ? "#ef4444" : "#a855f7" }} />
          </div>
          <span className={`font-tech text-[11px] ${wordCount > challenge.word_limit ? "text-red-400" : "text-[#5a5a7a]"}`}>
            {wordCount} / {challenge.word_limit}
          </span>
        </div>
      </div>

      {error && <p className="font-tech text-xs text-red-400 mb-4">{error}</p>}

      {/* Verdict */}
      <AnimatePresence>
        {verdict === "passed" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-5 py-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07]"
          >
            <p className="font-display font-bold text-emerald-300 mb-0.5">Submitted! Badge earned.</p>
            <p className="font-pixel text-[10px] tracking-widest text-violet-400">◈ WRITING BADGE MINTED · SCORE +3</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!verdict && (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={wordCount < 20 || submitting}
          className="w-full py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : "Submit Writing →"}
        </motion.button>
      )}
    </div>
  );
}
