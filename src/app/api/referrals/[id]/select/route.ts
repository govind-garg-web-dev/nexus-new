import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// GET — referrer fetches anonymous applicant profiles for their post
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: post } = await supabase
      .from("referral_posts").select("id, poster_id").eq("id", id).single();
    if (!post || post.poster_id !== user.id)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const { data: apps } = await supabase
      .from("referral_applications")
      .select("id, applicant_id, note, status, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: false });

    if (!apps?.length) return NextResponse.json({ applicants: [] });

    const applicantIds = apps.map((a) => a.applicant_id);
    const [{ data: profiles }, { data: badges }] = await Promise.all([
      supabase.from("profiles")
        .select("id, pseudonym, avatar_color, reliability_score, bio")
        .in("id", applicantIds),
      supabase.from("badges")
        .select("user_id, category, difficulty")
        .in("user_id", applicantIds)
        .gt("expires_at", new Date().toISOString()),
    ]);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    const badgeMap: Record<string, typeof badges> = {};
    for (const b of badges ?? []) {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
      badgeMap[b.user_id]!.push(b);
    }

    const applicants = apps.map((a) => ({
      applicationId: a.id,
      status:        a.status,
      note:          a.note,
      profile:       profileMap[a.applicant_id] ?? null,
      badges:        badgeMap[a.applicant_id]   ?? [],
      // Real identity NOT included — revealed only after selection
    }));

    return NextResponse.json({ applicants });
  } catch (err) {
    console.error("Referral GET applicants error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST — referrer selects an applicant; identity reveals to referrer only
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { applicationId } = await request.json();
    if (!applicationId) return NextResponse.json({ error: "applicationId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: post } = await supabase
      .from("referral_posts").select("id, poster_id").eq("id", id).single();
    if (!post || post.poster_id !== user.id)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();

    // Mark selected
    await admin.from("referral_applications")
      .update({ status: "selected" }).eq("id", applicationId);

    // Reveal identity to referrer — get selected applicant's real info
    const { data: app } = await admin
      .from("referral_applications").select("applicant_id").eq("id", applicationId).single();

    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const { data: { user: applicantAuth } } = await admin.auth.admin.getUserById(app.applicant_id);
    const realName  = applicantAuth?.user_metadata?.full_name ?? "Unknown";
    const email     = applicantAuth?.email ?? null;
    const avatarUrl = applicantAuth?.user_metadata?.avatar_url ?? null;

    return NextResponse.json({ success: true, revealed: { name: realName, email, avatarUrl } });
  } catch (err) {
    console.error("Referral select error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
