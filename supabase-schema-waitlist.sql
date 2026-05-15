-- ============================================================
-- NULLSPACE — WAITLIST (WhatsApp numbers)
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT        NOT NULL UNIQUE,   -- 10-digit Indian mobile, no country code
  source     TEXT        NOT NULL DEFAULT 'hero',  -- 'hero' | 'waitlist_section'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public can insert (landing page has no auth) — reads restricted to service_role
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert" ON public.waitlist;
CREATE POLICY "waitlist_insert" ON public.waitlist
  FOR INSERT WITH CHECK (true);   -- anyone can join the waitlist

-- Only service_role (admin client) can read — regular users/anon cannot
-- (reads happen server-side in the admin panel only)
