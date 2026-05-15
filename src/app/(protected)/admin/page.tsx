"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

// ── Types ───────────────────────────────────────────────────
type User = {
  id: string; email: string; college_domain: string; role: string;
  is_suspended: boolean; onboarding_complete: boolean; created_at: string;
  profile: { pseudonym: string; reliability_score: number } | null;
};
type Campus = {
  id: string; name: string; domain: string; city: string | null;
  state: string | null; student_count: number | null; active: boolean;
  onboarded_at: string; userCount: number;
};
type SocietyReq = {
  id: string; status: string; created_at: string; society_id: string;
  societies: { name: string; college: string; category: string } | null;
};
type Stats = {
  totalUsers: number; activeUsers7d: number; pendingReports: number;
  pendingConfessions: number; totalBadges: number; totalSocieties: number;
  verifiedSocieties: number; campusBreakdown: { domain: string; count: number }[];
};

// ── Shared helpers ──────────────────────────────────────────
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
      <p className="font-tech text-sm text-white/50 mb-2">{label}</p>
      <p className="font-display font-black text-white text-3xl" style={{ color }}>{value.toLocaleString()}</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
type WaitlistEntry = { id: string; phone: string; source: string; created_at: string };
type Tab = "stats" | "users" | "campuses" | "societies" | "referrals" | "waitlist";

