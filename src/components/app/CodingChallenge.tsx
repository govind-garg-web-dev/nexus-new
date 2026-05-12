"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGE_IDS, LANGUAGE_LABELS } from "@/lib/judge0";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  time_limit_seconds: number;
  starter_code: string;
  language_default: string;
  test_cases: Array<{ input: string; expected: string; hidden: boolean }>;
};

type TestResult = {
  passed: boolean;
  hidden: boolean;
  status: string;
  stdout: string | null;
  stderr: string | null;
  time: string | null;
  expected: string | null;
};

const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];
const DIFF_LABEL = ["", "Level 1", "Level 2", "Level 3"];

function useTimer(limitSeconds: number) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  const remaining = limitSeconds - elapsed;
  const mins = Math.floor(Math.abs(remaining) / 60);
  const secs = Math.abs(remaining) % 60;
  const over  = remaining < 0;

  return {
    display: `${over ? "+" : ""}${mins}:${String(secs).padStart(2, "0")}`,
    over,
    elapsed,
  };
}

export default function CodingChallenge({ challenge }: { challenge: Challenge }) {
  const [language, setLanguage]   = useState(challenge.language_default ?? "python");
  const [code, setCode]           = useState(challenge.starter_code ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults]     = useState<TestResult[] | null>(null);
  const [verdict, setVerdict]     = useState<"passed" | "failed" | null>(null);
  const [badgeMinted, setBadgeMinted] = useState(false);
  const { display: timeDisplay, over: timeOver, elapsed } = useTimer(challenge.time_limit_seconds);

  const visibleTests = (challenge.test_cases ?? []).filter((t) => !t.hidden);

  const handleSubmit = async () => {
    setSubmitting(true);
    setResults(null);
    setVerdict(null);
    try {
      const res = await fetch("/api/challenges/submit/coding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ challengeId: challenge.id, code, language }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      setVerdict(data.passed ? "passed" : "failed");
      setBadgeMinted(data.badgeMinted ?? false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* ── Left panel: problem ── */}
      <div className="lg:w-[42%] flex flex-col border-r border-white/[0.06] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[10px] px-2 py-0.5 rounded"
                style={{ color: DIFF_COLOR[challenge.difficulty], background: `${DIFF_COLOR[challenge.difficulty]}15`, border: `1px solid ${DIFF_COLOR[challenge.difficulty]}25` }}>
                {DIFF_LABEL[challenge.difficulty]}
              </span>
              <span className="font-pixel text-[10px] text-[#4a4a6a]">CODING</span>
            </div>
            <h1 className="font-display font-bold text-white text-lg">{challenge.title}</h1>
          </div>
          {/* Timer */}
          <div className={`font-tech text-sm px-3 py-1.5 rounded-lg border ${
            timeOver ? "text-red-400 border-red-500/30 bg-red-500/[0.07]" : "text-[#7a7a9a] border-white/[0.08]"
          }`}>
            {timeDisplay}
          </div>
        </div>

        {/* Problem description */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="prose prose-invert prose-sm max-w-none">
            {challenge.description.split("\n").map((line, i) => {
              if (line.startsWith("```")) return null;
              if (line.startsWith("**")) {
                const text = line.replace(/\*\*/g, "");
                return <p key={i} className="font-display font-semibold text-white text-sm">{text}</p>;
              }
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i} className="font-tech text-xs text-[#8888aa] leading-relaxed">{line}</p>;
            })}
          </div>

          {/* Visible test cases */}
          <div>
            <p className="font-pixel text-[11px] tracking-widest text-[#5a5a7a] mb-3">EXAMPLES</p>
            <div className="space-y-3">
              {visibleTests.map((tc, i) => (
                <div key={i} className="glass rounded-xl p-4 border border-white/[0.05]">
                  <p className="font-pixel text-[10px] text-[#4a4a6a] mb-2">EXAMPLE {i + 1}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="font-pixel text-[10px] text-violet-400 mr-2">INPUT</span>
                      <code className="font-tech text-xs text-white bg-white/[0.04] px-2 py-0.5 rounded">
                        {tc.input.replace(/\n/g, " · ")}
                      </code>
                    </div>
                    <div>
                      <span className="font-pixel text-[10px] text-emerald-400 mr-2">OUTPUT</span>
                      <code className="font-tech text-xs text-white bg-white/[0.04] px-2 py-0.5 rounded">
                        {tc.expected}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: editor + results ── */}
      <div className="lg:w-[58%] flex flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-3 shrink-0">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-lg glass border border-white/[0.08] font-tech text-xs text-white bg-transparent focus:outline-none focus:border-violet-500/40 cursor-pointer"
          >
            {Object.entries(LANGUAGE_IDS).map(([key]) => (
              <option key={key} value={key} className="bg-[#0d0d1a]">{LANGUAGE_LABELS[key]}</option>
            ))}
          </select>

          <div className="flex gap-1.5 ml-auto">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl btn-primary text-white font-display font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                  Running…
                </>
              ) : "Submit →"}
            </button>
          </div>
        </div>

        {/* Monaco editor */}
        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            height="100%"
            language={language === "cpp" ? "cpp" : language === "typescript" ? "typescript" : language}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            theme="vs-dark"
            options={{
              fontSize:          14,
              fontFamily:        "var(--font-space-mono), monospace",
              minimap:           { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers:       "on",
              renderLineHighlight: "line",
              padding:           { top: 16 },
              tabSize:           4,
            }}
          />
        </div>

        {/* Results panel */}
        <AnimatePresence>
          {(results || submitting) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-white/[0.06] overflow-hidden"
            >
              <div className="px-4 py-4 max-h-56 overflow-y-auto">
                {/* Verdict */}
                {verdict && (
                  <div className={`flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border ${
                    verdict === "passed"
                      ? "border-emerald-500/25 bg-emerald-500/[0.07]"
                      : "border-red-500/25 bg-red-500/[0.07]"
                  }`}>
                    <span className={verdict === "passed" ? "text-emerald-400 text-lg" : "text-red-400 text-lg"}>
                      {verdict === "passed" ? "✓" : "✗"}
                    </span>
                    <div>
                      <p className={`font-display font-bold text-sm ${verdict === "passed" ? "text-emerald-300" : "text-red-300"}`}>
                        {verdict === "passed" ? "All tests passed!" : "Some tests failed."}
                      </p>
                      {badgeMinted && (
                        <p className="font-pixel text-[10px] tracking-widest text-violet-400 mt-0.5">
                          ◈ BADGE MINTED · SCORE +3
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-test results */}
                {results && (
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${
                        r.passed ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-red-500/15 bg-red-500/[0.04]"
                      }`}>
                        <span className={r.passed ? "text-emerald-400" : "text-red-400"}>{r.passed ? "✓" : "✗"}</span>
                        <span className="font-tech text-[#7a7a9a]">
                          {r.hidden ? `Hidden test ${i + 1}` : `Test ${i + 1}`}
                        </span>
                        <span className="font-pixel text-[10px] ml-auto" style={{ color: r.passed ? "#10b981" : "#ef4444" }}>
                          {r.status}
                        </span>
                        {r.time && <span className="font-tech text-[10px] text-[#4a4a6a]">{r.time}s</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
