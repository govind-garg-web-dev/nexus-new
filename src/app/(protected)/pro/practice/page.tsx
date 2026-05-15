"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Question = { id: string; category: string; sub_category: string | null; title: string; difficulty: string; tags: string[]; };
type FullQuestion = Question & { content: string; answer: string | null; hints: string[] | null; };

const CATEGORIES = [
  { value: "dsa",           label: "DSA",            icon: "◈" },
  { value: "system_design", label: "System Design",  icon: "◎" },
  { value: "interview",     label: "Interview",       icon: "🎤" },
  { value: "aptitude",      label: "Aptitude",        icon: "◆" },
  { value: "coding",        label: "Coding",          icon: "💻" },
];
const DIFF_COLOR: Record<string, string> = { easy: "#10b981", medium: "#f59e0b", hard: "#ef4444" };

export default function PracticePage() {
  const [category, setCategory]     = useState("dsa");
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<FullQuestion | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [attempted, setAttempted]   = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pro/practice?category=${category}`)
      .then((r) => r.json())
      .then((d) => { setQuestions(d.questions ?? []); setLoading(false); });
  }, [category]);

  const openQuestion = async (q: Question) => {
    // Fetch full question with answer (would be a separate API in production)
    const res  = await fetch(`/api/pro/practice?category=${q.category}`);
    const data = await res.json();
    const full = (data.questions ?? []).find((x: FullQuestion) => x.id === q.id);
    if (full) { setSelected(full as FullQuestion); setShowAnswer(false); }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👑</span>
            <span className="font-pixel text-xs text-amber-400 tracking-widest">PRO</span>
          </div>
          <h1 className="font-display font-bold text-white text-4xl mb-1">Practice Panel</h1>
          <p className="font-tech text-sm text-white/40">Technical · Interview · Aptitude · System Design · Coding</p>
        </div>
        <Link href="/pro" className="font-tech text-sm text-white/40 hover:text-white transition-colors">← Pro Home</Link>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setCategory(c.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-tech text-sm transition-all ${
              category === c.value ? "btn-primary text-white" : "border border-white/10 text-white/50 hover:text-white"
            }`}
            style={{ background: category === c.value ? undefined : "rgba(255,255,255,0.02)" }}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Question list */}
        <div>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <motion.button key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => { openQuestion(q); setAttempted((prev) => new Set([...prev, q.id])); }}
                  className={`w-full text-left rounded-2xl border p-4 transition-all group ${
                    selected?.id === q.id
                      ? "border-violet-500/40 bg-violet-500/8"
                      : "border-white/8 hover:border-white/15"
                  }`}
                  style={{ background: selected?.id === q.id ? undefined : "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: DIFF_COLOR[q.difficulty] ?? "#a855f7" }} />
                    <span className="font-display font-semibold text-white text-sm flex-1 text-left group-hover:text-violet-200 transition-colors">
                      {q.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {attempted.has(q.id) && <span className="font-pixel text-[10px] text-emerald-400">DONE</span>}
                      {q.sub_category && <span className="font-tech text-xs text-white/30">{q.sub_category}</span>}
                      <span className="font-tech text-xs capitalize" style={{ color: DIFF_COLOR[q.difficulty] }}>
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Question detail panel */}
        <div className="sticky top-6 h-fit">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(13,13,26,0.9)" }}>
                {/* Header */}
                <div className="p-5 border-b border-white/8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-tech text-xs capitalize px-2 py-0.5 rounded"
                      style={{ color: DIFF_COLOR[selected.difficulty], background: `${DIFF_COLOR[selected.difficulty]}15` }}>
                      {selected.difficulty}
                    </span>
                    {selected.sub_category && <span className="font-tech text-xs text-white/40">{selected.sub_category}</span>}
                  </div>
                  <h3 className="font-display font-bold text-white text-base">{selected.title}</h3>
                </div>

                {/* Question */}
                <div className="p-5 border-b border-white/8 max-h-48 overflow-y-auto">
                  <p className="font-tech text-sm text-white/80 leading-relaxed">{selected.content}</p>
                </div>

                {/* Tags */}
                <div className="px-5 py-3 border-b border-white/8 flex flex-wrap gap-1.5">
                  {selected.tags.map((t) => (
                    <span key={t} className="font-tech text-[10px] text-white/40 px-2 py-0.5 rounded border border-white/8">
                      {t}
                    </span>
                  ))}
                </div>

                {/* Answer */}
                <div className="p-5">
                  {!showAnswer ? (
                    <button onClick={() => setShowAnswer(true)}
                      className="w-full py-3 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 font-display font-semibold text-sm hover:bg-violet-500/15 transition-colors">
                      Reveal Answer
                    </button>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="font-pixel text-[10px] text-emerald-400 tracking-widest mb-2">ANSWER</p>
                      <p className="font-tech text-sm text-white/80 leading-relaxed">{selected.answer}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-white/8 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-3xl mb-3">🎯</p>
                <p className="font-display font-semibold text-white/60">Select a question to start</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
