import { createClient, getUserId } from "@/lib/supabase/server";
import Link from "next/link";

const CATEGORY_COLOR: Record<string, string> = {
  coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981",
};
const CATEGORY_LABEL: Record<string, string> = {
  coding: "Coding", writing: "Writing", quiz: "Quiz / DSA", design: "Design",
};

export default async function DashboardPage() {
  const [supabase, userId] = await Promise.all([createClient(), getUserId()]);

  // Fetch profile + badges in parallel — no getUser() network call needed
  const [{ data: profile }, { data: badges }] = await Promise.all([
    supabase
      .from("profiles")
      .select("pseudonym, avatar_color, reliability_score, college, branch, batch_year")
      .eq("id", userId!)
      .single(),
    supabase
      .from("badges")
      .select("id, category, difficulty, skill_challenges(title)")
      .eq("user_id", userId!)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const score = profile?.reliability_score ?? 70;
  const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score >= 80 ? "Reliable" : score >= 60 ? "Mixed" : "Caution";

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="font-tech text-sm text-white/50 mb-1">Welcome back</p>
        <h1 className="font-display font-bold text-white text-4xl lg:text-5xl mb-2">
          Hey,{" "}
          <span className="font-script italic" style={{ color: profile?.avatar_color ?? "#a855f7" }}>
            {profile?.pseudonym ?? "..."}
          </span>
        </h1>
        <p className="font-tech text-sm text-white/50">
          {profile?.college}
          {profile?.branch ? ` · ${profile.branch}` : ""}
          {profile?.batch_year ? ` · ${profile.batch_year}` : ""}
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">

        {/* Reliability — special card with bar */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl p-5 border border-white/10"
          style={{ background: `linear-gradient(135deg, ${scoreColor}12, ${scoreColor}06)`, borderColor: `${scoreColor}30` }}>
          <p className="font-tech text-sm text-white/60 mb-3">Reliability Score</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="font-display font-bold text-white text-4xl">{score}</span>
            <span className="font-tech text-base text-white/40 mb-1">/ 100</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 mb-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
          </div>
          <p className="font-tech text-sm font-medium" style={{ color: scoreColor }}>{scoreLabel}</p>
        </div>

        {/* Badges */}
        <div className="rounded-2xl p-5 border border-white/10" style={{ background: "rgba(59,130,246,0.06)" }}>
          <p className="font-tech text-sm text-white/60 mb-3">Badges Earned</p>
          <span className="font-display font-bold text-white text-4xl">{badges?.length ?? 0}</span>
          <p className="font-tech text-sm text-white/40 mt-2">verified skills</p>
        </div>

        {/* Matches */}
        <div className="rounded-2xl p-5 border border-white/10" style={{ background: "rgba(6,182,212,0.06)" }}>
          <p className="font-tech text-sm text-white/60 mb-3">Matches</p>
          <span className="font-display font-bold text-white text-4xl">0</span>
          <p className="font-tech text-sm text-white/40 mt-2">total matches</p>
        </div>

        {/* Referrals */}
        <div className="rounded-2xl p-5 border border-white/10" style={{ background: "rgba(16,185,129,0.06)" }}>
          <p className="font-tech text-sm text-white/60 mb-3">Referrals</p>
          <span className="font-display font-bold text-white text-4xl">0</span>
          <p className="font-tech text-sm text-white/40 mt-2">applied</p>
        </div>
      </div>

      {/* ── Badges section ───────────────────────────────────── */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-white text-xl">Your Badges</h2>
          <Link href="/challenges"
            className="font-tech text-sm text-violet-400 hover:text-violet-300 transition-colors">
            Earn more →
          </Link>
        </div>

        {badges && badges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {badges.map((b) => {
              const color     = CATEGORY_COLOR[b.category] ?? "#7c3aed";
              const catLabel  = CATEGORY_LABEL[b.category] ?? b.category;
              const challenge = Array.isArray(b.skill_challenges)
                ? (b.skill_challenges[0] as { title: string } | undefined)
                : (b.skill_challenges as { title: string } | null);
              return (
                <div key={b.id}
                  className="flex items-center gap-4 rounded-xl p-4 border border-white/10 transition-all hover:border-white/20"
                  style={{ background: `${color}08` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
                    {"◈◎◆❋"[b.difficulty - 1] ?? "◈"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-white text-sm truncate mb-0.5">
                      {challenge?.title ?? catLabel}
                    </p>
                    <p className="font-tech text-xs" style={{ color }}>
                      {catLabel} · Level {b.difficulty}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl p-10 border border-white/10 text-center"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="font-display font-semibold text-white/70 text-lg mb-2">No badges yet</p>
            <p className="font-tech text-sm text-white/40 mb-6">
              Complete a challenge to earn your first verified skill badge.
            </p>
            <Link href="/challenges"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-white font-display font-semibold text-sm">
              Start a Challenge →
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div>
        <h2 className="font-display font-bold text-white text-xl mb-5">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { href: "/challenges", label: "Earn a Badge",      sub: "Prove your skills with auto-graded challenges", icon: "◎", color: "#a855f7" },
            { href: "/feed",       label: "Browse Merit Feed", sub: "Find teammates based on verified skills",        icon: "◈", color: "#3b82f6" },
          ].map((a) => (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-4 rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group"
              style={{ background: `${a.color}08` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-110"
                style={{ background: `${a.color}18`, border: `1px solid ${a.color}35`, color: a.color }}>
                {a.icon}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-white text-base mb-1 group-hover:text-violet-200 transition-colors">
                  {a.label}
                </p>
                <p className="font-tech text-sm text-white/50">{a.sub}</p>
              </div>
              <span className="ml-auto text-white/30 group-hover:text-violet-400 transition-colors text-lg shrink-0">→</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
