"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { detectCrisis } from "@/lib/crisis-keywords";
import CrisisOverlay from "@/components/chat/CrisisOverlay";

type Circle  = { id: string; topic: string; description: string; icon: string; color: string };
type Message = { id: string; content: string; created_at: string; isMe: boolean; memberLabel: string };

// Stable member label map within a session (reset on page reload)
const memberMap = new Map<string, string>();
let memberCounter = 0;
function getMemberLabel(senderId: string, myId: string) {
  if (senderId === myId) return "You";
  if (!memberMap.has(senderId)) { memberCounter++; memberMap.set(senderId, `Member ${memberCounter}`); }
  return memberMap.get(senderId)!;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function CircleChatPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [circle, setCircle]         = useState<Circle | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [myId, setMyId]             = useState<string | null>(null);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Init: get my ID, load circle + initial messages
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));

    fetch("/api/circles").then((r) => r.json()).then((d) => {
      setCircle((d.circles ?? []).find((c: Circle) => c.id === id) ?? null);
    });

    fetch(`/api/circles/${id}/messages`).then((r) => r.json()).then((d) => {
      setMessages(d.messages ?? []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Realtime — only handles messages from OTHER users (we handle ours optimistically)
  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`circle-${id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "circle_messages", filter: `circle_id=eq.${id}` },
        (payload) => {
          const raw = payload.new as { id: string; content: string; sender_id: string; created_at: string };
          if (raw.sender_id === myId) return; // already shown optimistically
          setMessages((prev) => {
            if (prev.some((m) => m.id === raw.id)) return prev;
            return [...prev, {
              id:          raw.id,
              content:     raw.content,
              created_at:  raw.created_at,
              isMe:        false,
              memberLabel: getMemberLabel(raw.sender_id, myId),
            }];
          });
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, myId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending || !myId) return;

    // Optimistic — shows instantly
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId, content: text.trim(),
      created_at: new Date().toISOString(), isMe: true, memberLabel: "You",
    }]);
    setInput("");
    setSending(true);

    const res  = await fetch(`/api/circles/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }
    // Swap temp ID for real server ID
    if (data.message?.id) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: data.message.id } : m));
    }
  }, [id, myId, sending]);

  const handleSend = () => {
    if (detectCrisis(input)) { setPendingMsg(input); setInput(""); setShowCrisis(true); return; }
    sendMessage(input);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0" style={{ background: "#08080f" }}>
        <button onClick={() => router.back()} className="font-pixel text-white/40 hover:text-white text-lg transition-colors">←</button>
        {circle && (
          <>
            <span className="text-2xl">{circle.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-white text-sm">{circle.topic}</p>
              <p className="font-tech text-xs text-white/40">Anonymous · shown as "Member" · no DMs</p>
            </div>
          </>
        )}
      </div>

      {/* Permanent disclaimer */}
      <div className="px-4 py-2.5 border-b border-amber-500/15 shrink-0" style={{ background: "rgba(245,158,11,0.05)" }}>
        <p className="font-tech text-xs text-amber-300 text-center">
          Not therapy · Peer support only · Crisis?{" "}
          <a href="tel:9152987821" className="font-bold underline">iCall 9152987821</a> ·{" "}
          <a href="tel:18602662345" className="font-bold underline">Vandrevala 1860-2662-345</a>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="font-tech text-sm text-white/30">No messages yet — be the first to share.</p>
            <p className="font-tech text-xs text-white/20 mt-1">You are completely anonymous here.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}>
            <div className={`max-w-[78%] flex flex-col group ${m.isMe ? "items-end" : "items-start"}`}>
              {!m.isMe && (
                <span className="font-pixel text-[10px] text-white/30 mb-1 px-1">{m.memberLabel}</span>
              )}
              <div className="px-4 py-2.5 rounded-2xl font-tech text-sm leading-relaxed"
                style={m.isMe
                  ? { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.87)" }}>
                {m.content}
              </div>
              <span className="font-tech text-[10px] text-white/20 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTime(m.created_at)}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/8 shrink-0" style={{ background: "#08080f" }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Share openly — you are anonymous here…"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", maxHeight: 100 }}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
            {sending
              ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
              : <span>➤</span>}
          </button>
        </div>
      </div>

      {showCrisis && (
        <CrisisOverlay
          onDismiss={() => { setShowCrisis(false); setPendingMsg(""); }}
          onSafe={() => { const m = pendingMsg; setPendingMsg(""); setShowCrisis(false); sendMessage(m); }}
          onNotSafe={() => { setInput(pendingMsg); setPendingMsg(""); setShowCrisis(false); }}
        />
      )}
    </div>
  );
}
