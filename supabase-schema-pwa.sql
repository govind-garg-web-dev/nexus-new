-- ============================================================
-- NEXUS — PWA & POLISH SCHEMA (Block 11)
-- Run in Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── nps_responses ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  score        SMALLINT    NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment      TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nps_insert" ON public.nps_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nps_select_own" ON public.nps_responses FOR SELECT USING (auth.uid() = user_id);

-- ── push_subscriptions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT,
  auth        TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_insert" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ps_delete" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- ── disclosures_accepted ───────────────────────────────────
-- Track that users accepted the safety disclosures during onboarding
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS disclosures_accepted    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disclosures_accepted_at TIMESTAMPTZ;
