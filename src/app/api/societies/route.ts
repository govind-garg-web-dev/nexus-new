import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("college").eq("id", user.id).single();

    const { data: societies } = await supabase
      .from("societies")
      .select("id, name, category, bio, verified, leader_id")
      .eq("college", profile?.college ?? "")
      .order("name");

    const myId = user.id;
    return NextResponse.json({
      societies: (societies ?? []).map((s) => ({ ...s, isLeader: s.leader_id === myId })),
    });
  } catch (err) {
    console.error("Societies GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, category, bio } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Society name required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("college").eq("id", user.id).single();

    const admin = createAdminClient();
    const { error } = await admin.from("societies").insert({
      name: name.trim(),
      college:   profile?.college ?? "",
      category:  category ?? "general",
      leader_id: user.id,
      bio:       bio?.trim() ?? null,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "A society with this name already exists at your college." }, { status: 400 });
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Societies POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
