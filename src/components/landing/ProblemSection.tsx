"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const problems = [
  {
    icon: "◈",
    title: "Skill discovery is broken.",
    body: "LinkedIn is performative. WhatsApp hackathon groups are noisy and skill-blind. Finding a frontend dev for a 48-hour build means spamming friends-of-friends.",
    color: "#a855f7",
    label: "PROBLEM 01",
  },
  {
    icon: "⌂",
    title: "Roommate matching is luck.",
    body: "Hostel allocation is random. PG matching happens via WhatsApp forwards. One lifestyle mismatch — sleep schedule, cleanliness, noise — wrecks an entire semester.",
    color: "#3b82f6",
    label: "PROBLEM 02",
  },
  {
    icon: "◎",
    title: "Academic resources are scattered.",
    body: "PYQs live in a thousand Google Drive folders and seniors' phones. Freshmen get nothing. You find the notes at 2 AM before the exam.",
    color: "#06b6d4",
    label: "PROBLEM 03",
  },
  {
    icon: "◆",
    title: "The referral network is closed.",
    body: "Referrals at top companies go to whoever the senior remembers from their hostel wing. The most deserving juniors have no senior who knows them.",
    color: "#10b981",
    label: "PROBLEM 04",
  },
];

function ProblemCard({ p, index }: { p: (typeof problems)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.09, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-6 border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300 group hover:-translate-y-1"
    >
      {/* Label */}
      <p className="font-pixel text-[11px] tracking-[0.25em] mb-4" style={{ color: p.color }}>
        {p.label}
      </p>

      {/* Icon badge */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `${p.color}12`,
          border: `1px solid ${p.color}25`,
        }}
      >
        <span className="font-pixel text-xl" style={{ color: p.color }}>
          {p.icon}
        </span>
      </div>

      <h3 className="font-display font-bold text-white text-lg mb-2 group-hover:text-violet-100 transition-colors">
        {p.title}
      </h3>
      <p className="text-[#6a6a8a] text-sm leading-relaxed">{p.body}</p>

      {/* Bottom accent line */}
      <div
        className="mt-5 h-px w-0 group-hover:w-full transition-all duration-500 rounded-full"
        style={{ background: `linear-gradient(to right, ${p.color}60, transparent)` }}
      />
    </motion.div>
  );
}

export default function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 px-6 relative" id="problems">
      {/* Section divider top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="font-pixel text-[12px] tracking-[0.3em] text-violet-400">THE REALITY</span>
          <h2
            className="font-display font-bold text-white mt-3 mb-4 leading-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}
          >
            Campus life,{" "}
            <span className="font-script italic gradient-text text-[1.1em]">honestly.</span>
          </h2>
          <p className="text-[#6a6a8a] max-w-md mx-auto text-base">
            Four real, painful, daily problems that no existing product solves well.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map((p, i) => (
            <ProblemCard key={p.label} p={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
