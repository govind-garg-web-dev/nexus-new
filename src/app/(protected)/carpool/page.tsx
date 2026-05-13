"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type Post = {
  id: string; from_location: string; to_location: string; travel_date: string;
  seats: number; cost_per_head: number | null; gender_pref: string;
  notes: string | null; status: string; myStatus: string | null;
  poster: { pseudonym: string; avatar_color: string } | null;
};
type MyPost = { id: string; from_location: string; to_location: string; travel_date: string; seats: number; status: string; };
type Revealed = { poster: { name: string; email: string | null; avatarUrl: string | null }; requester: { name: string; email: string | null; avatarUrl: string | null } };

const GENDER_LABEL: Record<string, string> = { any: "Any", male: "Male only", female: "Female only" };

export default function CarpoolPage() {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [myPosts, setMyPosts]   = useState<MyPost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [toast, setToast]       = useState("");
  const [error, setError]       = useState("");
  const [form, setForm] = useState({ fromLocation: "", toLocation: "", travelDate: "", seats: 2, costPerHead: "", genderPref: "any", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const res  = await fetch("/api/carpool");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setMyPosts(data.myPosts ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const postRide = async () => {
    if (!form.fromLocation || !form.toLocation || !form.travelDate) { setError("From, to, and date are required."); return; }
    setSubmitting(true);
    const res = await fetch("/api/carpool", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, costPerHead: form.costPerHead ? parseInt(form.costPerHead) : null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    load();
    showToast("Ride posted!");
  };

  const requestRide = async (postId: string) => {
    setRequesting(postId);
    const res  = await fetch(`/api/carpool/${postId}/request`, { method: "POST" });
    const data = await res.json();
    setRequesting(null);
    if (!res.ok) { setError(data.error); return; }
    load();
    showToast("Request sent! You'll be notified when confirmed.");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Events & Referrals</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Trip-Home <span className="font-script italic gradient-text">Carpool</span>
          </h1>
          <p className="font-tech text-sm text-white/40">
            Campus-verified · Split costs · Identities reveal on mutual confirm
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Post a Ride
        </button>
      </div>

      {/* My posts */}
      {myPosts.length > 0 && (
        <div className="mb-8">
          <p className="font-tech text-sm font-semibold text-white/50 mb-3 tracking-wider">YOUR RIDES</p>
          <div className="space-y-2">
            {myPosts.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl border border-violet-500/20" style={{ background: "rgba(124,58,237,0.06)" }}>
                <p className="font-display font-bold text-white text-sm">
                  {p.from_location} → {p.to_location} · {new Date(p.travel_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
                <p className="font-tech text-xs text-white/40">{p.seats} seats · {p.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="font-display font-semibold text-white text-sm mb-4">Post a Ride</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
                  placeholder="From (e.g. Pune campus)" className="px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
                <input value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
                  placeholder="To (e.g. Mumbai)" className="px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Date</label>
                  <input type="date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-[#0d0d1a]" />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Seats available</label>
                  <input type="number" min={1} max={6} value={form.seats} onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-transparent" />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Cost/head (₹)</label>
                  <input type="number" value={form.costPerHead} onChange={(e) => setForm({ ...form, costPerHead: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none bg-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Gender preference</label>
                  <select value={form.genderPref} onChange={(e) => setForm({ ...form, genderPref: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm bg-[#0d0d1a] focus:outline-none">
                    <option value="any">Any</option>
                    <option value="male">Male only</option>
                    <option value="female">Female only</option>
                  </select>
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Notes (optional)</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Leaving at 6 AM" className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none" style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
              </div>
              {error && <p className="font-tech text-xs text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
                <button onClick={postRide} disabled={!form.fromLocation || !form.toLocation || !form.travelDate || submitting}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                  {submitting ? "Posting…" : "Post Ride →"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rides list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">🚗</p>
          <p className="font-display font-semibold text-white/60 text-lg mb-2">No rides posted yet</p>
          <p className="font-tech text-sm text-white/40">Post your upcoming trip and find people heading the same way.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p, i) => {
            const splitCost = p.cost_per_head;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-start gap-4">
                  <div className="text-2xl shrink-0 mt-1">🚗</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-white text-base mb-1">
                      {p.from_location} <span className="text-white/40">→</span> {p.to_location}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mb-2 text-xs">
                      <span className="font-tech text-white/60">
                        📅 {new Date(p.travel_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <span className="font-tech text-white/40">{p.seats} seat{p.seats !== 1 ? "s" : ""}</span>
                      {splitCost && <span className="font-tech text-emerald-400">₹{splitCost}/head est.</span>}
                      {p.gender_pref !== "any" && <span className="font-tech text-amber-400">{GENDER_LABEL[p.gender_pref]}</span>}
                    </div>
                    {p.notes && <p className="font-tech text-sm text-white/50">{p.notes}</p>}
                    <p className="font-tech text-xs text-white/30 mt-1">Posted by {p.poster?.pseudonym}</p>
                  </div>
                  <div className="shrink-0">
                    {p.myStatus === "pending"    && <span className="font-tech text-xs text-amber-400">Requested ⏳</span>}
                    {p.myStatus === "confirmed"  && <span className="font-tech text-xs text-emerald-400">Confirmed ✓</span>}
                    {!p.myStatus && (
                      <button onClick={() => requestRide(p.id)} disabled={requesting === p.id}
                        className="px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                        {requesting === p.id ? "…" : "Request →"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reveal modal */}
      <AnimatePresence>
        {revealed && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setRevealed(null); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border border-emerald-500/20 p-8 text-center"
              style={{ background: "rgba(16,185,129,0.06)" }}>
              <div className="text-4xl mb-4">🚗</div>
              <h2 className="font-display font-bold text-white text-xl mb-1">Ride Confirmed!</h2>
              <p className="font-tech text-sm text-white/50 mb-6">Both identities revealed. Connect to coordinate.</p>
              {[revealed.poster, revealed.requester].map((person, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 p-3 rounded-xl border border-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {person.avatarUrl ? (
                    <Image src={person.avatarUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-full" unoptimized />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-display font-bold text-white">
                      {person.name[0]}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-display font-bold text-white text-sm">{person.name}</p>
                    <p className="font-tech text-xs text-violet-400">{person.email}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setRevealed(null)} className="w-full py-3 mt-3 rounded-2xl btn-primary text-white font-display font-bold">Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
