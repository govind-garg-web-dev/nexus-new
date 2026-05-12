import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudonym, avatar_color, reliability_score, college, branch, batch_year")
    .eq("id", user!.id)
    .single();

  const { data: badges } = await supabase
    .from("badges")
    .select("id, category, difficulty, skill_challenges(title)")
    .eq("user_id", user!.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(6);

  const CATEGORY_COLOR: Record<string, string> = {
    coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981",
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="font-pixel text-[11px] tracking-[0.25em] text-[#5a5a7a] mb-2">WELCOME BACK</p>
        <h1 className="font-display font-bold text-white text-3xl lg:text-4xl">
          Hey,{" "}
          <span
            className="font-script italic"
            style={{ color: profile?.avatar_color ?? "#a855f7" }}
          >
            {profile?.pseudonym ?? "..."}
          </span>
        </h1>
        <p className="font-tech text-xs text-[#5a5a7a] mt-1">
          {profile?.college} · {profile?.branch} · {profile?.batch_year}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "RELIABILITY", value: profile?.reliability_score ?? 70, suffix: "/100", color: "#a855f7" },
          { label: "BADGES", value: badges?.length ?? 0, suffix: " earned", color: "#3b82f6" },
          { label: "MATCHES", value: 0, suffix: " total", color: "#06b6d4" },
          { label: "REFERRALS", value: 0, suffix: " applied", color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5 border border-white/[0.05]">
            <p className="font-pixel text-[10px] tracking-widest mb-2" style={{ color: s.color }}>{s.label}</p>
            <p className="font-display font-bold text-white text-2xl">
              {s.value}<span className="font-tech text-xs text-[#5a5a7a]">{s.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="font-pixel text-[11px] tracking-[0.25em] text-[#5a5a7a]">YOUR BADGES</p>
          <Link href="/challenges" className="font-tech text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Earn more →
          </Link>
        </div>
        {badges && badges.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {badges.map((b) => {
              const color = CATEGORY_COLOR[b.category] ?? "#7c3aed";
              const challenge = Array.isArray(b.skill_challenges) ? b.skill_challenges[0] as { title: string } | undefined : b.skill_challenges as { title: string } | null;
              return (
                <div key={b.id} className="glass rounded-xl p-4 border border-white/[0.05] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-pixel text-base shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
                    {"◈◎◆❋"[b.difficulty - 1] ?? "◈"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-tech text-xs text-white truncate">{challenge?.title ?? b.category}</p>
                    <p className="font-pixel text-[10px] tracking-widest" style={{ color }}>
                      {b.category.toUpperCase()} · L{b.difficulty}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 border border-white/[0.05] text-center">
            <p className="font-pixel text-[11px] tracking-widest text-[#4a4a6a] mb-3">NO BADGES YET</p>
            <p className="font-tech text-xs text-[#4a4a6a] mb-4">Complete challenges to earn verified skill badges.</p>
            <Link href="/challenges"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
              Start a Challenge →
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <p className="font-pixel text-[11px] tracking-[0.25em] text-[#5a5a7a] mb-4">QUICK ACTIONS</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { href: "/challenges", label: "Earn a Badge", sub: "Prove your skills", icon: "◎", color: "#a855f7" },
            { href: "/feed",       label: "Browse Merit Feed", sub: "Find teammates", icon: "◈", color: "#3b82f6" },
          ].map((a) => (
            <Link key={a.href} href={a.href}
              className="glass rounded-2xl p-5 border border-white/[0.05] hover:border-white/[0.1] transition-all group flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-pixel text-lg shrink-0"
                style={{ background: `${a.color}12`, border: `1px solid ${a.color}25`, color: a.color }}>
                {a.icon}
              </div>
              <div>
                <p className="font-display font-semibold text-white text-sm group-hover:text-violet-200 transition-colors">{a.label}</p>
                <p className="font-tech text-[11px] text-[#5a5a7a]">{a.sub}</p>
              </div>
              <span className="ml-auto font-pixel text-[#3a3a5a] group-hover:text-violet-400 transition-colors">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
