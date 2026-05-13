import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { uploadId, reason } = await request.json();
    if (!uploadId || !reason?.trim()) {
      return NextResponse.json({ error: "uploadId and reason required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin.from("vault_flags").upsert(
      { user_id: user.id, upload_id: uploadId, reason },
      { onConflict: "user_id,upload_id", ignoreDuplicates: true }
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Flag error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
