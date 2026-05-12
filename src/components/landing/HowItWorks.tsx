"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "Sign in with Google.",
    sub: "Campus-gated. No exceptions.",
    desc: "Log in with Google. Your account must use a verified college domain — .ac.in, .edu.in, or a whitelisted institute. Gmail gets rejected. This is the first trust gate.",
    color: "#a855f7",
    tag: "IIT · NIT · BITS · IIIT · Top Private",
  },
  {
    num: "02",
    title: "Build your anonymous profile.",
    sub: "Verified, not performed.",
    desc: "Pick a pseudonym. Prove skills with auto-graded challenges — coding, design, writing, DSA. Earn badges that can't be faked. Your real name stays hidden.",
    color: "#3b82f6",
    tag: "Coding · Design · Writing · DSA",
  },
  {
    num: "03",
    title: "Match. Icebreak. Reveal.",
    sub: "Merit first. Identity after.",
    desc: "Swipe the merit feed. Mutual like triggers a shared icebreaker. Both answer. Both reveal at the same moment. Chat opens. Real collaboration begins.",
    color: "#06b6d4",
    tag: "Reliability Score tracks every interaction",
  },
];

function StepCard({ step, index }: { step: (typeof steps)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      {/* Connector line (between cards on desktop) */}
      {index < steps.length - 1 && (
        <div
          className="absolute top-8 left-full w-full h-px pointer-events-none hidden lg:block"
          style={{
            background: `linear-gradient(to right, ${step.color}40, ${steps[index + 1].color}40)`,
            width: "calc(100% - 100%)",
            zIndex: 0,
          }}
        />
      )}

      <div className="glass rounded-2xl p-7 border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300 h-full relative overflow-hidden">
        {/* Step number — big pixel font */}
        <div
          className="font-pixel leading-none mb-4 transition-transform duration-300 group-hover:scale-105"
          style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)", color: `${step.color}40` }}
        >
          {step.num}
        </div>

        {/* Glow dot */}
        <div
          className="absolute top-7 right-7 w-2 h-2 rounded-full"
          style={{
            backgroundColor: step.color,
            boxShadow: `0 0 10px ${step.color}`,
            animation: "pulse-dot 3s ease-in-out infinite",
          }}
        />

        <h3 className="font-display font-bold text-white text-xl mb-1 group-hover:text-violet-100 transition-colors">
          {step.title}
        </h3>
        <p className="font-tech text-[11px] tracking-wider mb-3" style={{ color: step.color }}>
          {step.sub}
        </p>
        <p className="text-[#6a6a8a] text-sm leading-relaxed mb-5">{step.desc}</p>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: `${step.color}0e`, border: `1px solid ${step.color}20` }}
        >
          <span className="font-pixel text-[10px] tracking-widest" style={{ color: `${step.color}aa` }}>
            {step.tag}
          </span>
        </div>

        {/* Bottom shimmer */}
        <div
          className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-700"
          style={{ background: `linear-gradient(to right, ${step.color}50, transparent)` }}
        />
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 px-6 relative" id="how-it-works">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "0%",
          right: "0%",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-pixel text-[12px] tracking-[0.3em] text-cyan-400">HOW IT WORKS</span>
          <h2
            className="font-display font-bold text-white mt-3 mb-4 leading-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}
          >
            Three steps.{" "}
            <span className="font-script italic gradient-text text-[1.1em]">Zero awkwardness.</span>
          </h2>
          <p className="text-[#6a6a8a] max-w-md mx-auto">
            From sign-up to your first real collaboration — no forms, no performative profiles.
          </p>
        </motion.div>

        {/* Step cards */}
        <div className="grid lg:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <StepCard key={s.num} step={s} index={i} />
          ))}
        </div>

        {/* Connecting line graphic on desktop */}
        <div className="hidden lg:flex items-center justify-center gap-0 mt-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}
              />
              {i < steps.length - 1 && (
                <div
                  className="h-px"
                  style={{
                    width: "calc((100vw - 14rem) / 3)",
                    maxWidth: 280,
                    background: `linear-gradient(to right, ${s.color}50, ${steps[i + 1].color}50)`,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
