import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: polls } = await supabase
      .from("society_polls")
      .select("id, question, options, ends_at, created_at")
      .eq("society_id", id)
      .order("created_at", { ascending: false });

    if (!polls?.length) return NextResponse.json({ polls: [] });

    // Get vote counts per poll
    const pollIds = polls.map((p) => p.id);
    const { data: votes } = await supabase
      .from("poll_votes").select("poll_id, option_index, voter_id").in("poll_id", pollIds);

    const { data: myVotes } = await supabase
      .from("poll_votes").select("poll_id, option_index").eq("voter_id", user.id).in("poll_id", pollIds);
    const myVoteMap = Object.fromEntries((myVotes ?? []).map((v) => [v.poll_id, v.option_index]));

    const enriched = polls.map((p) => {
      const pollVotes = (votes ?? []).filter((v) => v.poll_id === p.id);
      const counts = p.options.map((_: string, i: number) => pollVotes.filter((v) => v.option_index === i).length);
      return { ...p, counts, total: pollVotes.length, myVote: myVoteMap[p.id] ?? null };
    });

    return NextResponse.json({ polls: enriched });
  } catch (err) {
    console.error("Polls GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { question, options, endsAt } = await request.json();
    if (!question || !options?.length || options.length < 2) {
      return NextResponse.json({ error: "Question and at least 2 options required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: society } = await supabase.from("societies").select("leader_id").eq("id", id).single();
    if (!society || society.leader_id !== user.id)
      return NextResponse.json({ error: "Only the society leader can create polls." }, { status: 403 });

    const admin = createAdminClient();
    await admin.from("society_polls").insert({
      society_id: id, question, options, ends_at: endsAt ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Poll POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
