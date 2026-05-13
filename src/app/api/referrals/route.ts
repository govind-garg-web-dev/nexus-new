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
        .from("referral_posts")
        .select("id, company, role, slots, criteria, deadline, is_alumni, created_at, poster_id")
        .eq("active", true)
        .neq("poster_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("referral_posts")
        .select("id, company, role, slots, criteria, deadline, active, created_at")
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Get poster pseudonyms for available posts
    const posterIds = [...new Set((posts ?? []).map((p) => p.poster_id))];
    const { data: posters } = posterIds.length
      ? await supabase.from("profiles").select("id, pseudonym, avatar_color, college").in("id", posterIds)
      : { data: [] };
    const posterMap = Object.fromEntries((posters ?? []).map((p) => [p.id, p]));

    // My applications
    const postIds = (posts ?? []).map((p) => p.id);
    const { data: myApps } = postIds.length
      ? await supabase.from("referral_applications").select("post_id, status").eq("applicant_id", user.id).in("post_id", postIds)
      : { data: [] };
    const appMap = Object.fromEntries((myApps ?? []).map((a) => [a.post_id, a.status]));

    const enriched = (posts ?? []).map((p) => ({
      ...p,
      poster:    posterMap[p.poster_id] ?? null,
      myStatus:  appMap[p.id] ?? null,
    }));

    return NextResponse.json({ posts: enriched, myPosts: myPosts ?? [] });
  } catch (err) {
    console.error("Referrals GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { company, role, slots, criteria, deadline, isAlumni } = await request.json();
    if (!company || !role || !criteria) {
      return NextResponse.json({ error: "company, role, and criteria are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { data } = await admin.from("referral_posts").insert({
      poster_id: user.id,
      company, role,
      slots:    slots    ?? 1,
      criteria,
      deadline: deadline ?? null,
      is_alumni: isAlumni ?? false,
    }).select("id").single();

    return NextResponse.json({ success: true, postId: data?.id });
  } catch (err) {
    console.error("Referrals POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
