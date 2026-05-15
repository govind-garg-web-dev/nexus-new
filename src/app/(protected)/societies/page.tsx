"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Society = { id: string; name: string; category: string; bio: string | null; verified: boolean; isLeader: boolean; };

export default function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ name: "", category: "general", bio: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const res = await fetch("/api/societies");
    const data = await res.json();
    setSocieties(data.societies ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true); setError("");
    const res  = await fetch("/api/societies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false); load();
    showToast("Society created! Pending admin verification.");
  };

  const CATS = ["general","technical","cultural","sports","social","research","other"];

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Community</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Society <span className="font-script italic gradient-text">Dashboard</span>
          </h1>
          <p className="font-tech text-sm text-white/40">Polls · Recruitment · Feedback — all in one place</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Create Society
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="font-display font-semibold text-white text-sm mb-4">Register your society</p>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Society name"
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
              <div className="flex flex-wrap gap-2">
                {CATS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, category: c })}
                    className={`px-3 py-1.5 rounded-lg font-tech text-xs transition-all capitalize ${
                      form.category === c ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/10 text-white/50 hover:text-white"
                    }`}
                    style={{ background: form.category === c ? undefined : "rgba(255,255,255,0.02)" }}>
                    {c}
                  </button>
                ))}
              </div>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="What does your society do?" rows={2}
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
              {error && <p className="font-tech text-xs text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
                <button onClick={create} disabled={!form.name.trim() || submitting}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                  {submitting ? "Creating…" : "Create →"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : societies.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">🏛</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No societies yet</p>
          <p className="font-tech text-sm text-white/40">Create your society to start managing polls, recruitment, and events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {societies.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/societies/${s.id}`}
                className="flex items-center gap-4 p-5 rounded-2xl border border-white/8 hover:border-white/15 transition-all group"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  🏛
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-white text-base group-hover:text-violet-200 transition-colors">{s.name}</h3>
                    {s.verified && <span className="font-pixel text-[10px] text-emerald-400 tracking-widest">VERIFIED</span>}
                    {s.isLeader && <span className="font-pixel text-[10px] text-violet-400 tracking-widest">YOUR SOCIETY</span>}
                  </div>
                  <p className="font-tech text-xs text-white/40 capitalize">{s.category}</p>
                  {s.bio && <p className="font-tech text-xs text-white/40 truncate mt-0.5">{s.bio}</p>}
                </div>
                <span className="text-white/20 group-hover:text-violet-400 transition-colors text-lg">→</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl" style={{ backdropFilter: "blur(12px)" }}>
            <span className="text-emerald-400">✓</span>
            <span className="font-display font-semibold text-white text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
