import { createClient, getUserId } from "@/lib/supabase/server";
import SwipeFeed from "@/components/feed/SwipeFeed";

export default async function FeedPage() {
  const [supabase, userId] = await Promise.all([createClient(), getUserId()]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudonym, avatar_color")
    .eq("id", userId!)
    .single();

  return (
    <SwipeFeed
      myProfile={{
        pseudonym:    profile?.pseudonym    ?? "You",
        avatar_color: profile?.avatar_color ?? "#7c3aed",
      }}
    />
  );
}
