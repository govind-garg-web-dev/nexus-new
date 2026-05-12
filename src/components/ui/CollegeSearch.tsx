"use client";

import { useState, useRef, useEffect } from "react";
import { INDIAN_COLLEGES } from "@/lib/indian-colleges";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function CollegeSearch({ value, onChange }: Props) {
  const [query, setQuery]   = useState(value);
  const [open, setOpen]     = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  const filtered =
    query.length >= 3
      ? INDIAN_COLLEGES.filter((c) =>
          c.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 9)
      : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (college: string) => {
    setQuery(college);
    onChange(college);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => { setFocused(true); if (query.length >= 3) setOpen(true); }}
        onBlur={() => setFocused(false)}
        placeholder="Type 3+ letters of your college…"
        className={`w-full px-4 py-3.5 rounded-xl bg-white/[0.03] border text-white placeholder-[#3a3a5a] font-tech text-sm focus:outline-none transition-all ${
          focused ? "border-violet-500/50 bg-white/[0.05]" : "border-white/[0.1]"
        }`}
      />

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl border border-white/[0.1] overflow-hidden shadow-2xl"
          style={{ background: "#0d0d1a", backdropFilter: "blur(16px)" }}>
          {filtered.map((college) => (
            <button
              key={college}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onClick={() => handleSelect(college)}
              className={`w-full text-left px-4 py-3 font-tech text-sm text-white border-b border-white/[0.05] last:border-0 transition-colors hover:bg-violet-500/10 hover:text-violet-200 ${
                college === value ? "bg-violet-500/10 text-violet-300" : ""
              }`}
            >
              {college}
            </button>
          ))}
        </div>
      )}

      {/* No match hint */}
      {open && query.length >= 3 && filtered.length === 0 && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl border border-white/[0.08] px-4 py-3"
          style={{ background: "#0d0d1a" }}>
          <p className="font-tech text-xs text-[#5a5a7a]">
            No match — type your full college name and continue.
          </p>
        </div>
      )}
    </div>
  );
}
