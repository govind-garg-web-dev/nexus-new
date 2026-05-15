import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase
      .from("users").select("college_domain").eq("id", user.id).single();
    const { data: profile } = await supabase
      .from("profiles").select("college").eq("id", user.id).single();

    const { data: listings } = await supabase
      .from("pg_listings")
      .select("id, title, location, area, rent_per_month, slots_available, gender_pref, amenities, description, photo_urls, poster_id, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    // Enrich with poster pseudonyms
    const posterIds = [...new Set((listings ?? []).map((l) => l.poster_id))];
    const { data: posters } = posterIds.length
      ? await supabase.from("profiles").select("id, pseudonym, avatar_color").in("id", posterIds)
      : { data: [] };

    const posterMap = Object.fromEntries((posters ?? []).map((p) => [p.id, p]));
    const enriched  = (listings ?? []).map((l) => ({ ...l, poster: posterMap[l.poster_id] ?? null }));

    return NextResponse.json({ listings: enriched, college: profile?.college });
  } catch (err) {
    console.error("PG listings GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, location, area, rentPerMonth, slotsAvailable, genderPref, amenities, description, photoUrls } = await request.json();
    if (!title || !location || !rentPerMonth) {
      return NextResponse.json({ error: "title, location, and rentPerMonth are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { data } = await admin.from("pg_listings").insert({
      poster_id:       user.id,
      title,
      location,
      area:            area            ?? null,
      rent_per_month:  rentPerMonth,
      slots_available: slotsAvailable  ?? 1,
      gender_pref:     genderPref      ?? "any",
      amenities:       amenities       ?? [],
      photo_urls:      photoUrls       ?? [],
      description:     description?.trim() ?? null,
    }).select("id").single();

    return NextResponse.json({ success: true, listingId: data?.id });
  } catch (err) {
    console.error("PG listings POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
