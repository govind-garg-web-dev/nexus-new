"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Circle = { id: string; topic: string; description: string; icon: string; color: string; };

export default function CirclesListPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/circles").then((r) => r.json()).then((d) => { setCircles(d.circles ?? []); setLoading(false); });
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="mb-10">
        <p className="font-tech text-sm text-white/50 mb-1">Community</p>
        <h1 className="font-display font-bold text-white text-4xl mb-2">
          Peer Support <span className="font-script italic gradient-text">Circles</span>
        </h1>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mt-4">
          <p className="font-tech text-sm text-amber-200 leading-relaxed">
            <span className="font-display font-bold">Not therapy.</span> These are peer support spaces — fellow students sharing experiences.
            For professional help: <span className="font-bold">iCall 9152987821</span> · <span className="font-bold">Vandrevala 1860-2662-345</span>
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/8 p-6 animate-pulse" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="w-10 h-10 rounded-xl bg-white/5 mb-3" />
              <div className="h-4 bg-white/5 rounded mb-2 w-2/3" />
              <div className="h-3 bg-white/5 rounded w-full" />
            </div>
          ))
        ) : circles.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Link href={`/circles/${c.id}`}
              className="block rounded-2xl border border-white/8 p-6 hover:border-white/15 transition-all group"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `${c.color}15`, border: `1px solid ${c.color}25` }}>
                  {c.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-lg mb-1 group-hover:text-violet-200 transition-colors">{c.topic}</h3>
                  <p className="font-tech text-sm text-white/50 leading-relaxed">{c.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <span className="font-tech text-xs text-white/30">Anonymous · Group only · No DMs</span>
                <span className="font-tech text-xs text-violet-400 group-hover:text-violet-300 transition-colors">Enter →</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
