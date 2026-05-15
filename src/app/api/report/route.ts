import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_CATEGORIES = [
  "harassment", "doxxing", "impersonation", "skill_fraud",
  "ghosting", "scam", "sexual_content", "no_show", "other",
] as const;

const SCORE_DELTAS: Record<string, number> = {
  harassment: -20, doxxing: -30, impersonation: -20,
  skill_fraud: -15, ghosting: -5, scam: -20,
  sexual_content: -25, no_show: -10, other: -5,
};

export async function POST(request: Request) {
  try {
    const { reportedId, category, description, contentType, contentId } = await request.json();

    if (!reportedId || !category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "reportedId and valid category required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (user.id === reportedId) return NextResponse.json({ error: "Cannot report yourself." }, { status: 400 });

    const admin = createAdminClient();

    // Insert into report_log
    const { data: report } = await admin.from("report_log").insert({
      reporter_id: user.id,
      reported_id: reportedId,
      category,
      description:  description?.trim() ?? null,
      score_delta:  SCORE_DELTAS[category] ?? -5,
    }).select("id").single();

    // Also add to mod_queue if there's a specific content item
    if (contentType && contentId && report) {
      // For flagged messages we store in mod_queue
      if (contentType === "message") {
        await admin.from("mod_queue").upsert({
          message_id:  contentId,
          flag_reason: `Reported: ${category}`,
          status:      "pending",
        }, { onConflict: "message_id", ignoreDuplicates: true });
      }
    }

    return NextResponse.json({ success: true, reportId: report?.id });
  } catch (err) {
    console.error("Report error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
