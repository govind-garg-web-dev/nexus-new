import { createClient, getUserId } from "@/lib/supabase/server";
import Link from "next/link";

const CATEGORY_META: Record<string, { color: string; icon: string; label: string; desc: string }> = {
  coding:  { color: "#a855f7", icon: "◈", label: "Coding",  desc: "Auto-graded against hidden test cases via Judge0" },
  writing: { color: "#3b82f6", icon: "◎", label: "Writing", desc: "Timed prompt — word limit enforced" },
  quiz:    { color: "#06b6d4", icon: "◆", label: "Quiz/DSA",desc: "Multiple choice — 70% to pass" },
  design:  { color: "#10b981", icon: "❋", label: "Design",  desc: "Figma replication — peer reviewed" },
};

const DIFF_LABEL = ["", "Level 1", "Level 2", "Level 3"];
const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];

export default async function ChallengesPage() {
  const [supabase, userId] = await Promise.all([createClient(), getUserId()]);

  const [{ data: challenges }, { data: earnedBadges }, { data: pendingReviews }, { data: myPendingSubmissions }] = await Promise.all([
    supabase
      .from("skill_challenges")
      .select("id, category, difficulty, title, description, time_limit_seconds")
      .order("category")
      .order("difficulty"),
    supabase
      .from("badges")
      .select("challenge_id")
      .eq("user_id", userId!)
      .gt("expires_at", new Date().toISOString()),
    // Count how many writing/design submissions are awaiting review (not mine, not already reviewed by me)
    supabase
      .from("challenge_submissions")
      .select("id")
      .eq("status", "under_review")
      .neq("user_id", userId!)
      .limit(99),
    // My own submissions under review
    supabase
      .from("challenge_submissions")
      .select("challenge_id, status")
      .eq("user_id", userId!)
      .eq("status", "under_review"),
  ]);

  const earnedSet = new Set((earnedBadges ?? []).map((b) => b.challenge_id));

  // Group by category
  const grouped: Record<string, typeof challenges> = {};
  for (const c of challenges ?? []) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category]!.push(c);
  }

  const pendingReviewCount = pendingReviews?.length ?? 0;
  const myPendingSet = new Set((myPendingSubmissions ?? []).map((s) => s.challenge_id));

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-pixel text-[11px] tracking-[0.25em] text-white/40 mb-2">SKILL VERIFICATION</p>
          <h1 className="font-display font-bold text-white text-3xl lg:text-4xl mb-2">
            Earn your{" "}
            <span className="font-script italic gradient-text">badges.</span>
          </h1>
          <p className="font-tech text-sm text-white/40">
            Badges expire after 18 months. Re-challenge to renew.
          </p>
        </div>

        {/* Review queue CTA */}
        <Link
          href="/challenges/review"
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-blue-500/25 hover:border-blue-500/40 transition-all shrink-0"
          style={{ background: "rgba(59,130,246,0.07)" }}
        >
          <div className="text-right">
            <p className="font-display font-bold text-white text-sm">Peer Review Queue</p>
            <p className="font-tech text-xs text-white/50">
              {pendingReviewCount > 0
                ? `${pendingReviewCount} submission${pendingReviewCount !== 1 ? "s" : ""} waiting`
                : "Review others' work"}
            </p>
          </div>
          {pendingReviewCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-display font-bold text-white text-sm shrink-0">
              {pendingReviewCount > 9 ? "9+" : pendingReviewCount}
            </div>
          )}
          {pendingReviewCount === 0 && (
            <span className="text-blue-400 text-lg shrink-0">◇</span>
          )}
        </Link>
      </div>

      {Object.entries(grouped).map(([category, items]) => {
        const meta = CATEGORY_META[category];
        if (!meta || !items) return null;

        return (
          <div key={category} className="mb-12">
            {/* Category header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-pixel text-base"
                style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}25`, color: meta.color }}>
                {meta.icon}
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-lg">{meta.label}</h2>
                <p className="font-tech text-[11px] text-[#5a5a7a]">{meta.desc}</p>
              </div>
            </div>

            {/* Challenge cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((c) => {
                const earned      = earnedSet.has(c.id);
                const underReview = myPendingSet.has(c.id);
                const mins        = Math.round(c.time_limit_seconds / 60);
                const href        = `/${category === "quiz" ? "challenges/quiz" : `challenges/${category}`}/${c.id}`;

                return (
                  <div key={c.id} className="glass rounded-2xl p-5 border border-white/[0.05] hover:border-white/[0.1] transition-all group relative overflow-hidden">
                    {/* Status badge */}
                    {earned && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg"
                        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                        <span className="font-pixel text-[10px] tracking-widest" style={{ color: meta.color }}>EARNED</span>
                      </div>
                    )}
                    {!earned && underReview && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg"
                        style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span className="font-pixel text-[10px] tracking-widest text-amber-400">IN REVIEW</span>
                      </div>
                    )}

                    {/* Difficulty pill */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-pixel text-[10px] tracking-widest px-2 py-0.5 rounded"
                        style={{
                          color: DIFF_COLOR[c.difficulty],
                          background: `${DIFF_COLOR[c.difficulty]}12`,
                          border: `1px solid ${DIFF_COLOR[c.difficulty]}25`,
                        }}>
                        {DIFF_LABEL[c.difficulty]}
                      </span>
                      <span className="font-pixel text-[10px] text-[#4a4a6a]">{mins} MIN</span>
                    </div>

                    <h3 className="font-display font-bold text-white text-base mb-2 group-hover:text-violet-100 transition-colors">
                      {c.title}
                    </h3>
                    <p className="font-tech text-[11px] text-[#5a5a7a] leading-relaxed line-clamp-3 mb-5">
                      {c.description.replace(/`[^`]*`/g, "").slice(0, 100)}…
                    </p>

                    <Link
                      href={href}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-display font-semibold text-xs transition-all ${
                        earned
                          ? "glass border border-white/[0.08] text-[#6a6a8a] hover:text-white"
                          : "btn-primary text-white"
                      }`}
                    >
                      {earned ? "Retake →" : underReview ? "View Status →" : "Start →"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
