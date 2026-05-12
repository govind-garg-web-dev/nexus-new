import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { uploadId, vote } = await request.json();
    if (!uploadId || ![1, -1, 0].includes(vote)) {
      return NextResponse.json({ error: "uploadId and vote (1, -1, or 0 to remove) required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();

    if (vote === 0) {
      // Remove vote
      await admin.from("vault_votes").delete().eq("user_id", user.id).eq("upload_id", uploadId);
    } else {
      await admin.from("vault_votes").upsert(
        { user_id: user.id, upload_id: uploadId, vote },
        { onConflict: "user_id,upload_id" }
      );
    }

    // Return updated counts
    const { data: updated } = await admin
      .from("vault_uploads")
      .select("upvotes, downvotes")
      .eq("id", uploadId)
      .single();

    return NextResponse.json({ success: true, ...updated });
  } catch (err) {
    console.error("Vote error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
