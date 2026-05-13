import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// POST — poster confirms a requester; both identities reveal
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { requesterId } = await request.json();
    if (!requesterId) return NextResponse.json({ error: "requesterId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: post } = await supabase
      .from("carpool_posts").select("id, poster_id, seats").eq("id", id).single();
    if (!post || post.poster_id !== user.id)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();

    // Confirm the request
    await admin.from("carpool_requests")
      .update({ status: "confirmed" })
      .eq("post_id", id).eq("requester_id", requesterId);

    // Check if seats full → mark post as full
    const { count } = await admin
      .from("carpool_requests")
      .select("id", { count: "exact", head: true })
      .eq("post_id", id).eq("status", "confirmed");

    if ((count ?? 0) >= post.seats) {
      await admin.from("carpool_posts").update({ status: "full" }).eq("id", id);
    }

    // Reveal both identities to each other
    const [{ data: { user: posterAuth } }, { data: { user: requesterAuth } }] = await Promise.all([
      admin.auth.admin.getUserById(user.id),
      admin.auth.admin.getUserById(requesterId),
    ]);

    return NextResponse.json({
      success: true,
      poster: {
        name:      posterAuth?.user_metadata?.full_name ?? "Unknown",
        email:     posterAuth?.email,
        avatarUrl: posterAuth?.user_metadata?.avatar_url,
      },
      requester: {
        name:      requesterAuth?.user_metadata?.full_name ?? "Unknown",
        email:     requesterAuth?.email,
        avatarUrl: requesterAuth?.user_metadata?.avatar_url,
      },
    });
  } catch (err) {
    console.error("Carpool confirm error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
