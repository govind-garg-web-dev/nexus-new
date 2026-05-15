import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — fetch all coin config + prizes
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin","moderator"].includes(me.role))
      return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const [{ data: config }, { data: prizes }] = await Promise.all([
      supabase.from("coin_config").select("action_key, coins, description").order("action_key"),
      supabase.from("coin_prizes").select("id, name, description, coin_cost, available, stock").order("coin_cost"),
    ]);

    return NextResponse.json({ config: config ?? [], prizes: prizes ?? [] });
  } catch (err) {
    console.error("Coins config GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST — update a coin config value or prize
export async function POST(request: Request) {
  try {
    const { type, actionKey, coins, prizeId, prizeData } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin","moderator"].includes(me.role))
      return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();

    if (type === "config") {
      await admin.from("coin_config").update({ coins, updated_at: new Date().toISOString() }).eq("action_key", actionKey);
    } else if (type === "prize") {
      if (prizeId) {
        await admin.from("coin_prizes").update(prizeData).eq("id", prizeId);
      } else {
        await admin.from("coin_prizes").insert(prizeData);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Coins config POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
