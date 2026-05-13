import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const [{ data: posts }, { data: myPosts }] = await Promise.all([
      supabase
        .from("carpool_posts")
        .select("id, from_location, to_location, travel_date, seats, cost_per_head, gender_pref, notes, status, created_at, poster_id")
        .eq("status", "open")
        .neq("poster_id", user.id)
        .gte("travel_date", new Date().toISOString().split("T")[0])
        .order("travel_date", { ascending: true })
        .limit(30),
      supabase
        .from("carpool_posts")
        .select("id, from_location, to_location, travel_date, seats, cost_per_head, status, created_at")
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Get poster pseudonyms (anonymous display — no real name)
    const posterIds = [...new Set((posts ?? []).map((p) => p.poster_id))];
    const { data: profiles } = posterIds.length
      ? await supabase.from("profiles").select("id, pseudonym, avatar_color").in("id", posterIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    // My requests
    const postIds = (posts ?? []).map((p) => p.id);
    const { data: myRequests } = postIds.length
      ? await supabase.from("carpool_requests").select("post_id, status").eq("requester_id", user.id).in("post_id", postIds)
      : { data: [] };
    const requestMap = Object.fromEntries((myRequests ?? []).map((r) => [r.post_id, r.status]));

    const enriched = (posts ?? []).map((p) => ({
      ...p,
      poster:    profileMap[p.poster_id] ?? null,
      myStatus:  requestMap[p.id] ?? null,
    }));

    return NextResponse.json({ posts: enriched, myPosts: myPosts ?? [] });
  } catch (err) {
    console.error("Carpool GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { fromLocation, toLocation, travelDate, seats, costPerHead, genderPref, notes } = await request.json();
    if (!fromLocation || !toLocation || !travelDate) {
      return NextResponse.json({ error: "from, to, and date are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { data } = await admin.from("carpool_posts").insert({
      poster_id:     user.id,
      from_location: fromLocation,
      to_location:   toLocation,
      travel_date:   travelDate,
      seats:         seats        ?? 1,
      cost_per_head: costPerHead  ?? null,
      gender_pref:   genderPref   ?? "any",
      notes:         notes?.trim()|| null,
    }).select("id").single();

    return NextResponse.json({ success: true, postId: data?.id });
  } catch (err) {
    console.error("Carpool POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
