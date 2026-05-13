import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Fetch others' open posts + my own open posts in parallel
    const [{ data: otherPosts }, { data: myPosts }] = await Promise.all([
      supabase
        .from("micro_consulting")
        .select("id, subject, difficulty, description, badge_needed, status, poster_id, created_at, expires_at")
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .neq("poster_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("micro_consulting")
        .select("id, subject, difficulty, description, badge_needed, status, poster_id, created_at, expires_at")
        .in("status", ["open", "accepted"])
        .gt("expires_at", new Date().toISOString())
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Get poster pseudonyms for others' posts
    const posterIds = [...new Set((otherPosts ?? []).map((p) => p.poster_id))];
    const { data: posters } = posterIds.length
      ? await supabase.from("profiles").select("id, pseudonym, avatar_color, reliability_score").in("id", posterIds)
      : { data: [] };

    const posterMap = Object.fromEntries((posters ?? []).map((p) => [p.id, p]));
    const enriched  = (otherPosts ?? []).map((p) => ({ ...p, poster: posterMap[p.poster_id] ?? null }));

    return NextResponse.json({ posts: enriched, myPosts: myPosts ?? [] });
  } catch (err) {
    console.error("Consulting GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { subject, difficulty, description, badgeNeeded } = await request.json();
    if (!subject || !description?.trim()) {
      return NextResponse.json({ error: "subject and description are required." }, { status: 400 });
    }
    if (description.trim().length < 30) {
      return NextResponse.json({ error: "Describe your blocker in at least 30 characters." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin  = createAdminClient();
    const roomId = randomUUID();

    const { data: post } = await admin.from("micro_consulting").insert({
      poster_id:    user.id,
      subject:      subject.trim(),
      difficulty:   difficulty ?? 1,
      description:  description.trim(),
      badge_needed: badgeNeeded ?? null,
      room_id:      roomId,
    }).select("id").single();

    return NextResponse.json({ success: true, postId: post?.id });
  } catch (err) {
    console.error("Consulting POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
