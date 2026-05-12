import { createClient, getUserId } from "@/lib/supabase/server";
import Link from "next/link";

type ConversationRow = {
  matchId:      string;
  pseudonym:    string;
  avatarColor:  string;
  lastMessage:  string | null;
  lastTime:     string | null;
  unread:       boolean;
};

export default async function ChatInboxPage() {
  const [supabase, userId] = await Promise.all([createClient(), getUserId()]);
  const user = { id: userId! };

  // All revealed matches for this user
  const { data: matches } = await supabase
    .from("match_events")
    .select("id, user_a_id, user_b_id, revealed_at")
    .or(`user_a_id.eq.${user!.id},user_b_id.eq.${user!.id}`)
    .eq("status", "revealed")
    .order("revealed_at", { ascending: false });

  const conversations: ConversationRow[] = [];

  if (matches && matches.length > 0) {
    const otherIds = matches.map((m) =>
      m.user_a_id === user!.id ? m.user_b_id : m.user_a_id
    );

    // Get profiles of the other users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, pseudonym, avatar_color")
      .in("id", otherIds);

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p])
    );

    // Get the last message per match in one query
    const matchIds = matches.map((m) => m.id);
    const { data: lastMessages } = await supabase
      .from("messages")
      .select("match_id, content, type, created_at, sender_id")
      .in("match_id", matchIds)
      .neq("type", "system")
      .order("created_at", { ascending: false });

    // Build a map: matchId → last message
    const lastMsgMap: Record<string, { content: string | null; type: string; time: string; senderId: string }> = {};
    for (const msg of lastMessages ?? []) {
      if (!lastMsgMap[msg.match_id]) {
        lastMsgMap[msg.match_id] = {
          content:  msg.content,
          type:     msg.type,
          time:     msg.created_at,
          senderId: msg.sender_id,
        };
      }
    }

    for (const match of matches) {
      const otherId  = match.user_a_id === user!.id ? match.user_b_id : match.user_a_id;
      const profile  = profileMap[otherId];
      const lastMsg  = lastMsgMap[match.id];

      let preview = "Tap to start chatting";
      if (lastMsg) {
        if (lastMsg.type === "image") preview = "📷 Image";
        else if (lastMsg.content) preview = lastMsg.content.slice(0, 60) + (lastMsg.content.length > 60 ? "…" : "");
      }

      conversations.push({
        matchId:     match.id,
        pseudonym:   profile?.pseudonym   ?? "Unknown",
        avatarColor: profile?.avatar_color ?? "#7c3aed",
        lastMessage: preview,
        lastTime:    lastMsg?.time ?? match.revealed_at,
        unread:      false, // unread tracking comes in a future update
      });
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl mb-1">Messages</h1>
        <p className="font-tech text-sm text-white/40">
          Only with people whose identities you&apos;ve mutually revealed.
        </p>
      </div>

      {conversations.length === 0 ? (
        /* ── Empty state ─────────────────────────────────── */
        <div className="rounded-3xl border border-white/10 p-10 text-center"
          style={{ background: "rgba(255,255,255,0.02)" }}>

          {/* Icon */}
          <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
            💬
          </div>

          <h2 className="font-display font-bold text-white text-2xl mb-3">
            No conversations yet
          </h2>
          <p className="font-tech text-sm text-white/50 leading-relaxed max-w-sm mx-auto mb-8">
            Chat unlocks after you and another person mutually like each other,
            answer an icebreaker, and reveal your real identities.
          </p>

          {/* Step hints */}
          <div className="flex flex-col gap-3 text-left max-w-xs mx-auto mb-8">
            {[
              { step: "1", label: "Swipe right on someone in the Merit Feed", done: false },
              { step: "2", label: "Get a mutual match",                        done: false },
              { step: "3", label: "Both answer the icebreaker question",       done: false },
              { step: "4", label: "Reveal identities — chat opens instantly",  done: false },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border border-violet-500/40 bg-violet-500/10 flex items-center justify-center font-tech text-xs text-violet-400 shrink-0">
                  {s.step}
                </div>
                <span className="font-tech text-sm text-white/60">{s.label}</span>
              </div>
            ))}
          </div>

          <Link
            href="/feed"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl btn-primary text-white font-display font-bold text-base"
          >
            Go to Merit Feed ◆
          </Link>
        </div>
      ) : (
        /* ── Conversation list ───────────────────────────── */
        <div className="space-y-2">
          {conversations.map((c) => {
            const time = c.lastTime
              ? new Date(c.lastTime).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit", hour12: true,
                })
              : "";

            return (
              <Link
                key={c.matchId}
                href={`/chat/${c.matchId}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 hover:border-white/15 transition-all group"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-black text-xl text-white shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: c.avatarColor,
                    boxShadow: `0 0 14px ${c.avatarColor}50`,
                  }}
                >
                  {c.pseudonym[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-display font-bold text-white text-sm group-hover:text-violet-200 transition-colors">
                      {c.pseudonym}
                    </p>
                    <span className="font-tech text-xs text-white/30 shrink-0 ml-2">{time}</span>
                  </div>
                  <p className="font-tech text-xs text-white/40 truncate">{c.lastMessage}</p>
                </div>

                {/* Arrow */}
                <span className="text-white/20 group-hover:text-violet-400 transition-colors shrink-0">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
