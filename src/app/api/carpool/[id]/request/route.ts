import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: post } = await supabase
      .from("carpool_posts").select("id, poster_id, status, seats").eq("id", id).single();
    if (!post || post.status !== "open") return NextResponse.json({ error: "Post not found or closed." }, { status: 404 });
    if (post.poster_id === user.id) return NextResponse.json({ error: "Cannot request your own ride." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("carpool_requests").insert({
      post_id: id, requester_id: user.id,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Already requested." }, { status: 400 });
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Carpool request error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
