"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Post = {
  id: string; company: string; role: string; slots: number;
  criteria: string; deadline: string | null; is_alumni: boolean;
  myStatus: string | null; created_at: string;
  poster: { pseudonym: string; avatar_color: string; college: string } | null;
};
type MyPost = { id: string; company: string; role: string; slots: number; active: boolean; created_at: string; };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function ReferralsPage() {
  const router    = useRouter();
  const [posts, setPosts]         = useState<Post[]>([]);
  const [myPosts, setMyPosts]     = useState<MyPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [applyTarget, setApplyTarget] = useState<string | null>(null);
  const [applyNote, setApplyNote] = useState("");
  const [applying, setApplying]   = useState(false);
  const [toast, setToast]         = useState("");
  const [form, setForm]           = useState({ company: "", role: "", slots: 1, criteria: "", deadline: "", isAlumni: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const res  = await fetch("/api/referrals");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setMyPosts(data.myPosts ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const postReferral = async () => {
    if (!form.company || !form.role || !form.criteria) { setError("Company, role, and criteria are required."); return; }
    setSubmitting(true);
    const res  = await fetch("/api/referrals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, deadline: form.deadline || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    setForm({ company: "", role: "", slots: 1, criteria: "", deadline: "", isAlumni: false });
    load();
    showToast("Referral slot posted!");
  };

  const applyToRef = async (postId: string) => {
    setApplying(true);
    const res  = await fetch(`/api/referrals/${postId}/apply`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: applyNote }),
    });
    const data = await res.json();
    setApplying(false);
    setApplyTarget(null);
    setApplyNote("");
    if (!res.ok) { setError(data.error); return; }
    load();
    showToast("Applied anonymously! You'll be notified if selected.");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Events & Referrals</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Referral <span className="font-script italic gradient-text">Exchange</span>
          </h1>
          <p className="font-tech text-sm text-white/40">
            Alumni post slots · You apply anonymously · Identity reveals only on selection
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Post a Slot
        </button>
      </div>

      {/* My posts */}
      {myPosts.length > 0 && (
        <div className="mb-8">
          <p className="font-tech text-sm font-semibold text-white/50 mb-3 tracking-wider">YOUR SLOTS</p>
          <div className="space-y-2">
            {myPosts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-violet-500/20"
                style={{ background: "rgba(124,58,237,0.06)" }}>
                <div>
                  <p className="font-display font-bold text-white text-sm">{p.company} — {p.role}</p>
                  <p className="font-tech text-xs text-white/40">{p.slots} slot{p.slots !== 1 ? "s" : ""} · {timeAgo(p.created_at)}</p>
                </div>
                <button onClick={() => router.push(`/referrals/${p.id}`)}
                  className="px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                  View Applicants →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="font-display font-semibold text-white text-sm mb-4">Post a Referral Slot</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company (e.g. Razorpay)" className="px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors" style={{ background: "rgba(255,255,255,0.03)" }} />
                <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Role (e.g. SDE Intern)" className="px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors" style={{ background: "rgba(255,255,255,0.03)" }} />
              </div>
              <textarea value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                placeholder="Criteria: what you're looking for in the candidate (skills, projects, etc.)"
                rows={2} className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors" style={{ background: "rgba(255,255,255,0.03)" }} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Slots</label>
                  <input type="number" min={1} max={5} value={form.slots} onChange={(e) => setForm({ ...form, slots: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-transparent" />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-[#0d0d1a]" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="alumni" checked={form.isAlumni} onChange={(e) => setForm({ ...form, isAlumni: e.target.checked })} className="w-4 h-4 accent-violet-500" />
                  <label htmlFor="alumni" className="font-tech text-xs text-white/60 cursor-pointer">I&apos;m an alum</label>
                </div>
              </div>
              {error && <p className="font-tech text-xs text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
                <button onClick={postReferral} disabled={!form.company || !form.role || !form.criteria || submitting}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                  {submitting ? "Posting…" : "Post Slot →"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available slots */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">💼</p>
          <p className="font-display font-semibold text-white/60 text-lg mb-2">No open referral slots</p>
          <p className="font-tech text-sm text-white/40">Check back soon. Alumni and seniors post slots regularly during placement season.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center text-2xl shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                  💼
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-display font-bold text-white text-base">{p.company}</h3>
                    <span className="font-tech text-sm text-white/60">— {p.role}</span>
                    {p.is_alumni && <span className="font-pixel text-[10px] text-emerald-400 tracking-widest">ALUMNI</span>}
                  </div>
                  <p className="font-tech text-sm text-white/60 leading-relaxed mb-3">{p.criteria}</p>
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <span className="font-tech text-white/40">
                      {p.poster?.pseudonym} · {p.poster?.college}
                    </span>
                    <span className="font-tech text-white/30">{p.slots} slot{p.slots !== 1 ? "s" : ""}</span>
                    {p.deadline && (
                      <span className="font-tech text-amber-400">
                        Deadline: {new Date(p.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <span className="font-tech text-white/20">{timeAgo(p.created_at)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {p.myStatus === "pending" && <span className="font-tech text-xs text-amber-400">Applied ⏳</span>}
                  {p.myStatus === "selected" && <span className="font-tech text-xs text-emerald-400">Selected ✓</span>}
                  {!p.myStatus && (
                    <button onClick={() => setApplyTarget(p.id)}
                      className="px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                      Apply Anon →
                    </button>
                  )}
                </div>
              </div>
              {/* Apply note */}
              {applyTarget === p.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-white/8">
                  <p className="font-tech text-xs text-white/40 mb-2">
                    Your profile (pseudonym, badges, score) is visible. Paste a 100-word note below.
                  </p>
                  <textarea value={applyNote} onChange={(e) => setApplyNote(e.target.value)}
                    placeholder="Why are you a good fit? (max 100 words)"
                    rows={3} maxLength={700}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-2" style={{ background: "rgba(255,255,255,0.03)" }} />
                  <div className="flex gap-2">
                    <button onClick={() => setApplyTarget(null)} className="flex-1 py-2 rounded-lg font-tech text-xs text-white/40 border border-white/10">Cancel</button>
                    <button onClick={() => applyToRef(p.id)} disabled={applying}
                      className="flex-1 py-2 rounded-lg btn-primary text-white font-display font-semibold text-xs disabled:opacity-40">
                      {applying ? "…" : "Submit (Anonymous)"}
                    </button>
                  </div>
                </motion.div>
              )}
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
