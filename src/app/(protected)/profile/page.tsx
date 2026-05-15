"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const AVATAR_COLORS = [
  "#7c3aed","#4f46e5","#2563eb","#0891b2",
  "#059669","#d97706","#dc2626","#db2777",
];

const INTENTS = [
  { value: "general",    label: "Open to connect" },
  { value: "project",    label: "Looking for project teammate" },
  { value: "study",      label: "Looking for study partner" },
  { value: "co_founder", label: "Looking for co-founder" },
  { value: "roommate",   label: "Looking for roommate" },
];

const BRANCHES = [
  "Computer Science & Engineering","Information Technology",
  "Electronics & Communication Engineering","Electrical Engineering",
  "Mechanical Engineering","Civil Engineering","Chemical Engineering",
  "Biotechnology","Mathematics & Computing","Physics","MBA / Management",
  "Design","Architecture","Other",
];

const INTERESTS_SUGGESTIONS = [
  "distributed systems","machine learning","web development","open source",
  "fintech","climate tech","competitive programming","UI/UX","blockchain",
  "DevOps","mobile development","data science","robotics","game development",
];

type Profile = {
  pseudonym: string; college: string; branch: string | null; batch_year: number | null;
  bio: string | null; interests: string[] | null; github_url: string | null;
  behance_url: string | null; avatar_color: string; reliability_score: number;
  intent: string | null; vault_karma: number;
};

type Badge = { id: string; category: string; difficulty: number; expires_at: string; skill_challenges?: { title: string } };