export default function AdminPage() {
  const [tab, setTab]           = useState<Tab>("stats");
  const [error, setError]       = useState("");
  const [toast, setToast]       = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Users
  const [users, setUsers]     = useState<User[]>([]);
  const [userQ, setUserQ]     = useState("");
  const [acting, setActing]   = useState<string | null>(null);

  // Campuses
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusForm, setCampusForm] = useState({ name: "", domain: "", city: "", state: "", studentCount: "" });
  const [addingCampus, setAddingCampus] = useState(false);

  // Societies
  const [socRequests, setSocRequests] = useState<SocietyReq[]>([]);

  // Referrals for recruiter tier
  const [referrals, setReferrals] = useState<{ id: string; company: string; role: string; recruiter_tier: boolean; company_verified: boolean; created_at: string }[]>([]);

  // Waitlist
  const [waitlist, setWaitlist]   = useState<WaitlistEntry[]>([]);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) { setError((await res.json()).error); return; }
    setStats(await res.json());
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch(`/api/admin/users?q=${userQ}`);
    if (!res.ok) { setError((await res.json()).error); return; }
    setUsers((await res.json()).users ?? []);
  }, [userQ]);

  const loadCampuses = useCallback(async () => {
    const res = await fetch("/api/admin/campuses");
    if (!res.ok) return;
    setCampuses((await res.json()).campuses ?? []);
  }, []);

  const loadSocieties = useCallback(async () => {
    const res = await fetch("/api/admin/societies/undefined/verify");
    if (!res.ok) return;
    setSocRequests((await res.json()).requests ?? []);
  }, []);

  const loadReferrals = useCallback(async () => {
    const res = await fetch("/api/referrals");
    if (!res.ok) return;
    const data = await res.json();
    setReferrals(data.posts ?? []);
  }, []);

  const loadWaitlist = useCallback(async () => {
    const res = await fetch("/api/admin/waitlist");
    if (!res.ok) return;
    setWaitlist((await res.json()).entries ?? []);
  }, []);

  useEffect(() => {
    if (tab === "stats")     loadStats();
    if (tab === "users")     loadUsers();
    if (tab === "campuses")  loadCampuses();
    if (tab === "societies") loadSocieties();
    if (tab === "referrals") loadReferrals();
    if (tab === "waitlist")  loadWaitlist();
  }, [tab, loadStats, loadUsers, loadCampuses, loadSocieties, loadReferrals, loadWaitlist]);

  const updateRole = async (userId: string, role: string) => {
    setActing(userId);
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setActing(null);
    loadUsers();
    showToast(`Role updated to ${role}`);
  };

  const toggleSuspend = async (userId: string, isSuspended: boolean) => {
    setActing(userId);
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspend: !isSuspended }),
    });
    setActing(null);
    loadUsers();
    showToast(isSuspended ? "Account reinstated" : "Account suspended");
  };

  const addCampus = async () => {
    setAddingCampus(true);
    const res = await fetch("/api/admin/campuses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...campusForm, studentCount: campusForm.studentCount ? parseInt(campusForm.studentCount) : null }),
    });
    setAddingCampus(false);
    if (res.ok) {
      setCampusForm({ name: "", domain: "", city: "", state: "", studentCount: "" });
      loadCampuses();
      showToast("Campus added!");
    }
  };

  const verifySociety = async (societyId: string, action: "approve" | "reject") => {
    setActing(societyId);
    await fetch(`/api/admin/societies/${societyId}/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActing(null);
    loadSocieties();
    showToast(action === "approve" ? "Society verified!" : "Request rejected");
  };

  const toggleRecruiterTier = async (refId: string, current: boolean) => {
    setActing(refId);
    await fetch(`/api/admin/referrals/${refId}/tier`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recruiterTier: !current, companyVerified: !current }),
    });
    setActing(null);
    loadReferrals();
    showToast(!current ? "Recruiter tier enabled" : "Recruiter tier removed");
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "stats",     label: "Overview",     icon: "◈" },
    { key: "users",     label: "Users",         icon: "◎" },
    { key: "campuses",  label: "Campuses",      icon: "🏛" },
    { key: "societies", label: "Society Verify",icon: "✦" },
    { key: "referrals", label: "Recruiter Tier",icon: "💼" },
    { key: "waitlist",  label: "Waitlist",       icon: "📱" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <p className="font-tech text-sm text-white/50 mb-1">System</p>
        <h1 className="font-display font-bold text-white text-4xl mb-1">Admin Panel</h1>
        <p className="font-tech text-sm text-white/40">User management · Campus onboarding · Society verification · Recruiter tier</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 mb-6">
          <p className="font-tech text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-tech text-sm transition-all ${
              tab === t.key ? "btn-primary text-white" : "border border-white/10 text-white/50 hover:text-white"
            }`}
            style={{ background: tab === t.key ? undefined : "rgba(255,255,255,0.02)" }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users"       value={stats.totalUsers}         color="#a855f7" />
            <StatCard label="Active (7 days)"   value={stats.activeUsers7d}      color="#3b82f6" />
            <StatCard label="Pending Reports"   value={stats.pendingReports}     color="#ef4444" />
            <StatCard label="Total Badges"      value={stats.totalBadges}        color="#10b981" />
            <StatCard label="Societies"          value={stats.totalSocieties}     color="#f59e0b" />
            <StatCard label="Verified Societies" value={stats.verifiedSocieties} color="#06b6d4" />
            <StatCard label="Pending Confessions" value={stats.pendingConfessions} color="#ec4899" />
          </div>

          <div className="rounded-2xl border border-white/8 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="font-display font-bold text-white text-base mb-4">Top Campuses by Users</p>
            <div className="space-y-2">
              {stats.campusBreakdown.map((c, i) => (
                <div key={c.domain} className="flex items-center gap-3">
                  <span className="font-tech text-xs text-white/30 w-6 text-right shrink-0">#{i+1}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500"
                      style={{ width: `${(c.count / (stats.campusBreakdown[0]?.count ?? 1)) * 100}%` }} />
                  </div>
                  <span className="font-tech text-xs text-white/60 w-32 truncate shrink-0">{c.domain}</span>
                  <span className="font-display font-bold text-white text-sm shrink-0">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div>
          <div className="flex gap-3 mb-5">
            <input value={userQ} onChange={(e) => setUserQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              placeholder="Search by email or domain…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40"
              style={{ background: "rgba(255,255,255,0.03)" }} />
            <button onClick={loadUsers} className="px-5 py-2.5 rounded-xl btn-primary text-white font-tech text-sm">Search</button>
          </div>
          <div className="space-y-2">
            {users.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-white/8 p-4 flex items-center gap-4"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-display font-semibold text-white text-sm">{u.profile?.pseudonym ?? "—"}</p>
                    <span className={`font-pixel text-[10px] tracking-widest px-1.5 py-0.5 rounded ${
                      u.role === "admin" ? "text-violet-400 bg-violet-500/10" :
                      u.role === "moderator" ? "text-blue-400 bg-blue-500/10" : "text-white/30 bg-white/5"
                    }`}>{u.role.toUpperCase()}</span>
                    {u.is_suspended && <span className="font-pixel text-[10px] text-red-400 tracking-widest">SUSPENDED</span>}
                  </div>
                  <p className="font-tech text-xs text-white/40">{u.email} · {u.college_domain} · Score {u.profile?.reliability_score ?? "—"}</p>
                  <p className="font-tech text-[10px] text-white/20">{timeAgo(u.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}
                    disabled={acting === u.id}
                    className="px-2 py-1.5 rounded-lg border border-white/10 font-tech text-xs text-white bg-[#0d0d1a] focus:outline-none disabled:opacity-40">
                    <option value="user">user</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                  <button onClick={() => toggleSuspend(u.id, u.is_suspended)} disabled={acting === u.id}
                    className={`px-3 py-1.5 rounded-lg font-tech text-xs transition-all disabled:opacity-40 ${
                      u.is_suspended
                        ? "border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10"
                        : "border border-red-500/20 text-red-400 hover:bg-red-500/10"
                    }`}
                    style={{ background: "rgba(255,255,255,0.02)" }}>
                    {acting === u.id ? "…" : u.is_suspended ? "Reinstate" : "Suspend"}
                  </button>
                </div>
              </motion.div>
            ))}
            {users.length === 0 && <p className="font-tech text-sm text-white/40 text-center py-8">Search for users above.</p>}
          </div>
        </div>
      )}

      {/* ── Campuses ── */}
      {tab === "campuses" && (
        <div>
          {/* Add campus form */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="font-display font-semibold text-white text-sm mb-4">Onboard New Campus</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[["College Name", "name", "e.g. IIT Bombay"], ["Domain", "domain", "iitb.ac.in"], ["City", "city", "Mumbai"], ["State", "state", "Maharashtra"]].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="font-tech text-xs text-white/40 block mb-1">{label}</label>
                  <input value={(campusForm as Record<string,string>)[key]} onChange={(e) => setCampusForm({ ...campusForm, [key]: e.target.value })}
                    placeholder={ph} className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40"
                    style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
              ))}
              <div>
                <label className="font-tech text-xs text-white/40 block mb-1">Approx. Student Count</label>
                <input type="number" value={campusForm.studentCount} onChange={(e) => setCampusForm({ ...campusForm, studentCount: e.target.value })}
                  placeholder="5000" className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none bg-transparent" />
              </div>
            </div>
            <button onClick={addCampus} disabled={!campusForm.name || !campusForm.domain || addingCampus}
              className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
              {addingCampus ? "Adding…" : "Onboard Campus →"}
            </button>
          </div>

          <div className="space-y-3">
            {campuses.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-white/8 p-4 flex items-center gap-4"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-white text-sm">{c.name}</p>
                  <p className="font-tech text-xs text-white/50">{c.domain} · {[c.city, c.state].filter(Boolean).join(", ")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-white text-lg">{c.userCount}</p>
                  <p className="font-tech text-xs text-white/30">users</p>
                </div>
              </motion.div>
            ))}
            {campuses.length === 0 && <p className="font-tech text-sm text-white/40 text-center py-8">No campuses added yet. Add the first one above.</p>}
          </div>
        </div>
      )}

      {/* ── Society Verification ── */}
      {tab === "societies" && (
        <div>
          {socRequests.length === 0 ? (
            <div className="rounded-2xl border border-white/8 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-3xl mb-2">✓</p>
              <p className="font-display font-semibold text-white/60 text-lg">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {socRequests.map((r, i) => {
                const s = r.societies;
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-white/8 p-5 flex items-center gap-4"
                    style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-white text-base">{s?.name ?? "—"}</p>
                      <p className="font-tech text-xs text-white/50">{s?.college} · {s?.category} · {timeAgo(r.created_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => verifySociety(r.society_id, "reject")} disabled={acting === r.society_id}
                        className="px-3 py-2 rounded-xl border border-red-500/20 text-red-400 font-tech text-xs hover:bg-red-500/10 disabled:opacity-40">Reject</button>
                      <button onClick={() => verifySociety(r.society_id, "approve")} disabled={acting === r.society_id}
                        className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-display font-semibold text-xs hover:bg-emerald-500/15 disabled:opacity-40">
                        {acting === r.society_id ? "…" : "Verify ✓"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Recruiter Tier ── */}
      {tab === "referrals" && (
        <div>
          <p className="font-tech text-sm text-white/50 mb-5">
            Mark referral posts as "Recruiter Tier" to surface them at the top of the Referral Exchange with a verified badge. Only for companies that have paid.
          </p>
          <div className="space-y-3">
            {referrals.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-white/8 p-4 flex items-center gap-4"
                style={{ background: r.recruiter_tier ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)", borderColor: r.recruiter_tier ? "rgba(245,158,11,0.2)" : undefined }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-display font-bold text-white text-sm">{r.company}</p>
                    {r.recruiter_tier && <span className="font-pixel text-[10px] text-amber-400 tracking-widest">RECRUITER TIER</span>}
                  </div>
                  <p className="font-tech text-xs text-white/50">{r.role} · {timeAgo(r.created_at)}</p>
                </div>
                <button onClick={() => toggleRecruiterTier(r.id, r.recruiter_tier)} disabled={acting === r.id}
                  className={`px-4 py-2 rounded-xl font-display font-semibold text-xs transition-all disabled:opacity-40 ${
                    r.recruiter_tier
                      ? "border border-white/10 text-white/40 hover:text-white"
                      : "bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/15"
                  }`}
                  style={{ background: r.recruiter_tier ? "rgba(255,255,255,0.02)" : undefined }}>
                  {acting === r.id ? "…" : r.recruiter_tier ? "Remove Tier" : "Enable Tier"}
                </button>
              </motion.div>
            ))}
            {referrals.length === 0 && <p className="font-tech text-sm text-white/40 text-center py-8">No referral posts yet.</p>}
          </div>
        </div>
      )}

      {/* ── Waitlist ── */}
      {tab === "waitlist" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-display font-bold text-white text-xl">WhatsApp Waitlist</p>
              <p className="font-tech text-sm text-white/40 mt-0.5">
                {waitlist.length} number{waitlist.length !== 1 ? "s" : ""} collected
              </p>
            </div>
            <a
              href={`data:text/csv;charset=utf-8,Phone,Source,Joined\n${waitlist.map((e) => `+91${e.phone},${e.source},${new Date(e.created_at).toLocaleString("en-IN")}`).join("\n")}`}
              download="matchbatch-waitlist.csv"
              className="px-4 py-2 rounded-xl border border-white/10 font-tech text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              ↓ Export CSV
            </a>
          </div>

          {waitlist.length === 0 ? (
            <div className="rounded-2xl border border-white/8 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-3xl mb-2">📱</p>
              <p className="font-display font-semibold text-white/50 text-lg">No entries yet</p>
              <p className="font-tech text-sm text-white/30 mt-1">Numbers appear here as people join the waitlist.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left px-5 py-3 font-tech text-xs text-white/40 tracking-wider">#</th>
                    <th className="text-left px-5 py-3 font-tech text-xs text-white/40 tracking-wider">WHATSAPP</th>
                    <th className="text-left px-5 py-3 font-tech text-xs text-white/40 tracking-wider">SOURCE</th>
                    <th className="text-left px-5 py-3 font-tech text-xs text-white/40 tracking-wider">JOINED</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((e, i) => (
                    <tr key={e.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 font-tech text-xs text-white/30">{i + 1}</td>
                      <td className="px-5 py-3">
                        <a href={`https://wa.me/91${e.phone}`} target="_blank" rel="noopener noreferrer"
                          className="font-tech text-sm text-green-400 hover:text-green-300 transition-colors">
                          +91 {e.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                        </a>
                      </td>
                      <td className="px-5 py-3 font-pixel text-[10px] tracking-widest text-white/30 uppercase">{e.source}</td>
                      <td className="px-5 py-3 font-tech text-xs text-white/40">{timeAgo(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl"
          style={{ backdropFilter: "blur(12px)" }}>
          <span className="text-emerald-400">✓</span>
          <span className="font-display font-semibold text-white text-sm">{toast}</span>
        </motion.div>
      )}
    </div>
  );
}
