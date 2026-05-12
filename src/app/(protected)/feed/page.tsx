import { createClient } from "@/lib/supabase/server";
import SwipeFeed from "@/components/feed/SwipeFeed";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudonym, avatar_color")
    .eq("id", user!.id)
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
