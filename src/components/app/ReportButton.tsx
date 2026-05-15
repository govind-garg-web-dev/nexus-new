"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { value: "harassment",    label: "Harassment or bullying" },
  { value: "doxxing",       label: "Sharing personal info (doxxing)" },
  { value: "impersonation", label: "Impersonation" },
  { value: "skill_fraud",   label: "Fake skill claims / badge fraud" },
  { value: "ghosting",      label: "Ghosted after committing" },
  { value: "scam",          label: "Scam or fraud" },
  { value: "sexual_content",label: "Sexual or inappropriate content" },
  { value: "no_show",       label: "No-show at committed event" },
  { value: "other",         label: "Other" },
];

interface Props {
  reportedId:   string;
  contentType?: string; // 'message' | 'listing' | 'confession' | 'profile'
  contentId?:   string;
  label?:       string; // custom button label
  minimal?:     boolean; // just a flag icon, no text
}

export default function ReportButton({ reportedId, contentType, contentId, label, minimal }: Props) {
  const [open, setOpen]           = useState(false);
  const [category, setCategory]   = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  const submit = async () => {
    if (!category) { setError("Please select a category."); return; }
    setSubmitting(true);
    const res = await fetch("/api/report", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reportedId, category, description, contentType, contentId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed.");
      return;
    }
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setCategory(""); setDescription(""); }, 1500);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Report"
        className={`font-pixel transition-colors ${
          minimal
            ? "text-white/20 hover:text-amber-400 text-base px-1"
            : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-white/30 hover:text-amber-400 hover:border-amber-400/20 font-tech text-xs"
        }`}
      >
        {minimal ? "⚑" : `${label ?? "Report"} ⚑`}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 overflow-hidden z-30 shadow-2xl"
            style={{ background: "#0d0d1a" }}
          >
            {done ? (
              <div className="p-5 text-center">
                <p className="text-2xl mb-2">✓</p>
                <p className="font-display font-bold text-white text-sm">Report submitted</p>
                <p className="font-tech text-xs text-white/50 mt-1">Our moderators will review within 30 minutes.</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display font-bold text-white text-sm">Report</p>
                  <button onClick={() => setOpen(false)} className="font-pixel text-white/40 hover:text-white text-base">✕</button>
                </div>

                <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-tech text-xs transition-all ${
                        category === c.value
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                          : "text-white/60 hover:text-white hover:bg-white/4"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details (optional)…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-xs resize-none focus:outline-none focus:border-amber-500/40 transition-colors mb-3"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />

                {error && <p className="font-tech text-xs text-red-400 mb-2">{error}</p>}

                <button
                  onClick={submit}
                  disabled={!category || submitting}
                  className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 font-display font-semibold text-sm hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting…" : "Submit Report"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
