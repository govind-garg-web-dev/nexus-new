import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/mod/action
// Handles: verify/dismiss reports, approve/reject confessions, approve/reject ID verification
export async function POST(request: Request) {
  try {
    const { type, itemId, action, notes } = await request.json();
    // type: 'report' | 'confession' | 'vault_flag' | 'id_verification' | 'message'
    // action: 'verify' | 'dismiss' | 'approve' | 'reject'

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (!userData || !["admin", "moderator"].includes(userData.role)) {
      return NextResponse.json({ error: "Moderator access required." }, { status: 403 });
    }

    const admin = createAdminClient();

    if (type === "report") {
      if (action === "verify") {
        // Apply score penalty to reported user
        const { data: report } = await admin
          .from("report_log").select("reported_id, score_delta, category").eq("id", itemId).single();

        if (report) {
          await admin.rpc("apply_score_event", {
            p_user_id:      report.reported_id,
            p_delta:        report.score_delta,
            p_reason:       `report_verified:${report.category}`,
            p_reference_id: itemId,
          });
        }

        await admin.from("report_log").update({
          status:      "verified",
          reviewed_at: new Date().toISOString(),
        }).eq("id", itemId);

      } else {
        await admin.from("report_log").update({
          status:      "dismissed",
          reviewed_at: new Date().toISOString(),
        }).eq("id", itemId);
      }
    }

    if (type === "confession") {
      await admin.from("confessions").update({
        status: action === "approve" ? "approved" : "rejected",
      }).eq("id", itemId);
    }

    if (type === "vault_flag") {
      if (action === "verify") {
        // Hide the upload (set it as rejected status by removing from public)
        const { data: flag } = await admin
          .from("vault_flags").select("upload_id").eq("id", itemId).single();
        if (flag) {
          // Mark the listing as unavailable
          await admin.from("vault_uploads").update({ verified: false }).eq("id", flag.upload_id);
        }
      }
      // Either way, delete the flag entry
      await admin.from("vault_flags").delete().eq("id", itemId);
    }

    if (type === "id_verification") {
      const approved = action === "approve";
      await admin.from("id_verification_requests").update({
        status:      approved ? "approved" : "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes:       notes ?? null,
      }).eq("id", itemId);

      // Update user's id_verified status
      const { data: req } = await admin
        .from("id_verification_requests").select("user_id").eq("id", itemId).single();
      if (req) {
        await admin.from("users").update({
          id_verified:           approved,
          needs_id_verification: false,
        }).eq("id", req.user_id);
      }
    }

    if (type === "message") {
      // Update mod_queue status for the message
      await admin.from("mod_queue").update({
        status:      action === "verify" ? "reviewed" : "dismissed",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq("message_id", itemId);

      // If verified as abuse: apply penalty to sender
      if (action === "verify") {
        const { data: msg } = await admin
          .from("messages").select("sender_id, flag_reason").eq("id", itemId).single();
        if (msg) {
          await admin.rpc("apply_score_event", {
            p_user_id:      msg.sender_id,
            p_delta:        -10,
            p_reason:       "message_verified_abuse",
            p_reference_id: itemId,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mod action error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
