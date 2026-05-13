"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Post = {
  id: string; subject: string; difficulty: number; description: string;
  badge_needed: string | null; status: string; created_at: string; expires_at: string;
  poster: { pseudonym: string; avatar_color: string; reliability_score: number } | null;
};

const SUBJECTS = ["DSA", "OS", "DBMS", "CN", "Algorithms", "Math", "C/C++", "Python", "Java", "Web Dev", "ML/AI", "Other"];
const DIFF_LABEL = ["", "Easy", "Medium", "Hard"];
const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];
const BADGE_OPTIONS = ["", "coding", "writing", "design", "quiz"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function PostForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ subject: "", difficulty: 1, description: "", badgeNeeded: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.subject || form.description.trim().length < 30) {
      setError("Subject required and description must be at least 30 chars."); return;
    }
    setSubmitting(true);
    const res = await fetch("/api/consulting", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: form.subject, difficulty: form.difficulty, description: form.description, badgeNeeded: form.badgeNeeded || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    onSuccess();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
        style={{ background: "#0d0d1a" }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-white text-xl">Post a Blocker</h2>
            <button onClick={onClose} className="font-pixel text-white/40 hover:text-white text-lg">✕</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="font-tech text-xs text-white/40 block mb-2">Subject *</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SUBJECTS.map((s) => (
                  <button key={s} onClick={() => setForm({ ...form, subject: s })}
                    className={`py-2 px-2 rounded-lg font-tech text-xs transition-all ${
                      form.subject === s ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/8 text-white/50 hover:text-white"
                    }`}
                    style={{ background: form.subject === s ? undefined : "rgba(255,255,255,0.02)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-tech text-xs text-white/40 block mb-2">Difficulty</label>
              <div className="flex gap-2">
                {[1,2,3].map((d) => (
                  <button key={d} onClick={() => setForm({ ...form, difficulty: d })}
                    className={`flex-1 py-2 rounded-xl font-tech text-sm transition-all ${
                      form.difficulty === d ? "border text-white" : "border border-white/10 text-white/40 hover:text-white"
                    }`}
                    style={{
                      borderColor: form.difficulty === d ? DIFF_COLOR[d] : undefined,
                      background: form.difficulty === d ? `${DIFF_COLOR[d]}15` : "rgba(255,255,255,0.02)",
                      color: form.difficulty === d ? DIFF_COLOR[d] : undefined,
                    }}>
                    {DIFF_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-tech text-xs text-white/40 block mb-2">
                Describe your blocker * <span className="text-white/30">(min 30 chars)</span>
              </label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Segfault on line 42 when freeing a doubly linked list node after traversal…"
                rows={4}
                className="w-full px-3 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)" }} />
              <p className={`font-tech text-xs mt-1 ${form.description.length < 30 ? "text-white/30" : "text-emerald-400"}`}>
                {form.description.length}/30 min chars
              </p>
            </div>
            <div>
              <label className="font-tech text-xs text-white/40 block mb-2">Require solver to have badge in (optional)</label>
              <div className="flex gap-2">
                {BADGE_OPTIONS.map((b) => (
                  <button key={b || "any"} onClick={() => setForm({ ...form, badgeNeeded: b })}
                    className={`flex-1 py-2 rounded-lg font-tech text-xs transition-all ${
                      form.badgeNeeded === b ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/8 text-white/40 hover:text-white"
                    }`}
                    style={{ background: form.badgeNeeded === b ? undefined : "rgba(255,255,255,0.02)" }}>
                    {b || "Any"}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="font-tech text-xs text-red-400">{error}</p>}
            <button onClick={submit} disabled={!form.subject || form.description.length < 30 || submitting}
              className="w-full py-3.5 rounded-2xl btn-primary text-white font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? "Posting…" : "Post Blocker — 1 hour window →"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

type MyPost = {
  id: string; subject: string; difficulty: number; description: string;
  status: string; created_at: string; expires_at: string;
};

export default function ConsultingPage() {
  const router  = useRouter();
  const [posts, setPosts]         = useState<Post[]>([]);
  const [myPosts, setMyPosts]     = useState<MyPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [error, setError]         = useState("");
  const [toast, setToast]         = useState("");

  const load = async () => {
    const res  = await fetch("/api/consulting");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setMyPosts(data.myPosts ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const accept = async (postId: string) => {
    setAccepting(postId);
    setError("");
    const res  = await fetch(`/api/consulting/${postId}/accept`, { method: "POST" });
    const data = await res.json();
    setAccepting(null);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/consulting/${postId}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Academic Vault</p>
          <h1 className="font-display font-bold text-white text-3xl mb-1">
            15-min{" "}
            <span className="font-script italic gradient-text">Help Rooms</span>
          </h1>
          <p className="font-tech text-sm text-white/40">Post a blocker · Get help in 15 min · Audio + shared whiteboard</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Post Blocker
        </button>
      </div>

      {error && <p className="font-tech text-sm text-red-400 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-4">🛠</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No open blockers right now</p>
          <p className="font-tech text-sm text-white/40">Post a blocker and get help from a peer in minutes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-tech text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: "#a855f715", border: "1px solid #a855f730", color: "#a855f7" }}>
                      {post.subject}
                    </span>
                    <span className="font-tech text-xs" style={{ color: DIFF_COLOR[post.difficulty] }}>
                      {DIFF_LABEL[post.difficulty]}
                    </span>
                    {post.badge_needed && (
                      <span className="font-pixel text-[10px] text-white/30 tracking-wider">
                        Needs {post.badge_needed} badge
                      </span>
                    )}
                    <span className="font-tech text-xs text-white/30 ml-auto">{timeAgo(post.created_at)}</span>
                  </div>
                  <p className="font-tech text-sm text-white/80 leading-relaxed mb-3">{post.description}</p>
                  {post.poster && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded flex items-center justify-center font-pixel text-[8px] text-white"
                        style={{ backgroundColor: post.poster.avatar_color }}>
                        {post.poster.pseudonym[0].toUpperCase()}
                      </div>
                      <span className="font-tech text-xs text-white/30">{post.poster.pseudonym}</span>
                      <span className="font-tech text-xs text-white/20">· Score {post.poster.reliability_score}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => accept(post.id)}
                  disabled={accepting === post.id}
                  className="shrink-0 px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm"
                >
                  {accepting === post.id ? "…" : "Help →"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* My active posts */}
      {myPosts.length > 0 && (
        <div className="mb-8">
          <p className="font-tech text-sm font-semibold text-white/50 mb-3 tracking-wider">YOUR ACTIVE POSTS</p>
          <div className="space-y-2">
            {myPosts.map((p) => {
              const minsLeft = Math.max(0, Math.round((new Date(p.expires_at).getTime() - Date.now()) / 60000));
              return (
                <div key={p.id} className="flex items-start gap-4 p-4 rounded-2xl border border-violet-500/20"
                  style={{ background: "rgba(124,58,237,0.06)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-tech text-xs px-2.5 py-0.5 rounded-lg"
                        style={{ background: "#a855f715", border: "1px solid #a855f730", color: "#a855f7" }}>
                        {p.subject}
                      </span>
                      <span className="font-tech text-xs"
                        style={{ color: p.status === "accepted" ? "#10b981" : "#f59e0b" }}>
                        {p.status === "accepted" ? "✓ Someone accepted!" : `⏳ ${minsLeft}m left`}
                      </span>
                    </div>
                    <p className="font-tech text-sm text-white/70 truncate">{p.description}</p>
                  </div>
                  {p.status === "accepted" && (
                    <button onClick={() => router.push(`/consulting/${p.id}`)}
                      className="shrink-0 px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                      Join →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <PostForm
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              load();
              showToast("Your blocker is live! Open for 1 hour.");
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <span className="text-emerald-400 text-lg">✓</span>
            <span className="font-display font-semibold text-white text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
