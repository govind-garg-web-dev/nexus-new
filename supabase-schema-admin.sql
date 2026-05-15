-- ============================================================
-- NEXUS — SOCIETY & ADMIN SCHEMA (Block 10)
-- Run AFTER supabase-schema-trust.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── campuses ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campuses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  domain        TEXT        NOT NULL UNIQUE,
  city          TEXT,
  state         TEXT,
  student_count INT,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  onboarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campuses_select" ON public.campuses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "campuses_insert" ON public.campuses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "campuses_update" ON public.campuses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ── society_verification_requests ─────────────────────────
CREATE TABLE IF NOT EXISTS public.society_verification_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id  UUID        NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  notes       TEXT,
  reviewed_by UUID        REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.society_verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svr_select" ON public.society_verification_requests FOR SELECT USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "svr_insert" ON public.society_verification_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.societies s WHERE s.id = society_id AND s.leader_id = auth.uid())
);

-- ── recruiter_tier on referral_posts ──────────────────────
ALTER TABLE public.referral_posts
  ADD COLUMN IF NOT EXISTS recruiter_tier      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS company_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS company_logo_url    TEXT;

CREATE INDEX IF NOT EXISTS rp_recruiter_idx ON public.referral_posts (recruiter_tier, created_at DESC);

-- ── Society leader: event publishing ──────────────────────
-- Leaders can create events linked to their society (events.posted_by must be leader)
-- We already have the events table — just allow verified leaders to post there too
-- Update the RLS to allow society leaders of verified societies to post events

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (
  -- Admin/moderator can always post
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  OR
  -- Verified society leader can also post
  EXISTS (
    SELECT 1 FROM public.societies s
    WHERE s.leader_id = auth.uid() AND s.verified = TRUE
  )
);
