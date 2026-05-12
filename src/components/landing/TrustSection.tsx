"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

const trustLayers = [
  {
    num: "01",
    title: "Verified Skill Badges",
    desc: "Auto-graded challenges — coding (Judge0), design replication, timed writing. Badges expire after 18 months. You can't fake them.",
    color: "#a855f7",
    items: ["Python · JS · C++ · Java", "Figma replication", "Timed writing", "DSA adaptive quiz"],
  },
  {
    num: "02",
    title: "Peer Endorsements",
    desc: "Only from people you've actually collaborated with. Weighted by the endorser's own skill level. 20 per semester max to prevent inflation.",
    color: "#3b82f6",
    items: ["Verified collaboration gate", "Weighted by skill level", "20/semester cap"],
  },
  {
    num: "03",
    title: "Reliability Score",
    desc: "0–100. Starts at 70. Goes up with completions and endorsements. Goes down with ghosting, no-shows, and reports. Below 40: shadow-banned.",
    color: "#06b6d4",
    items: ["Ghost penalty: −5", "No-show: −10", "Below 40 = shadow ban", "Below 25 = suspended"],
  },
];

function ScoreGauge({ score, color, inView }: { score: number; color: string; inView: boolean }) {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = score;
    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (end - start) * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, score]);

  const offset = circ - (displayScore / 100) * circ;

  const scoreLabel =
    displayScore >= 80 ? "RELIABLE" : displayScore >= 60 ? "MIXED" : "CAUTION";
  const scoreColor =
    displayScore >= 80 ? "#10b981" : displayScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={160} viewBox="0 0 160 160">
        {/* Track */}
        <circle
          cx={80}
          cy={80}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={8}
        />
        {/* Progress arc */}
        <circle
          cx={80}
          cy={80}
          r={radius}
          fill="none"
          stroke={`url(#gaugeGrad)`}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          style={{ transition: "stroke-dashoffset 0.05s linear", filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        {/* Score number */}
        <text
          x={80}
          y={76}
          textAnchor="middle"
          fill="white"
          fontFamily="var(--font-space-mono)"
          fontSize={28}
          fontWeight="700"
        >
          {displayScore}
        </text>
        {/* Label */}
        <text
          x={80}
          y={96}
          textAnchor="middle"
          fill={scoreColor}
          fontFamily="var(--font-vt323)"
          fontSize={13}
          letterSpacing={2}
        >
          {scoreLabel}
        </text>
      </svg>
      <p className="font-pixel text-[11px] tracking-[0.2em] text-[#5a5a7a] mt-2">RELIABILITY SCORE</p>
    </div>
  );
}

function LayerCard({ layer, index }: { layer: (typeof trustLayers)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-6 border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-pixel text-base transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${layer.color}12`, border: `1px solid ${layer.color}25`, color: layer.color }}
        >
          {layer.num}
        </div>
        <div>
          <h4 className="font-display font-bold text-white mb-1">{layer.title}</h4>
          <p className="text-[#6a6a8a] text-sm leading-relaxed mb-3">{layer.desc}</p>
          <div className="flex flex-wrap gap-1.5">
            {layer.items.map((item) => (
              <span
                key={item}
                className="font-pixel text-[10px] tracking-wide px-2 py-0.5 rounded"
                style={{ background: `${layer.color}0e`, color: `${layer.color}99`, border: `1px solid ${layer.color}18` }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TrustSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const gaugeRef = useRef(null);
  const gaugeInView = useInView(gaugeRef, { once: true, margin: "-100px" });

  return (
    <section className="py-28 px-6 relative" id="trust">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "20%",
          left: "-5%",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-pixel text-[12px] tracking-[0.3em] text-emerald-400">THE TRUST LAYER</span>
          <h2
            className="font-display font-bold text-white mt-3 mb-4 leading-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}
          >
            Merit you can{" "}
            <span className="font-script italic gradient-text text-[1.1em]">actually verify.</span>
          </h2>
          <p className="text-[#6a6a8a] max-w-md mx-auto">
            Three layers of trust. No self-claimed skills. No fake badges. No ghosting without consequences.
          </p>
        </motion.div>

        {/* Content: gauge + layers */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: animated gauge */}
          <motion.div
            ref={gaugeRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={gaugeInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-8"
          >
            <ScoreGauge score={87} color="#a855f7" inView={gaugeInView} />

            {/* Example profiles */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {[
                { name: "PixelMage", score: 94, color: "#a855f7" },
                { name: "ByteBuild", score: 87, color: "#3b82f6" },
                { name: "CodeSage", score: 62, color: "#f59e0b" },
              ].map((p) => (
                <div key={p.name} className="glass rounded-xl p-3 text-center border border-white/[0.05]">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-pixel text-white text-sm mx-auto mb-2"
                    style={{ background: `${p.color}20`, border: `1px solid ${p.color}30` }}
                  >
                    {p.name[0]}
                  </div>
                  <p className="font-tech text-[9px] text-white/50 mb-1">{p.name}</p>
                  <p className="font-pixel text-sm" style={{ color: p.color }}>{p.score}</p>
                </div>
              ))}
            </div>

            <p className="font-pixel text-[11px] tracking-[0.2em] text-[#4a4a6a] text-center max-w-xs">
              SCORE IS PUBLIC. SOCIAL PRESSURE IS THE FEATURE.
            </p>
          </motion.div>

          {/* Right: trust layer cards */}
          <div className="flex flex-col gap-4">
            {trustLayers.map((layer, i) => (
              <LayerCard key={layer.num} layer={layer} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
