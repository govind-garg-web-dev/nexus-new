import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intent = searchParams.get("intent") || null;
    const skill  = searchParams.get("skill")  || null;
    const branch = searchParams.get("branch") || null;
    const year   = searchParams.get("year")   ? parseInt(searchParams.get("year")!) : null;
    const page   = parseInt(searchParams.get("page") ?? "0");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Get user's college domain
    const { data: userData } = await supabase
      .from("users")
      .select("college_domain")
      .eq("id", user.id)
      .single();

    if (!userData) return NextResponse.json({ profiles: [] });

    // Get user's embedding for semantic ranking (null if not yet generated)
    const { data: embRow } = await supabase
      .from("embedding_vectors")
      .select("embedding")
      .eq("user_id", user.id)
      .maybeSingle();

    // Call pgvector feed function
    const { data: profiles, error } = await supabase.rpc("get_feed_profiles", {
      p_user_id:        user.id,
      p_college_domain: userData.college_domain,
      p_intent:         intent,
      p_skill:          skill,
      p_branch:         branch,
      p_year:           year,
      p_embedding:      embRow?.embedding ?? null,
      p_limit:          20,
      p_offset:         page * 20,
    });

    if (error) {
      console.error("Feed RPC error:", error);
      return NextResponse.json({ error: "Failed to load feed." }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ profiles: [] });
    }

    // Fetch badges for all returned profiles in a single query
    const profileIds = profiles.map((p: { id: string }) => p.id);
    const { data: badges } = await supabase
      .from("badges")
      .select("user_id, category, difficulty, skill_challenges(title)")
      .in("user_id", profileIds)
      .gt("expires_at", new Date().toISOString());

    // Merge badges into profiles
    const badgeMap: Record<string, typeof badges> = {};
    for (const b of badges ?? []) {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
      badgeMap[b.user_id]!.push(b);
    }

    const enriched = profiles.map((p: { id: string }) => ({
      ...p,
      badges: badgeMap[p.id] ?? [],
    }));

    return NextResponse.json({ profiles: enriched });
  } catch (err) {
    console.error("Feed error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
