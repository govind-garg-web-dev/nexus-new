import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { note } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: post } = await supabase
      .from("referral_posts").select("id, poster_id, active").eq("id", id).single();
    if (!post || !post.active) return NextResponse.json({ error: "Post not found or closed." }, { status: 404 });
    if (post.poster_id === user.id) return NextResponse.json({ error: "Cannot apply to your own referral." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("referral_applications").insert({
      post_id: id, applicant_id: user.id, note: note?.trim() || null,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Already applied." }, { status: 400 });
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Referral apply error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