const CATEGORY_COLOR: Record<string, string> = { coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981", contributor: "#f59e0b" };

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [badges, setBadges]     = useState<Badge[]>([]);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [interest, setInterest] = useState("");

  // Edit state
  const [form, setForm] = useState({
    bio: "", interests: [] as string[], github_url: "", behance_url: "",
    avatar_color: "#7c3aed", intent: "general", branch: "", batch_year: 0,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("badges").select("id, category, difficulty, expires_at, skill_challenges(title)")
          .eq("user_id", user.id).gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }),
      ]);

      if (p) {
        setProfile(p as Profile);
        setForm({
          bio:          p.bio          ?? "",
          interests:    p.interests    ?? [],
          github_url:   p.github_url   ?? "",
          behance_url:  p.behance_url  ?? "",
          avatar_color: p.avatar_color ?? "#7c3aed",
          intent:       p.intent       ?? "general",
          branch:       p.branch       ?? "",
          batch_year:   p.batch_year   ?? 0,
        });
      }
      setBadges((b ?? []).map((badge) => ({
        ...badge,
        skill_challenges: Array.isArray(badge.skill_challenges)
          ? badge.skill_challenges[0] ?? null
          : badge.skill_challenges,
      })) as Badge[]);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      bio:          form.bio.trim()        || null,
      interests:    form.interests,
      github_url:   form.github_url.trim() || null,
      behance_url:  form.behance_url.trim()|| null,
      avatar_color: form.avatar_color,
      intent:       form.intent,
      branch:       form.branch            || null,
      batch_year:   form.batch_year        || null,
    }).eq("id", user.id);

    setSaving(false);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...form } : prev);
      setEditing(false);
      showToast("Profile updated!");
    }
  };

  const addInterest = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || form.interests.includes(t) || form.interests.length >= 8) return;
    setForm({ ...form, interests: [...form.interests, t] });
    setInterest("");
  };

  const removeInterest = (tag: string) => {
    setForm({ ...form, interests: form.interests.filter((i) => i !== tag) });
  };

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  const scoreColor = profile.reliability_score >= 80 ? "#10b981" : profile.reliability_score >= 60 ? "#f59e0b" : "#ef4444";
  const scoreLabel = profile.reliability_score >= 80 ? "Reliable" : profile.reliability_score >= 60 ? "Mixed" : "Caution";

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">My Account</p>
          <h1 className="font-display font-bold text-white text-4xl">Profile</h1>
        </div>
        <button
          onClick={() => editing ? save() : setEditing(true)}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40"
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Edit Profile"}
        </button>
      </div>

      {/* Avatar + identity */}
      <div className="rounded-3xl border border-white/10 p-6 mb-6" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-5 mb-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-3xl text-white"
              style={{ backgroundColor: editing ? form.avatar_color : profile.avatar_color, boxShadow: `0 0 20px ${editing ? form.avatar_color : profile.avatar_color}60` }}>
              {profile.pseudonym[0].toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-white text-2xl mb-0.5">{profile.pseudonym}</h2>
            <p className="font-tech text-sm text-white/50">{profile.college}</p>
            <p className="font-tech text-xs text-white/40">{profile.branch} · {profile.batch_year}</p>
          </div>

          {/* Score */}
          <div className="text-center shrink-0">
            <p className="font-display font-black text-white text-3xl">{profile.reliability_score}</p>
            <p className="font-tech text-xs font-semibold" style={{ color: scoreColor }}>{scoreLabel}</p>
            <p className="font-tech text-[10px] text-white/30 mt-0.5">Reliability</p>
          </div>
        </div>

        {/* Avatar color picker (edit mode) */}
        {editing && (
          <div className="mb-4">
            <p className="font-tech text-xs text-white/50 mb-2 font-semibold">Avatar Color</p>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, avatar_color: c })}
                  className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: form.avatar_color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-6 pt-4 border-t border-white/5">
          {[
            { label: "Badges", value: badges.length },
            { label: "Karma", value: profile.vault_karma },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display font-bold text-white text-xl">{s.value}</p>
              <p className="font-tech text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable fields */}
      <div className="rounded-2xl border border-white/10 p-6 mb-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="font-display font-bold text-white text-base border-b border-white/5 pb-3">About</p>

        {/* Intent */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Currently looking for</label>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {INTENTS.map((i) => (
                <button key={i.value} onClick={() => setForm({ ...form, intent: i.value })}
                  className={`px-3 py-1.5 rounded-lg font-tech text-xs transition-all ${
                    form.intent === i.value ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/10 text-white/50 hover:text-white"
                  }`}
                  style={{ background: form.intent === i.value ? undefined : "rgba(255,255,255,0.02)" }}>
                  {i.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="font-tech text-sm text-white/70">
              {INTENTS.find((i) => i.value === profile.intent)?.label ?? "Open to connect"}
            </p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Bio</label>
          {editing ? (
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell your campus who you are — what you build, what you care about…"
              rows={3} maxLength={300}
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }} />
          ) : (
            <p className="font-tech text-sm text-white/70 leading-relaxed">
              {profile.bio ?? <span className="text-white/30 italic">No bio yet — click Edit to add one</span>}
            </p>
          )}
        </div>

        {/* Interests */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Interests</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(editing ? form.interests : profile.interests ?? []).map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-tech text-xs bg-white/5 border border-white/10 text-white/70">
                {tag}
                {editing && (
                  <button onClick={() => removeInterest(tag)} className="text-white/30 hover:text-red-400 transition-colors ml-0.5">✕</button>
                )}
              </span>
            ))}
            {(editing ? form.interests : profile.interests ?? []).length === 0 && !editing && (
              <span className="font-tech text-xs text-white/30 italic">No interests added</span>
            )}
          </div>
          {editing && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={interest} onChange={(e) => setInterest(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(interest); } }}
                  placeholder="Add an interest + Enter"
                  className="flex-1 px-3 py-2 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40"
                  style={{ background: "rgba(255,255,255,0.03)" }} />
                <button onClick={() => addInterest(interest)} className="px-3 py-2 rounded-xl btn-primary text-white font-tech text-sm">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INTERESTS_SUGGESTIONS.filter((s) => !form.interests.includes(s)).slice(0, 8).map((s) => (
                  <button key={s} onClick={() => addInterest(s)}
                    className="px-2.5 py-1 rounded-lg font-tech text-xs text-white/40 border border-dashed border-white/10 hover:text-violet-400 hover:border-violet-500/30 transition-all">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "GitHub URL", key: "github_url" as const, ph: "github.com/username" },
            { label: "Behance / Portfolio", key: "behance_url" as const, ph: "behance.net/username" },
          ].map(({ label, key, ph }) => (
            <div key={key}>
              <label className="font-tech text-xs text-white/50 font-semibold block mb-2">{label}</label>
              {editing ? (
                <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={ph}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40"
                  style={{ background: "rgba(255,255,255,0.03)" }} />
              ) : (
                <p className="font-tech text-sm text-violet-400">
                  {profile[key]
                    ? <a href={`https://${profile[key]}`} target="_blank" rel="noopener noreferrer" className="hover:text-violet-300 transition-colors">{profile[key]}</a>
                    : <span className="text-white/30 italic">Not set</span>}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Branch + batch year (edit only) */}
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Branch</label>
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm bg-[#0d0d1a] focus:outline-none">
                <option value="">Select branch</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Graduation Year</label>
              <select value={form.batch_year} onChange={(e) => setForm({ ...form, batch_year: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm bg-[#0d0d1a] focus:outline-none">
                <option value="">Select year</option>
                {Array.from({ length: 7 }, (_, i) => 2024 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {editing && (
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-xl border border-white/10 font-tech text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl btn-primary text-white font-display font-bold disabled:opacity-40">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="rounded-2xl border border-white/10 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="font-display font-bold text-white text-base mb-5 border-b border-white/5 pb-3">
          Verified Badges <span className="font-tech text-sm text-white/40 font-normal">({badges.length})</span>
        </p>
        {badges.length === 0 ? (
          <p className="font-tech text-sm text-white/40 text-center py-4">No badges yet — complete challenges to earn them.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {badges.map((b) => {
              const color   = CATEGORY_COLOR[b.category] ?? "#a855f7";
              const expires = new Date(b.expires_at);
              const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000);
              const challengeTitle = (b.skill_challenges as { title: string } | null)?.title ?? b.category;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5"
                  style={{ background: `${color}08` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
                    ◈
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-white text-xs truncate">{challengeTitle}</p>
                    <p className="font-tech text-[10px]" style={{ color }}>
                      {b.category.toUpperCase()} · L{b.difficulty}
                    </p>
                    <p className="font-tech text-[10px] text-white/20">{daysLeft}d left</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl"
            style={{ backdropFilter: "blur(12px)" }}>
            <span className="text-emerald-400">✓</span>
            <span className="font-display font-semibold text-white text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
