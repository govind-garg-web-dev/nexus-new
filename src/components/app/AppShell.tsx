"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Profile = {
  pseudonym:         string;
  avatar_color:      string;
  reliability_score: number;
  college:           string;
} | null;

const NAV = [
  { href: "/dashboard",         label: "Dashboard",    icon: "◈" },
  { href: "/feed",              label: "Merit Feed",   icon: "◆" },
  { href: "/chat",              label: "Chat",         icon: "💬" },
  { href: "/vault",             label: "Academic Vault", icon: "📚" },
  { href: "/study-rooms",       label: "Study Rooms",  icon: "🍅" },
  { href: "/consulting",        label: "Help Rooms",   icon: "🛠" },
  { href: "/challenges",        label: "Challenges",   icon: "◎" },
  { href: "/co-founder",        label: "Co-Founder",   icon: "🚀" },
  { href: "/profile",           label: "My Profile",   icon: "❋" },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "#10b981" :
    score >= 60 ? "#f59e0b" : "#ef4444";
  const label =
    score >= 80 ? "RELIABLE" :
    score >= 60 ? "MIXED"    : "CAUTION";

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8">
        <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="12" fill="none"
            stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 12}`}
            strokeDashoffset={`${2 * Math.PI * 12 * (1 - score / 100)}`}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-tech text-[9px] font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <span className="font-tech text-xs tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

export default function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  const pathname      = usePathname();
  const router        = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-void flex">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 border-r border-white/6 bg-[#08080f] z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-blue-600 flex items-center justify-center glow-sm-violet shrink-0">
              <span className="font-pixel text-white text-sm">N</span>
            </div>
            <span className="font-display font-bold text-white tracking-tight">NEXUS</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? "bg-violet-500/10 border border-violet-500/20"
                    : "hover:bg-white/4 border border-transparent"
                }`}
              >
                <span
                  className="font-pixel text-base transition-colors"
                  style={{ color: active ? "#a78bfa" : "#7070a0" }}
                >
                  {item.icon}
                </span>
                <span className={`font-tech text-sm tracking-wide transition-colors ${
                  active ? "text-violet-300" : "text-white/50 group-hover:text-white"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        {profile && (
          <div className="px-3 py-4 border-t border-white/5 space-y-3">
            <ScoreBadge score={profile.reliability_score} />
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-pixel text-white text-sm shrink-0"
                style={{ backgroundColor: profile.avatar_color, boxShadow: `0 0 8px ${profile.avatar_color}50` }}
              >
                {profile.pseudonym?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-tech text-sm text-white truncate font-medium">{profile.pseudonym}</p>
                <p className="font-tech text-xs text-white/40 truncate">{profile.college}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full font-tech text-xs text-white/30 hover:text-red-400 transition-colors text-left"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* ── Mobile topbar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/6 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-blue-600 flex items-center justify-center">
            <span className="font-pixel text-white text-sm">N</span>
          </div>
          <span className="font-display font-bold text-white">NEXUS</span>
        </Link>
        <button onClick={() => setOpen(!open)} className="p-1">
          <span className="font-pixel text-white text-lg">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden fixed top-12 left-0 right-0 z-30 glass border-b border-white/6 px-4 py-3 flex flex-col gap-1"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors"
            >
              <span className="font-pixel text-white/40">{item.icon}</span>
              <span className="font-tech text-sm text-white/60">{item.label}</span>
            </Link>
          ))}
        </motion.div>
      )}

      {/* ── Main content ── */}
      <main className="lg:ml-56 flex-1 min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
