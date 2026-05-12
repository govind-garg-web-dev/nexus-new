"use client";

import { useState } from "react";
import Image from "next/image";

export type Message = {
  id:         string;
  sender_id:  string;
  content:    string | null;
  type:       "text" | "image" | "system";
  image_url:  string | null;
  created_at: string;
};

interface Props {
  message:      Message;
  isMe:         boolean;
  showAvatar:   boolean;
  avatarColor:  string;
  pseudonym:    string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour:   "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/8" />
      <span className="font-tech text-xs text-white/30 shrink-0">{formatDate(date)}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

export function SystemMessage({ content }: { content: string }) {
  return (
    <div className="text-center my-3">
      <span className="font-tech text-xs text-white/30 px-3 py-1 rounded-full bg-white/4 border border-white/8">
        {content}
      </span>
    </div>
  );
}

export default function MessageBubble({ message, isMe, showAvatar, avatarColor, pseudonym }: Props) {
  const [imageOpen, setImageOpen] = useState(false);

  if (message.type === "system") return <SystemMessage content={message.content ?? ""} />;

  return (
    <div className={`flex items-end gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar (theirs only, shown once per group) */}
      {!isMe && (
        <div className="shrink-0 mb-0.5" style={{ width: 28 }}>
          {showAvatar ? (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-xs text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {pseudonym[0].toUpperCase()}
            </div>
          ) : null}
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[72%] group ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {message.type === "image" && message.image_url ? (
          <>
            <button onClick={() => setImageOpen(true)} className="rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-colors">
              <Image
                src={message.image_url}
                alt="Image"
                width={240}
                height={180}
                className="object-cover"
                unoptimized
              />
            </button>

            {/* Lightbox */}
            {imageOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.9)" }}
                onClick={() => setImageOpen(false)}
              >
                <Image
                  src={message.image_url}
                  alt="Image"
                  width={800}
                  height={600}
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                  unoptimized
                />
              </div>
            )}
          </>
        ) : (
          <div
            className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
            style={
              isMe
                ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff" }
                : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)" }
            }
          >
            <span className="font-tech">{message.content}</span>
          </div>
        )}

        {/* Timestamp (show on hover) */}
        <span className="font-tech text-[10px] text-white/20 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
