import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { message } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: listing } = await supabase
      .from("marketplace_listings").select("id, seller_id").eq("id", id).single();
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (listing.seller_id === user.id) return NextResponse.json({ error: "Cannot express interest in your own listing." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("marketplace_interests").upsert(
      { listing_id: id, buyer_id: user.id, message: message?.trim() || null },
      { onConflict: "listing_id,buyer_id", ignoreDuplicates: true }
    );
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Marketplace interest error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
