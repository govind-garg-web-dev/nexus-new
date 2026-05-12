"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Question = { q: string; options: string[] };
type Challenge = {
  id: string; title: string; description: string;
  difficulty: number; time_limit_seconds: number;
  questions: Question[];
};
type Breakdown = { index: number; correct: boolean; explanation: string };

const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];
const DIFF_LABEL = ["", "Level 1", "Level 2", "Level 3"];

function useTimer(limit: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = limit - elapsed;
  const over = remaining < 0;
  const m = Math.floor(Math.abs(remaining) / 60);
  const s = Math.abs(remaining) % 60;
  return { display: `${over ? "+" : ""}${m}:${String(s).padStart(2, "0")}`, over, elapsed };
}

export default function QuizChallenge({ challenge }: { challenge: Challenge }) {
  const [answers, setAnswers]     = useState<(number | null)[]>(Array(challenge.questions.length).fill(null));
  const [current, setCurrent]     = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState<{ passed: boolean; score: number; correct: number; total: number; breakdown: Breakdown[] } | null>(null);
  const { display, over, elapsed } = useTimer(challenge.time_limit_seconds);

  const q = challenge.questions[current];
  const answered = answers[current] !== null;
  const allAnswered = answers.every((a) => a !== null);

  const select = (optIdx: number) => {
    if (result) return;
    const next = [...answers];
    next[current] = optIdx;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/challenges/submit/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.id, answers, timeTakenSeconds: elapsed }),
    });
    const data = await res.json();
    setSubmitting(false);
    setResult(data);
  };

  // Results view
  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6 lg:p-10">
        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`glass rounded-3xl p-8 border mb-8 text-center ${
            result.passed ? "border-emerald-500/25" : "border-red-500/20"
          }`}
        >
          <div className="font-pixel text-6xl mb-4" style={{ color: result.passed ? "#10b981" : "#ef4444" }}>
            {result.score}%
          </div>
          <p className={`font-display font-bold text-xl mb-1 ${result.passed ? "text-emerald-300" : "text-red-300"}`}>
            {result.passed ? "Badge Earned!" : "Not quite — try again"}
          </p>
          <p className="font-tech text-xs text-[#5a5a7a]">
            {result.correct} / {result.total} correct · Pass threshold: 70%
          </p>
          {result.passed && (
            <p className="font-pixel text-[11px] tracking-widest text-violet-400 mt-3">◈ QUIZ BADGE MINTED · SCORE +3</p>
          )}
        </motion.div>

        {/* Per-question breakdown */}
        <div className="space-y-4">
          <p className="font-pixel text-[11px] tracking-widest text-[#5a5a7a]">REVIEW</p>
          {challenge.questions.map((q, i) => {
            const bd = result.breakdown[i];
            return (
              <div key={i} className={`glass rounded-xl p-4 border ${
                bd?.correct ? "border-emerald-500/15" : "border-red-500/15"
              }`}>
                <div className="flex items-start gap-3 mb-2">
                  <span className={`font-pixel text-base mt-0.5 ${bd?.correct ? "text-emerald-400" : "text-red-400"}`}>
                    {bd?.correct ? "✓" : "✗"}
                  </span>
                  <p className="font-tech text-xs text-white leading-relaxed">{q.q}</p>
                </div>
                <div className="ml-6 space-y-1">
                  {q.options.map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <span className={`font-pixel text-[10px] w-4 ${
                        j === answers[i] && !bd?.correct ? "text-red-400" :
                        "text-[#5a5a7a]"
                      }`}>{j === answers[i] ? "→" : " "}</span>
                      <span className="font-tech text-[11px] text-[#7a7a9a]">{opt}</span>
                    </div>
                  ))}
                </div>
                {bd?.explanation && (
                  <p className="font-tech text-[11px] text-violet-300 ml-6 mt-2 leading-relaxed">
                    💡 {bd.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-pixel text-[10px] px-2 py-0.5 rounded"
              style={{ color: DIFF_COLOR[challenge.difficulty], background: `${DIFF_COLOR[challenge.difficulty]}15`, border: `1px solid ${DIFF_COLOR[challenge.difficulty]}25` }}>
              {DIFF_LABEL[challenge.difficulty]}
            </span>
            <span className="font-pixel text-[10px] text-[#4a4a6a]">QUIZ/DSA</span>
          </div>
          <h1 className="font-display font-bold text-white text-xl">{challenge.title}</h1>
        </div>
        <div className={`font-tech text-sm px-3 py-1.5 rounded-lg border ${
          over ? "text-red-400 border-red-500/30 bg-red-500/[0.07]" : "text-[#7a7a9a] border-white/[0.08]"
        }`}>{display}</div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-8 flex-wrap">
        {challenge.questions.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className="w-2.5 h-2.5 rounded-full transition-all duration-200"
            style={{
              backgroundColor: i === current
                ? "#a855f7"
                : answers[i] !== null ? "#7c3aed50" : "rgba(255,255,255,0.08)",
              boxShadow: i === current ? "0 0 6px #a855f7" : undefined,
            }}
          />
        ))}
        <span className="font-tech text-xs text-[#5a5a7a] ml-2">
          {answers.filter((a) => a !== null).length} / {challenge.questions.length}
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          <div className="glass rounded-2xl p-6 border border-white/[0.05] mb-5">
            <p className="font-pixel text-[10px] tracking-widest text-[#5a5a7a] mb-3">
              Q{current + 1} OF {challenge.questions.length}
            </p>
            <p className="font-display font-semibold text-white text-base leading-relaxed">{q.q}</p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[current] === i;
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => select(i)}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-150 ${
                    selected
                      ? "border-violet-500/50 bg-violet-500/[0.1]"
                      : "glass border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected ? "border-violet-500 bg-violet-500" : "border-white/20"
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-tech text-sm text-[#c0c0d8]">{opt}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center gap-3 mt-8">
        <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
          className="px-4 py-2.5 rounded-xl glass border border-white/[0.08] font-tech text-xs text-[#7a7a9a] hover:text-white transition-colors disabled:opacity-30">
          ← Prev
        </button>
        {current < challenge.questions.length - 1 ? (
          <button onClick={() => setCurrent((c) => c + 1)}
            className="px-4 py-2.5 rounded-xl glass border border-white/[0.08] font-tech text-xs text-[#7a7a9a] hover:text-white transition-colors ml-auto">
            Next →
          </button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="ml-auto px-6 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Grading…" : "Submit Quiz →"}
          </motion.button>
        )}
      </div>
    </div>
  );
}
