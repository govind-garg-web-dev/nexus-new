"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { detectCrisis } from "@/lib/crisis-keywords";
import CrisisOverlay from "@/components/chat/CrisisOverlay";
import { HELPLINES } from "@/lib/crisis-keywords";

type Circle = { id: string; topic: string; description: string; icon: string; color: string; };
type Message = { id: string; content: string; created_at: string; isMe: boolean; memberLabel: string; };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function CircleChatPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [circle, setCircle]         = useState<Circle | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/circles").then((r) => r.json()).then((d) => {
      const found = (d.circles ?? []).find((c: Circle) => c.id === id);
      setCircle(found ?? null);
    });
    fetch(`/api/circles/${id}/messages`).then((r) => r.json()).then((d) => setMessages(d.messages ?? []));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`circle-${id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "circle_messages", filter: `circle_id=eq.${id}`,
      }, () => {
        fetch(`/api/circles/${id}/messages`).then((r) => r.json()).then((d) => setMessages(d.messages ?? []));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    if (detectCrisis(text)) {
      setPendingMsg(text);
      setShowCrisis(true);
      return;
    }
    setSending(true);
    await fetch(`/api/circles/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSending(false);
    setInput("");
  }, [id, sending]);

  const handleSend = () => sendMessage(input);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0"
        style={{ background: "#08080f" }}>
        <button onClick={() => router.back()} className="font-pixel text-white/40 hover:text-white text-lg">←</button>
        {circle && (
          <>
            <span className="text-2xl">{circle.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-white text-sm">{circle.topic}</p>
              <p className="font-tech text-xs text-white/40">Anonymous · All messages shown as "Member"</p>
            </div>
          </>
        )}
      </div>

      {/* Non-therapy disclaimer */}
      <div className="px-4 py-2.5 border-b border-amber-500/15 shrink-0" style={{ background: "rgba(245,158,11,0.05)" }}>
        <p className="font-tech text-xs text-amber-300 leading-relaxed text-center">
          Not therapy · Peer support only · Crisis? Call <span className="font-bold">iCall 9152987821</span> or <span className="font-bold">Vandrevala 1860-2662-345</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="font-tech text-sm text-white/30">No messages yet. Be the first to share.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}>
            <div className={`max-w-[80%] ${m.isMe ? "items-end" : "items-start"} flex flex-col group`}>
              {!m.isMe && (
                <span className="font-pixel text-[10px] text-white/30 mb-1 px-1 tracking-wide">{m.memberLabel}</span>
              )}
              <div className="px-4 py-2.5 rounded-2xl font-tech text-sm leading-relaxed"
                style={m.isMe
                  ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }
                }>
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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center font-pixel text-[10px] text-white/30 shrink-0"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            You
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Share openly. You are anonymous here."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", maxHeight: 100 }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-white shrink-0 disabled:opacity-40"
          >
            {sending ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> : "➤"}
          </motion.button>
        </div>
      </div>

      {/* Crisis overlay */}
      {showCrisis && (
        <CrisisOverlay
          onDismiss={() => { setShowCrisis(false); setPendingMsg(""); }}
          onSafe={() => { const m = pendingMsg; setPendingMsg(""); sendMessage(m); }}
          onNotSafe={() => { setInput(pendingMsg); setPendingMsg(""); }}
        />
      )}
    </div>
  );
}
