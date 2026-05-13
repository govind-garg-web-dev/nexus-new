"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Answer = string | number;

type Question = {
  key:     string;
  label:   string;
  sub?:    string;
  type:    "scale" | "choice";
  options: { value: Answer; label: string; sub?: string }[];
};

const QUESTIONS: Question[] = [
  {
    key: "sleep_schedule", label: "When do you usually go to sleep?", type: "scale",
    options: [
      { value: 1, label: "Before 10 PM",   sub: "Early bird" },
      { value: 2, label: "10 PM – 11 PM",  sub: "Normal schedule" },
      { value: 3, label: "11 PM – 1 AM",   sub: "Moderate" },
      { value: 4, label: "1 AM – 2 AM",    sub: "Night owl" },
      { value: 5, label: "After 2 AM",     sub: "Very late" },
    ],
  },
  {
    key: "cleanliness", label: "How clean do you keep your living space?", type: "scale",
    options: [
      { value: 1, label: "Organised chaos", sub: "Stuff everywhere, I know where things are" },
      { value: 2, label: "Casual",          sub: "Tidy when I feel like it" },
      { value: 3, label: "Moderate",        sub: "Regular cleaning, nothing extreme" },
      { value: 4, label: "Clean",           sub: "Things have a place, I return them" },
      { value: 5, label: "Very clean",      sub: "Sanitised, no mess tolerated" },
    ],
  },
  {
    key: "wake_time", label: "When do you wake up on regular days?", type: "choice",
    options: [
      { value: "early",     label: "Before 7 AM",  sub: "Early riser" },
      { value: "normal",    label: "7 AM – 9 AM",  sub: "Normal schedule" },
      { value: "late",      label: "9 AM – 11 AM", sub: "Late sleeper" },
      { value: "very_late", label: "After 11 AM",  sub: "Very late" },
    ],
  },
  {
    key: "study_env", label: "What environment do you need when studying?", type: "choice",
    options: [
      { value: "silent",    label: "Complete silence",       sub: "No noise at all" },
      { value: "music_ok",  label: "Background music is fine", sub: "Headphones or low volume" },
      { value: "calls_ok",  label: "Calls and talking are fine", sub: "I can focus through noise" },
      { value: "anything",  label: "I can study anywhere",  sub: "Noise doesn't bother me" },
    ],
  },
  {
    key: "visitors", label: "How often do you have friends over?", type: "choice",
    options: [
      { value: "rarely",  label: "Rarely",           sub: "Once in a few months" },
      { value: "monthly", label: "Occasionally",     sub: "Once or twice a month" },
      { value: "weekly",  label: "Weekly",           sub: "Friends over most weekends" },
      { value: "often",   label: "Very often",       sub: "Frequent visitors" },
    ],
  },
  {
    key: "overnight", label: "Are overnight guests okay?", type: "choice",
    options: [
      { value: "never",  label: "Never",                sub: "Strictly no overnight guests" },
      { value: "rarely", label: "Rarely",               sub: "Only in exceptional cases" },
      { value: "ok",     label: "Occasionally fine",    sub: "With advance notice" },
      { value: "often",  label: "No problem",           sub: "Fine with it regularly" },
    ],
  },
  {
    key: "diet", label: "What is your own diet?", type: "choice",
    options: [
      { value: "veg",     label: "Vegetarian",          sub: "Strictly no meat" },
      { value: "non_veg", label: "Non-vegetarian",      sub: "I eat meat" },
      { value: "both",    label: "Flexible",            sub: "Both are fine" },
    ],
  },
  {
    key: "diet_pref", label: "What's your preference for your roommate's diet?", type: "choice",
    options: [
      { value: "veg_only",    label: "Must be vegetarian",     sub: "No non-veg cooking at home" },
      { value: "non_veg_ok",  label: "Non-veg cooking is fine", sub: "No preference" },
      { value: "no_pref",     label: "No preference at all",   sub: "Anything goes" },
    ],
  },
  {
    key: "smoke", label: "Do you smoke at home?", type: "choice",
    options: [
      { value: "no",      label: "No, and prefer roommate doesn't", sub: "Non-smoking household" },
      { value: "yes",     label: "Yes, I smoke at home",            sub: "Or okay with it" },
      { value: "no_pref", label: "I don't smoke, but fine if roommate does", sub: "" },
    ],
  },
  {
    key: "drink", label: "Do you drink at home?", type: "choice",
    options: [
      { value: "no",      label: "No",                          sub: "And prefer roommate doesn't" },
      { value: "yes",     label: "Yes, occasionally",          sub: "Or okay with it" },
      { value: "no_pref", label: "I don't, but no preference", sub: "" },
    ],
  },
  {
    key: "weekend", label: "What's your typical weekend?", type: "choice",
    options: [
      { value: "home_always",    label: "Go home every weekend",     sub: "Travel back to family" },
      { value: "sometimes_home", label: "Home sometimes",            sub: "Mix of both" },
      { value: "stays_in",       label: "Stay in campus/room",       sub: "Quiet weekends" },
      { value: "social",         label: "Social — going out, parties", sub: "Active weekends" },
    ],
  },
  {
    key: "gender_pref", label: "Gender preference for your roommate?", type: "choice",
    options: [
      { value: "same", label: "Same gender only", sub: "" },
      { value: "any",  label: "No preference",    sub: "Any gender is fine" },
    ],
  },
];

