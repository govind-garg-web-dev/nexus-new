"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Session = {
  id: string; subject: string; description: string; status: string;
  poster_id: string; solver_id: string | null; room_id: string | null;
  accepted_at: string | null;
};

export default function ConsultingSessionPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [session, setSession]       = useState<Session | null>(null);
  const [myId, setMyId]             = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [copied, setCopied]         = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
      supabase
        .from("micro_consulting")
        .select("id, subject, description, status, poster_id, solver_id, room_id, accepted_at")
        .eq("id", id)
        .single()
        .then(({ data }) => { setSession(data); setLoading(false); });
    });
  }, [id]);

  const complete = async () => {
    setCompleting(true);
    await fetch(`/api/consulting/${id}/complete`, { method: "POST" });
    setCompleting(false);
    router.push("/consulting");
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!session || !session.room_id) return (
    <div className="text-center p-10">
      <p className="font-tech text-white/60">Session not found or not yet accepted.</p>
    </div>
  );

  const excalidrawUrl = `https://excalidraw.com/#room=${session.room_id.replace(/-/g, "").slice(0, 20)},nexus${session.room_id.replace(/-/g, "").slice(20, 32)}`;

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button onClick={() => router.push("/consulting")}
          className="font-tech text-sm text-white/40 hover:text-white transition-colors">
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-white text-lg truncate">{session.subject}</h1>
          <p className="font-tech text-xs text-white/40 truncate">{session.description.slice(0, 80)}…</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-tech text-xs text-emerald-300">Session active · 15 min</span>
          </div>
          <button onClick={complete} disabled={completing}
            className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-display font-semibold text-sm hover:bg-emerald-500/15 transition-colors disabled:opacity-40">
            {completing ? "…" : "✓ Mark Complete"}
          </button>
        </div>
      </div>

      {/* Main: whiteboard takes full width, no audio panel */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Whiteboard */}
        <div className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-white/8 shrink-0 flex items-center justify-between">
            <p className="font-tech text-xs text-white/50">🖊 Shared Whiteboard — Excalidraw</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => copyLink(excalidrawUrl)}
                className="font-tech text-xs text-white/40 hover:text-white transition-colors"
              >
                {copied ? "✓ Copied" : "Copy link"}
              </button>
              <a href={excalidrawUrl} target="_blank" rel="noopener noreferrer"
                className="font-tech text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Open in new tab ↗
              </a>
            </div>
          </div>
          <iframe src={excalidrawUrl} className="flex-1 w-full border-0" />
        </div>
      </div>
    </div>
  );
}
