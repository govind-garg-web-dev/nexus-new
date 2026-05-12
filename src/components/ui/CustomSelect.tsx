"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  options:     string[];
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
}

export default function CustomSelect({ options, value, onChange, placeholder }: Props) {
  const [open, setOpen]     = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);
  const listRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && value && listRef.current) {
      const el = listRef.current.querySelector(`[data-selected="true"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setFocused(true); }}
        onBlur={() => setFocused(false)}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/[0.03] border text-left transition-all focus:outline-none ${
          open || focused ? "border-violet-500/50 bg-white/[0.05]" : "border-white/[0.1]"
        }`}
      >
        <span className={`font-tech text-sm ${value ? "text-white" : "text-[#3a3a5a]"}`}>
          {value || placeholder}
        </span>
        <span className="font-tech text-[#5a5a7a] text-xs ml-2 shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl border border-white/[0.1] overflow-y-auto shadow-2xl"
          style={{ background: "#0d0d1a", backdropFilter: "blur(16px)", maxHeight: "220px" }}
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                data-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-3 font-tech text-sm border-b border-white/[0.04] last:border-0 transition-colors ${
                  selected
                    ? "text-violet-300 bg-violet-500/10"
                    : "text-white hover:bg-white/[0.05] hover:text-violet-200"
                }`}
              >
                {selected && <span className="mr-2 text-violet-400">✓</span>}
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
