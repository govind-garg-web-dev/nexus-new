import { createClient } from "@supabase/supabase-js";

// Server-side ONLY. Never import this in client components.
// Uses the service_role key which bypasses Row Level Security.
// Only the reveal route and internal score events should use this.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (never prefix with NEXT_PUBLIC_)."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
