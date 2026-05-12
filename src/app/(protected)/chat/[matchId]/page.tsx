import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import ChatWindow from "@/components/chat/ChatWindow";

export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase    = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Load match — verify participation + revealed status
  const { data: match } = await supabase
    .from("match_events")
    .select("id, user_a_id, user_b_id, status, revealed_at")
    .eq("id", matchId)
    .single();

  if (!match) notFound();
  if (match.user_a_id !== user.id && match.user_b_id !== user.id) notFound();
  if (match.status !== "revealed") redirect(`/feed/icebreaker/${matchId}`);

  const otherId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;

  // Get other user's public profile
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("pseudonym, avatar_color")
    .eq("id", otherId)
    .single();

  // Get other user's real identity (via reveal service logic)
  // We read from auth.users via admin client — the same data the reveal API returns
  const admin = createAdminClient();
  const { data: { user: otherAuthUser } } = await admin.auth.admin.getUserById(otherId);
  const realName = otherAuthUser?.user_metadata?.full_name ?? null;

  // Load initial messages (SSR for instant render)
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, type, image_url, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(200);

  // Insert system message if this is a fresh chat
  if (!messages || messages.length === 0) {
    await admin.from("messages").insert({
      match_id:  matchId,
      sender_id: user.id,
      type:      "system",
      content:   "Identities revealed. This conversation is private and server-logged.",
    });
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatWindow
        matchId={matchId}
        myId={user.id}
        otherUser={{
          id:           otherId,
          pseudonym:    otherProfile?.pseudonym   ?? "Unknown",
          avatar_color: otherProfile?.avatar_color ?? "#7c3aed",
          realName:     realName ?? undefined,
        }}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
