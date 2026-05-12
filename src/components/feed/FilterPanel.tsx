"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "@/components/ui/CustomSelect";

export type FeedFilters = {
  intent: string;
  skill:  string;
  branch: string;
  year:   string;
};

const INTENTS = [
  { value: "",           label: "Any" },
  { value: "project",    label: "⚡ Project" },
  { value: "study",      label: "📚 Study" },
  { value: "co_founder", label: "🚀 Co-Founder" },
  { value: "roommate",   label: "🏠 Roommate" },
];

const SKILLS = [
  { value: "",        label: "Any skill" },
  { value: "coding",  label: "◈ Coding" },
  { value: "writing", label: "◎ Writing" },
  { value: "design",  label: "◆ Design" },
  { value: "quiz",    label: "❋ Quiz/DSA" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [
  { value: "", label: "Any year" },
  ...Array.from({ length: 6 }, (_, i) => ({
    value: String(CURRENT_YEAR + i - 2),
    label: String(CURRENT_YEAR + i - 2),
  })),
];

interface Props {
  filters:   FeedFilters;
  onChange:  (f: FeedFilters) => void;
}

export default function FilterPanel({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<FeedFilters>(filters);

  const activeCount = [filters.intent, filters.skill, filters.branch, filters.year]
    .filter(Boolean).length;

  const apply = () => { onChange(local); setOpen(false); };
  const reset = () => {
    const empty = { intent: "", skill: "", branch: "", year: "" };
    setLocal(empty);
    onChange(empty);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-tech text-sm transition-all ${
          activeCount > 0
            ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
            : "border-white/10 bg-white/3 text-white/60 hover:text-white hover:border-white/20"
        }`}
      >
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-violet-500 text-white font-display font-bold text-xs flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <span className="font-pixel text-xs">{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 overflow-hidden z-30 shadow-2xl"
            style={{ background: "#0d0d1a" }}
          >
            <div className="p-4 space-y-4">
              <p className="font-display font-bold text-white text-sm">Filter Feed</p>

              <div>
                <label className="font-tech text-xs text-white/40 block mb-2">Looking for</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {INTENTS.map((i) => (
                    <button
                      key={i.value}
                      onClick={() => setLocal({ ...local, intent: i.value })}
                      className={`px-2 py-2 rounded-lg font-tech text-xs transition-all ${
                        local.intent === i.value
                          ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                          : "border border-white/8 text-white/50 hover:text-white"
                      }`}
                      style={{ background: local.intent === i.value ? undefined : "rgba(255,255,255,0.02)" }}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-tech text-xs text-white/40 block mb-2">Must have badge in</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {SKILLS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setLocal({ ...local, skill: s.value })}
                      className={`px-2 py-2 rounded-lg font-tech text-xs transition-all ${
                        local.skill === s.value
                          ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                          : "border border-white/8 text-white/50 hover:text-white"
                      }`}
                      style={{ background: local.skill === s.value ? undefined : "rgba(255,255,255,0.02)" }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-tech text-xs text-white/40 block mb-2">Graduation year</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {YEARS.map((y) => (
                    <button
                      key={y.value}
                      onClick={() => setLocal({ ...local, year: y.value })}
                      className={`px-2 py-2 rounded-lg font-tech text-xs transition-all ${
                        local.year === y.value
                          ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                          : "border border-white/8 text-white/50 hover:text-white"
                      }`}
                      style={{ background: local.year === y.value ? undefined : "rgba(255,255,255,0.02)" }}
                    >
                      {y.label === "Any year" ? "Any" : y.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={reset} className="flex-1 py-2 rounded-xl font-tech text-xs text-white/40 border border-white/8 hover:text-white transition-colors">
                  Reset
                </button>
                <button onClick={apply} className="flex-1 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
