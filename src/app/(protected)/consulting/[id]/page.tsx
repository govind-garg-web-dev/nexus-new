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
  const [session, setSession]     = useState<Session | null>(null);
  const [myId, setMyId]           = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
    });
  }, []);

  useEffect(() => {
    fetch("/api/consulting")
      .then((r) => r.json())
      .then((d) => {
        // The session might have been accepted, load all statuses
        // Actually we need to query by ID — use Supabase directly
      });
    // Fetch session directly
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.from("micro_consulting")
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

  const jitsiRoom    = `nexus-consult-${session.room_id}`;
  const excalidrawUrl = `https://excalidraw.com/#room=${session.room_id.replace(/-/g, "").slice(0, 20)},nexus${session.room_id.replace(/-/g, "").slice(20, 32)}`;

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col p-4 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button onClick={() => router.push("/consulting")}
          className="font-tech text-sm text-white/40 hover:text-white transition-colors">← Back</button>
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

      {/* Two-panel layout: Jitsi audio | Excalidraw whiteboard */}
      <div className="flex-1 grid lg:grid-cols-[340px_1fr] gap-4 min-h-0">
        {/* Jitsi audio */}
        <div className="rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-white/8 shrink-0">
            <p className="font-tech text-xs text-white/50">🎙 Audio — Jitsi Meet</p>
          </div>
          <iframe
            src={`https://meet.jit.si/${jitsiRoom}#config.startWithAudioMuted=false&config.startWithVideoMuted=true&config.toolbarButtons=["microphone","hangup","desktop"]&config.disableDeepLinking=true`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="flex-1 w-full border-0"
          />
        </div>

        {/* Excalidraw whiteboard */}
        <div className="rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-white/8 shrink-0 flex items-center justify-between">
            <p className="font-tech text-xs text-white/50">🖊 Shared Whiteboard — Excalidraw</p>
            <a href={excalidrawUrl} target="_blank" rel="noopener noreferrer"
              className="font-tech text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Open in new tab ↗
            </a>
          </div>
          <iframe
            src={excalidrawUrl}
            className="flex-1 w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
