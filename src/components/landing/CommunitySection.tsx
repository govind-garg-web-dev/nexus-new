"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const features = [
  {
    icon: "💬",
    title: "Anonymous Confessions",
    desc: "Say what you actually think — anonymously. College-scoped, ML-moderated, UUID retained internally. Your pseudonym never appears.",
    color: "#a855f7",
    tag: "Anonymous · Moderated",
  },
  {
    icon: "🛍",
    title: "Campus Marketplace",
    desc: "Sell textbooks, cycles, electronics — buy from verified peers. In-person handoff only. Lost & Found built in.",
    color: "#3b82f6",
    tag: "Campus-verified only",
  },
  {
    icon: "💛",
    title: "Peer Support Circles",
    desc: "Exam stress. Homesickness. Career anxiety. Group-only spaces — fully anonymous, with crisis detection and helpline routing.",
    color: "#f59e0b",
    tag: "Not therapy · Peer support",
  },
  {
    icon: "🏛",
    title: "Society Ops Dashboard",
    desc: "Run polls, post recruitment with anonymous portfolios, publish events — all from one verified society dashboard.",
    color: "#10b981",
    tag: "For clubs & societies",
  },
  {
    icon: "🔥",
    title: "Daily Challenges + Leaderboard",
    desc: "One challenge per day. Build a streak. Earn coins redeemable for real prizes. College leaderboard shows who's actually putting in the work.",
    color: "#ef4444",
    tag: "Earn · Compete · Redeem",
  },
  {
    icon: "🪙",
    title: "Coins & Rewards",
    desc: "Help a peer, review a submission, get an event approved — every contribution earns coins. Redeem for gift cards, merch, and more.",
    color: "#f59e0b",
    tag: "No money, real gifts",
  },
];

function Card({ f, index }: { f: typeof features[0]; index: number }) {
  const ref   = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/[0.06] p-6 hover:border-white/[0.12] transition-all duration-300 group relative overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${f.color}0a 0%, transparent 60%)` }} />

      {/* Icon */}
      <div className="text-3xl mb-4">{f.icon}</div>

      {/* Tag */}
      <p className="font-pixel text-[10px] tracking-widest mb-2" style={{ color: f.color }}>
        {f.tag}
      </p>

      <h3 className="font-display font-bold text-white text-lg mb-2 group-hover:text-violet-100 transition-colors">
        {f.title}
      </h3>
      <p className="font-tech text-sm text-white/50 leading-relaxed">{f.desc}</p>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-700"
        style={{ background: `linear-gradient(to right, ${f.color}60, transparent)` }} />
    </motion.div>
  );
}

export default function CommunitySection() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="community" className="py-28 px-6 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Ambient glow */}
      <div className="absolute pointer-events-none" style={{
        top: "20%", right: "0%", width: 500, height: 500,
        background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)",
      }} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-pixel text-[12px] tracking-[0.3em] text-violet-400">COMMUNITY LAYER</span>
          <h2
            className="font-display font-bold text-white mt-3 mb-4 leading-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}
          >
            More than networking.{" "}
            <span className="font-script italic gradient-text text-[1.1em]">A campus life.</span>
          </h2>
          <p className="text-white/50 max-w-lg mx-auto font-tech text-base">
            Every feature built for the real daily problems of Indian college students — not just who&apos;s hiring.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Card key={f.title} f={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
