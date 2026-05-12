"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = ["coding", "writing", "design", "quiz"];

interface Props {
  endorseeId:   string;
  matchEventId?: string;
}

export default function EndorseButton({ endorseeId, matchEventId }: Props) {
  const [open, setOpen]         = useState(false);
  const [category, setCategory] = useState("");
  const [note, setNote]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  const submit = async () => {
    if (!category) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/endorsements", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ endorseeId, category, matchEventId, note }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setDone(true);
    setOpen(false);
  };

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
        <span className="text-emerald-400 text-sm">✓</span>
        <span className="font-tech text-sm text-emerald-300">Endorsed</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(!open)}
        className="px-4 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 font-display font-semibold text-sm hover:bg-violet-500/15 transition-colors"
      >
        Endorse ◈
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 overflow-hidden z-20"
            style={{ background: "#0d0d1a" }}
          >
            <div className="p-4">
              <p className="font-display font-bold text-white text-sm mb-1">Endorse this person</p>
              <p className="font-tech text-xs text-white/40 mb-4">
                You must have a badge in the category you're endorsing. 20 endorsements max per semester.
              </p>

              {/* Category picker */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-lg font-tech text-xs capitalize transition-all ${
                      category === cat
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                        : "border border-white/10 text-white/50 hover:text-white hover:border-white/20"
                    }`}
                    style={{ background: category === cat ? undefined : "rgba(255,255,255,0.02)" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Optional note */}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (max 140 chars)…"
                maxLength={140}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-xs resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-3"
                style={{ background: "rgba(255,255,255,0.03)" }}
              />

              {error && <p className="font-tech text-xs text-red-400 mb-3">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-lg font-tech text-xs text-white/40 hover:text-white transition-colors border border-white/10">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!category || loading}
                  className="flex-1 py-2 rounded-lg btn-primary text-white font-display font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "…" : "Endorse"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
