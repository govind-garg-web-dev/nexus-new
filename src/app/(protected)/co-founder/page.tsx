"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const COMMITMENT_OPTIONS = [
  { value: "side_5h",          label: "Side Project",       sub: "~5 hrs/week alongside studies" },
  { value: "side_10h",         label: "Serious Side",       sub: "~10 hrs/week, building to launch" },
  { value: "part_time",        label: "Part-Time",          sub: "Major time commitment right now" },
  { value: "full_time",        label: "Full-Time Post-Grad",sub: "Ready to go all-in after graduation" },
];

const DOMAIN_OPTIONS = [
  "Fintech", "Edtech", "Healthtech", "Agritech", "Climate tech",
  "B2B SaaS", "Consumer App", "Dev Tools", "AI / ML", "Web3",
  "E-commerce", "Logistics", "Social Impact", "Gaming", "Other",
];

export default function CoFounderPage() {
  const router   = useRouter();
  const [existing, setExisting]         = useState<null | object>(null);
  const [step, setStep]                 = useState(0); // 0 = intro, 1-4 = form steps
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");

  // Form state
  const [commitment, setCommitment]     = useState("");
  const [equityComfort, setEquityComfort] = useState<boolean | null>(null);
  const [equityRange, setEquityRange]   = useState("");
  const [domain, setDomain]             = useState("");
  const [problem, setProblem]           = useState("");

  useEffect(() => {
    fetch("/api/co-founder/profile")
      .then((r) => r.json())
      .then((d) => { setExisting(d.profile); setLoading(false); });
  }, []);

  const handleSubmit = async () => {
    if (problem.trim().length < 150) {
      setError("Problem statement must be at least 150 characters.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/co-founder/profile", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        commitmentLevel: commitment,
        equityComfort:   equityComfort ?? false,
        equityRange:     equityRange || null,
        domain,
        problemStatement: problem,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setExisting({});
    setStep(0);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  // ── Intro / dashboard if profile exists ─────────────────
  if (step === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 lg:p-10">
        <div className="mb-8">
          <span className="font-pixel text-xs text-violet-400 tracking-widest">CO-FOUNDER MODE</span>
          <h1 className="font-display font-bold text-white text-4xl mt-1 mb-2">
            Find your <span className="font-script italic gradient-text">co-founder.</span>
          </h1>
          <p className="font-tech text-sm text-white/60">
            A separate, structured profile for serious builders. Extended 3-question icebreaker before any reveal. No LARPing allowed.
          </p>
        </div>

        {existing ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 mb-6">
            <p className="font-tech text-sm text-emerald-300 mb-1">✓ Your co-founder profile is active</p>
            <p className="font-tech text-xs text-white/40">You appear in the co-founder feed. Others can see your commitment level and domain.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 mb-6">
            <p className="font-tech text-sm text-amber-300 mb-1">No co-founder profile yet</p>
            <p className="font-tech text-xs text-white/40">Create your profile to appear in the co-founder feed.</p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {[
            { icon: "🔒", title: "Commitment verified", sub: "Your commitment level is visible on your profile." },
            { icon: "💬", title: "3-question icebreaker", sub: "Extended structured questions before any identity reveal." },
            { icon: "📋", title: "Problem statement required", sub: "Minimum 150 chars — filters out people who haven't thought it through." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <p className="font-display font-semibold text-white text-sm mb-0.5">{f.title}</p>
                <p className="font-tech text-xs text-white/50">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setStep(1)}
          className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg"
        >
          {existing ? "Update Profile" : "Create Co-Founder Profile"}
        </motion.button>
      </div>
    );
  }

  // ── Multi-step form ──────────────────────────────────────
  const steps = [
    { num: 1, title: "Commitment" },
    { num: 2, title: "Equity" },
    { num: 3, title: "Domain" },
    { num: 4, title: "Problem" },
  ];

  return (
    <div className="max-w-xl mx-auto p-6 lg:p-10">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-tech text-xs font-bold transition-all ${
                s.num < step ? "bg-violet-500 text-white" :
                s.num === step ? "bg-violet-500/20 border border-violet-500 text-violet-300" :
                "bg-white/5 border border-white/10 text-white/30"
              }`}
            >
              {s.num < step ? "✓" : s.num}
            </div>
            {s.num < steps.length && <div className={`h-px w-8 transition-all ${s.num < step ? "bg-violet-500" : "bg-white/10"}`} />}
          </div>
        ))}
        <span className="font-tech text-xs text-white/40 ml-2">{steps[step - 1]?.title}</span>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Commitment */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="font-display font-bold text-white text-2xl mb-2">Commitment level</h2>
            <p className="font-tech text-sm text-white/50 mb-6">Be honest — this is the first filter serious co-founders will see.</p>
            <div className="space-y-3 mb-8">
              {COMMITMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCommitment(opt.value)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    commitment === opt.value
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  style={{ background: commitment === opt.value ? undefined : "rgba(255,255,255,0.02)" }}
                >
                  <p className="font-display font-semibold text-white text-sm mb-0.5">{opt.label}</p>
                  <p className="font-tech text-xs text-white/50">{opt.sub}</p>
                </button>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setStep(2)}
              disabled={!commitment}
              className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Equity */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="font-display font-bold text-white text-2xl mb-2">Equity comfort</h2>
            <p className="font-tech text-sm text-white/50 mb-6">Have you thought about equity splits? You don't need a fixed answer — just signal you've considered it.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setEquityComfort(val)}
                  className={`p-5 rounded-2xl border text-center transition-all ${
                    equityComfort === val
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  style={{ background: equityComfort === val ? undefined : "rgba(255,255,255,0.02)" }}
                >
                  <p className="font-display font-bold text-white text-lg mb-1">{val ? "Yes" : "Not yet"}</p>
                  <p className="font-tech text-xs text-white/50">
                    {val ? "I've thought about it" : "Open to discussing"}
                  </p>
                </button>
              ))}
            </div>
            {equityComfort && (
              <div className="mb-6">
                <label className="font-tech text-xs text-white/40 block mb-2">Expected range (optional)</label>
                <input
                  value={equityRange}
                  onChange={(e) => setEquityRange(e.target.value)}
                  placeholder="e.g. 30–50%, negotiable, depends on contribution"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl border border-white/10 font-tech text-sm text-white/40 hover:text-white transition-colors">← Back</button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setStep(3)}
                disabled={equityComfort === null}
                className="flex-2 flex-1 py-4 rounded-2xl btn-primary text-white font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Domain */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="font-display font-bold text-white text-2xl mb-2">Domain</h2>
            <p className="font-tech text-sm text-white/50 mb-6">What space are you building in?</p>
            <div className="grid grid-cols-3 gap-2 mb-8">
              {DOMAIN_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`py-2.5 px-3 rounded-xl border text-center font-tech text-sm transition-all ${
                    domain === d
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                      : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
                  }`}
                  style={{ background: domain === d ? undefined : "rgba(255,255,255,0.02)" }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl border border-white/10 font-tech text-sm text-white/40 hover:text-white transition-colors">← Back</button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setStep(4)}
                disabled={!domain}
                className="flex-1 py-4 rounded-2xl btn-primary text-white font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Problem statement */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="font-display font-bold text-white text-2xl mb-2">Problem statement</h2>
            <p className="font-tech text-sm text-white/50 mb-6">
              Describe the specific problem you want to solve and why. Min 150 chars. This is what potential co-founders see — be concrete, not vague.
            </p>
            <div className="relative mb-2">
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="The problem I'm working on is... I identified it because... The specific gap is..."
                rows={7}
                className="w-full px-4 py-4 rounded-2xl border border-white/10 text-white placeholder-white/20 font-tech text-sm leading-relaxed resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                style={{ background: "rgba(255,255,255,0.02)" }}
              />
            </div>
            <div className="flex items-center justify-between mb-6">
              <span className={`font-tech text-xs ${problem.trim().length < 150 ? "text-amber-400" : "text-emerald-400"}`}>
                {problem.trim().length} / 150 min chars
              </span>
            </div>

            {error && <p className="font-tech text-sm text-red-400 mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-2xl border border-white/10 font-tech text-sm text-white/40 hover:text-white transition-colors">← Back</button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={problem.trim().length < 150 || submitting}
                className="flex-1 py-4 rounded-2xl btn-primary text-white font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : "Activate Profile →"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
