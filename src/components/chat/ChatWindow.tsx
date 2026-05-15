"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { detectCrisis } from "@/lib/crisis-keywords";
import MessageBubble, { DateDivider, type Message } from "./MessageBubble";
import CrisisOverlay from "./CrisisOverlay";
import { useRouter } from "next/navigation";

interface OtherUser {
  id:           string;
  pseudonym:    string;
  avatar_color: string;
  realName?:    string;
}

interface Props {
  matchId:       string;
  myId:          string;
  otherUser:     OtherUser;
  initialMessages: Message[];
}

export default function ChatWindow({ matchId, myId, otherUser, initialMessages }: Props) {
  const router                  = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [uploading, setUploading]   = useState(false);
  const [blocked, setBlocked]       = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const supabase  = createClient();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // Avoid duplicate if we inserted it ourselves
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return;

    if (detectCrisis(content)) {
      setPendingMessage(content);
      setShowCrisis(true);
      return;
    }

    // Optimistic — shows instantly without waiting for Realtime
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id:         tempId,
      sender_id:  myId,
      content:    content.trim(),
      type:       "text",
      image_url:  null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    const res  = await fetch(`/api/chat/${matchId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      // Revert optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    // Replace temp ID with real server ID from Realtime or response
    if (data.message?.id) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: data.message.id } : m));
    }
  }, [matchId, myId, sending]);

  const handleSend = () => sendMessage(input);

  const handleCrisisSafe = () => {
    // User said they're safe — send the message anyway
    const msg = pendingMessage;
    setPendingMessage("");
    sendMessage(msg);
  };

  const handleCrisisNotSafe = () => {
    // Keep the message in input so they can edit or delete
    setInput(pendingMessage);
    setPendingMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image upload
  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/chat/${matchId}/image`, { method: "POST", body: form });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    // Message arrives via Realtime
  };

  // Block user
  const handleBlock = async () => {
    setBlocking(true);
    await fetch("/api/block", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ blockedId: otherUser.id, reason: "user-initiated" }),
    });
    setBlocking(false);
    setBlocked(true);
    setShowBlockConfirm(false);
    router.push("/feed/matches");
  };

  // Group messages by day for DateDivider
  const grouped: Array<{ type: "divider"; date: string } | { type: "message"; message: Message }> = [];
  let lastDate = "";
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      grouped.push({ type: "divider", date: msg.created_at });
      lastDate = d;
    }
    grouped.push({ type: "message", message: msg });
  }

  // Detect sender groups for avatar display
  const showAvatar = (i: number): boolean => {
    const items   = grouped.filter((g) => g.type === "message") as Array<{ type: "message"; message: Message }>;
    const msgIdx  = items.findIndex((_, idx) => idx === i);
    if (msgIdx === -1) return false;
    const next    = items[msgIdx + 1];
    return !next || next.message.sender_id !== items[msgIdx].message.sender_id;
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0" style={{ background: "#08080f" }}>
        <button onClick={() => router.back()} className="font-pixel text-white/40 hover:text-white transition-colors text-lg mr-1">←</button>

        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-base text-white shrink-0"
          style={{ backgroundColor: otherUser.avatar_color, boxShadow: `0 0 12px ${otherUser.avatar_color}60` }}
        >
          {otherUser.pseudonym[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-white text-sm truncate">
            {otherUser.realName ? `${otherUser.realName}` : otherUser.pseudonym}
          </p>
          {otherUser.realName && (
            <p className="font-tech text-xs text-white/40 truncate">formerly {otherUser.pseudonym}</p>
          )}
        </div>

        {/* Block button */}
        <button
          onClick={() => setShowBlockConfirm(true)}
          className="font-tech text-xs text-white/30 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-red-400/30"
        >
          Block
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {grouped.length === 0 && (
          <div className="text-center py-12">
            <p className="font-tech text-sm text-white/30 mb-1">No messages yet.</p>
            <p className="font-tech text-xs text-white/20">Say hello to {otherUser.pseudonym}!</p>
          </div>
        )}

        {(() => {
          let msgCounter = -1;
          return grouped.map((item, i) => {
            if (item.type === "divider") return <DateDivider key={`d-${i}`} date={item.date} />;
            msgCounter++;
            const msg  = item.message;
            const isMe = msg.sender_id === myId;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMe={isMe}
                showAvatar={!isMe && showAvatar(msgCounter)}
                avatarColor={otherUser.avatar_color}
                pseudonym={otherUser.pseudonym}
              />
            );
          });
        })()}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────── */}
      {!blocked && (
        <div className="px-4 py-3 border-t border-white/8 shrink-0" style={{ background: "#08080f" }}>
          <div className="flex items-end gap-2">
            {/* Image upload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all shrink-0 disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              {uploading ? (
                <div className="w-3.5 h-3.5 rounded-full border border-violet-400 border-t-transparent animate-spin" />
              ) : "📎"}
            </button>

            {/* Text input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", minHeight: 40, maxHeight: 120 }}
            />

            {/* Send */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
              ) : "➤"}
            </motion.button>
          </div>
        </div>
      )}

      {blocked && (
        <div className="px-4 py-4 border-t border-white/8 text-center">
          <p className="font-tech text-sm text-white/40">This conversation has been blocked.</p>
        </div>
      )}

      {/* ── Crisis overlay ─────────────────────────────────── */}
      {showCrisis && (
        <CrisisOverlay
          onDismiss={() => { setShowCrisis(false); setPendingMessage(""); }}
          onSafe={handleCrisisSafe}
          onNotSafe={handleCrisisNotSafe}
        />
      )}

      {/* ── Block confirm ──────────────────────────────────── */}
      <AnimatePresence>
        {showBlockConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBlockConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 p-6"
              style={{ background: "#0d0d1a" }}
            >
              <h2 className="font-display font-bold text-white text-lg mb-2">Block {otherUser.pseudonym}?</h2>
              <p className="font-tech text-sm text-white/50 mb-6 leading-relaxed">
                This is permanent. They will never appear in your feed again, and this conversation will be closed. You can report them instead if you&apos;d prefer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBlockConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 font-tech text-sm text-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleBlock}
                  disabled={blocking}
                  className="flex-1 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-display font-semibold text-sm hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  {blocking ? "Blocking…" : "Block Permanently"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
