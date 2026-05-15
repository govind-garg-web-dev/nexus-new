import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase
      .from("users").select("role, college_domain").eq("id", user.id).single();

    if (!userData || !["admin", "moderator"].includes(userData.role)) {
      return NextResponse.json({ error: "Moderator access required." }, { status: 403 });
    }

    const admin = createAdminClient();

    // Fetch all pending items in parallel
    const [
      { data: reports },
      { data: flaggedMessages },
      { data: pendingConfessions },
      { data: vaultFlags },
      { data: idRequests },
      { data: societyEvents },
    ] = await Promise.all([
      // User reports
      admin.from("report_log")
        .select("id, reporter_id, reported_id, category, description, score_delta, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50),

      // Flagged chat messages
      admin.from("messages")
        .select("id, match_id, sender_id, content, flag_reason, created_at")
        .eq("flagged", true)
        .is("mod_queue.status", null)
        .order("created_at", { ascending: true })
        .limit(30),

      // Confessions awaiting approval
      admin.from("confessions")
        .select("id, college_domain, content, toxicity_score, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(30),

      // Flagged vault uploads
      admin.from("vault_flags")
        .select("id, upload_id, reason, created_at, vault_uploads(title, college, file_url)")
        .order("created_at", { ascending: true })
        .limit(30),

      // ID verification requests
      admin.from("id_verification_requests")
        .select("id, user_id, photo_url, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(30),

      // Society event submissions awaiting approval
      admin.from("events")
        .select("id, title, description, type, is_charged, ticket_price, deadline, link, created_at, societies(name)")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true })
        .limit(30),
    ]);

    // Get profile info for reported users
    const reportedIds = [...new Set((reports ?? []).map((r) => r.reported_id))];
    const { data: reportedProfiles } = reportedIds.length
      ? await admin.from("profiles").select("id, pseudonym, reliability_score").in("id", reportedIds)
      : { data: [] };
    const profileMap = Object.fromEntries((reportedProfiles ?? []).map((p) => [p.id, p]));

    return NextResponse.json({
      reports: (reports ?? []).map((r) => ({ ...r, reportedProfile: profileMap[r.reported_id] ?? null })),
      flaggedMessages:    flaggedMessages    ?? [],
      pendingConfessions: pendingConfessions ?? [],
      vaultFlags:         vaultFlags         ?? [],
      idRequests:         idRequests         ?? [],
      societyEvents:      societyEvents      ?? [],
    });
  } catch (err) {
    console.error("Mod queue error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
