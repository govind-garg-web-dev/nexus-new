import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { vote } = await request.json(); // 1, -1, or 0 to remove
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    if (vote === 0) {
      await admin.from("confession_votes").delete().eq("user_id", user.id).eq("confession_id", id);
    } else {
      await admin.from("confession_votes").upsert(
        { user_id: user.id, confession_id: id, vote },
        { onConflict: "user_id,confession_id" }
      );
    }
    const { data } = await admin.from("confessions").select("upvotes, downvotes").eq("id", id).single();
    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    console.error("Confession vote error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
