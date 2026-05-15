import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const q        = searchParams.get("q") || "";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("college").eq("id", user.id).single();

    let query = supabase
      .from("marketplace_listings")
      .select("id, title, category, condition, price, description, status, seller_id, created_at")
      .eq("college", profile?.college ?? "")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(50);

    if (category) query = query.eq("category", category);
    if (q)        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

    const { data: listings } = await query;

    const sellerIds = [...new Set((listings ?? []).map((l) => l.seller_id))];
    const { data: sellers } = sellerIds.length
      ? await supabase.from("profiles").select("id, pseudonym, avatar_color, reliability_score").in("id", sellerIds)
      : { data: [] };
    const sellerMap = Object.fromEntries((sellers ?? []).map((s) => [s.id, s]));

    const enriched = (listings ?? []).map((l) => ({
      ...l,
      seller:  sellerMap[l.seller_id] ?? null,
      isMyListing: l.seller_id === user.id,
    }));

    return NextResponse.json({ listings: enriched });
  } catch (err) {
    console.error("Marketplace GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, category, condition, price, description } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: "Title required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("college").eq("id", user.id).single();

    const admin = createAdminClient();
    await admin.from("marketplace_listings").insert({
      seller_id:   user.id,
      college:     profile?.college ?? "",
      title:       title.trim(),
      category:    category   ?? "other",
      condition:   condition  ?? null,
      price:       price      ?? 0,
      description: description?.trim() ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Marketplace POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