export default function RoommateQuizPage() {
  const router  = useRouter();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [bio, setBio]         = useState("");
  const [lookingFor, setLookingFor]   = useState("any");
  const [budgetMax, setBudgetMax]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");

  const total    = QUESTIONS.length + 1; // +1 for preferences step
  const progress = Math.round(((step) / total) * 100);
  const q        = step < QUESTIONS.length ? QUESTIONS[step] : null;
  const isPrefs  = step === QUESTIONS.length;
  const isDone   = Object.keys(answers).length === QUESTIONS.length;

  const select = (value: Answer) => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.key]: value }));
    // Auto-advance
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) setStep((s) => s + 1);
      else setStep(QUESTIONS.length); // go to prefs
    }, 280);
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/roommates/profile", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...answers,
        bio:          bio.trim() || null,
        looking_for:  lookingFor,
        budget_max:   budgetMax ? parseInt(budgetMax) : null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    router.replace("/roommates");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => step > 0 && setStep((s) => s - 1)}
              className={`font-tech text-sm text-white/40 hover:text-white transition-colors ${step === 0 ? "invisible" : ""}`}>
              ← Back
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <motion.div className="h-full rounded-full bg-violet-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }} />
            </div>
            <span className="font-tech text-xs text-white/30 shrink-0">{step + 1}/{total}</span>
          </div>
          {step === 0 && (
            <div className="mb-2">
              <p className="font-pixel text-xs text-violet-400 tracking-widest mb-2">ROOMMATE QUIZ</p>
              <h1 className="font-display font-bold text-white text-3xl">Find your perfect roommate.</h1>
              <p className="font-tech text-sm text-white/50 mt-2">12 honest questions about how you actually live. Takes 2 minutes.</p>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Quiz questions */}
          {q && (
            <motion.div key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="font-display font-bold text-white text-2xl mb-2">{q.label}</h2>
              {q.sub && <p className="font-tech text-sm text-white/50 mb-6">{q.sub}</p>}
              {!q.sub && <div className="mb-6" />}

              <div className="space-y-3">
                {q.options.map((opt) => {
                  const selected = answers[q.key] === opt.value;
                  return (
                    <motion.button
                      key={String(opt.value)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => select(opt.value)}
                      className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-150 ${
                        selected
                          ? "border-violet-500/60 bg-violet-500/12"
                          : "border-white/8 hover:border-white/18"
                      }`}
                      style={{ background: selected ? undefined : "rgba(255,255,255,0.02)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? "border-violet-500 bg-violet-500" : "border-white/20"
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="font-display font-semibold text-white text-sm">{opt.label}</p>
                          {opt.sub && <p className="font-tech text-xs text-white/40 mt-0.5">{opt.sub}</p>}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Preferences step */}
          {isPrefs && (
            <motion.div key="prefs"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="font-display font-bold text-white text-2xl mb-6">Almost done.</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Looking for (housing type)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[{ v: "hostel", l: "Hostel" }, { v: "pg", l: "PG" }, { v: "flat", l: "Flat" }, { v: "any", l: "Any" }].map((o) => (
                      <button key={o.v} onClick={() => setLookingFor(o.v)}
                        className={`px-4 py-2 rounded-xl font-tech text-sm transition-all ${
                          lookingFor === o.v ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/10 text-white/50 hover:text-white"
                        }`}
                        style={{ background: lookingFor === o.v ? undefined : "rgba(255,255,255,0.02)" }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Max budget (₹/month, optional)</label>
                  <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="e.g. 8000"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Short bio for roommate profile (optional)</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell potential roommates something real — your schedule, what you love, what you can't tolerate…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
              </div>

              {error && <p className="font-tech text-sm text-red-400 mb-4">{error}</p>}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={submit}
                disabled={submitting}
                className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg disabled:opacity-40"
              >
                {submitting ? "Saving…" : "Find My Matches →"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
