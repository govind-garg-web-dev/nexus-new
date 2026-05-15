import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; pollId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { pollId } = await params;
  try {
    const { optionIndex } = await request.json();
    if (typeof optionIndex !== "number") return NextResponse.json({ error: "optionIndex required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: poll } = await supabase
      .from("society_polls").select("options, ends_at").eq("id", pollId).single();
    if (!poll) return NextResponse.json({ error: "Poll not found." }, { status: 404 });
    if (poll.ends_at && new Date(poll.ends_at) < new Date())
      return NextResponse.json({ error: "Poll has ended." }, { status: 400 });
    if (optionIndex < 0 || optionIndex >= poll.options.length)
      return NextResponse.json({ error: "Invalid option." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("poll_votes").upsert(
      { poll_id: pollId, voter_id: user.id, option_index: optionIndex },
      { onConflict: "poll_id,voter_id" }
    );
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Poll vote error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
