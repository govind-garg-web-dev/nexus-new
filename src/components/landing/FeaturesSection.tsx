"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const features = [
  {
    id: "people",
    module: "MODULE A",
    title: "Find Your People",
    sub: "Skill-Based Matching",
    desc: "Swipeable merit feed of anonymous profiles — pseudonym, badges, projects, reliability score. Mutual like → icebreaker question → simultaneous reveal. Chat opens only after both answer.",
    icon: "◈",
    color: "#a855f7",
    span: "lg:col-span-2",
    pills: ["Merit Feed", "Icebreaker → Reveal", "Co-Founder Mode", "Semantic AI Matching"],
  },
  {
    id: "academic",
    module: "MODULE C",
    title: "Academic Vault",
    sub: "Pass Your Courses",
    desc: "PYQs indexed by college → branch → semester → course. Professor reviews by verified takers. Pomodoro study rooms. 15-min micro-consulting for blockers.",
    icon: "◎",
    color: "#3b82f6",
    span: "",
    pills: ["PYQ Vault", "Course Reviews", "Study Rooms", "Micro-Consulting"],
  },
  {
    id: "events",
    module: "MODULE D",
    title: "Events & Referrals",
    sub: "Win Opportunities",
    desc: "Curated hackathon hub. Team lobbies with badge-filtered applications. The Referral Exchange: alumni post slots, juniors apply anonymously, get picked on merit. Identity reveals only after selection.",
    icon: "◆",
    color: "#06b6d4",
    span: "",
    pills: ["Event Hub", "Team Formation", "Referral Exchange", "Carpool"],
  },
  {
    id: "roommates",
    module: "MODULE B",
    title: "Roommates",
    sub: "Live Where You Want",
    desc: "12-question lifestyle quiz with weighted compatibility. Hard-mismatch flagging. PG group finder for campus-verified students only.",
    icon: "⌂",
    color: "#10b981",
    span: "",
    pills: ["Lifestyle Quiz", "Compatibility Score", "PG Finder"],
  },
  {
    id: "community",
    module: "MODULE E",
    title: "Community",
    sub: "The Sticky Stuff",
    desc: "College-scoped anonymous confessions with ML moderation. Campus marketplace. Peer mental health circles. Society ops dashboard.",
    icon: "❋",
    color: "#f59e0b",
    span: "",
    pills: ["Confessions", "Marketplace", "Mental Health", "Society Ops"],
  },
];

function FeatureCard({ f, index }: { f: (typeof features)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ delay: index * 0.07, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl p-6 border border-white/[0.05] hover:border-white/[0.09] transition-all duration-300 group relative overflow-hidden ${f.span}`}
    >
      {/* Hover radial glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${f.color}09 0%, transparent 55%)`,
        }}
      />

      {/* Module tag + icon */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-pixel text-[11px] tracking-[0.22em]" style={{ color: f.color }}>
          {f.module}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
          style={{ background: `${f.color}12`, border: `1px solid ${f.color}25` }}
        >
          <span className="font-pixel text-base" style={{ color: f.color }}>
            {f.icon}
          </span>
        </div>
      </div>

      <h3 className="font-display font-bold text-white text-xl mb-1 group-hover:text-violet-100 transition-colors">
        {f.title}
      </h3>
      <p className="font-tech text-[11px] tracking-wide text-[#5a5a7a] mb-3">{f.sub}</p>
      <p className="text-[#6a6a8a] text-sm leading-relaxed mb-5">{f.desc}</p>

      {/* Pills */}
      <div className="flex flex-wrap gap-2">
        {f.pills.map((pill) => (
          <span
            key={pill}
            className="px-2.5 py-1 rounded-lg font-pixel text-[10px] tracking-wider transition-all duration-200 hover:scale-105"
            style={{
              background: `${f.color}0e`,
              border: `1px solid ${f.color}22`,
              color: `${f.color}cc`,
            }}
          >
            {pill}
          </span>
        ))}
      </div>

      {/* Bottom shimmer line on hover */}
      <div
        className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-700"
        style={{ background: `linear-gradient(to right, ${f.color}50, transparent)` }}
      />
    </motion.div>
  );
}

export default function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 px-6 relative" id="features">
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 400,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-pixel text-[12px] tracking-[0.3em] text-blue-400">WHAT IT DOES</span>
          <h2
            className="font-display font-bold text-white mt-3 mb-4 leading-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}
          >
            Five modules.{" "}
            <span className="font-script italic gradient-text text-[1.1em]">One campus.</span>
          </h2>
          <p className="text-[#6a6a8a] max-w-md mx-auto text-base">
            Every feature maps to a real, painful, daily problem.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={f.id} f={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
