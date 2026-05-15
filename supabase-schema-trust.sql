-- ============================================================
-- NEXUS — TRUST, SAFETY & MODERATION SCHEMA (Block 9)
-- Run AFTER supabase-schema-community.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── Suspension fields on users ─────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS needs_id_verification BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_verified       BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Update apply_score_event to also suspend at < 25 ───────
CREATE OR REPLACE FUNCTION public.apply_score_event(
  p_user_id     UUID,
  p_delta       SMALLINT,
  p_reason      TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current   SMALLINT;
  v_new       SMALLINT;
BEGIN
  SELECT reliability_score
  INTO   v_current
  FROM   public.profiles
  WHERE  id = p_user_id
  FOR    UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_user_id;
  END IF;

  v_new := GREATEST(0, LEAST(100, v_current + p_delta));

  UPDATE public.profiles
  SET
    reliability_score = v_new,
    is_shadow_banned  = (v_new < 40)
  WHERE id = p_user_id;

  -- Suspend account if score drops below 25
  IF v_new < 25 AND v_current >= 25 THEN
    UPDATE public.users
    SET
      is_suspended      = TRUE,
      suspension_reason = 'Reliability score dropped below 25 due to: ' || p_reason,
      suspended_at      = NOW()
    WHERE id = p_user_id;
  END IF;

  INSERT INTO public.score_events
    (user_id, delta, reason, reference_id, score_before, score_after)
  VALUES
    (p_user_id, p_delta, p_reason, p_reference_id, v_current, v_new);

  RETURN v_new;
END;
$$;

-- ── device_fingerprints ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fingerprint  TEXT        NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_device UNIQUE (user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS df_fingerprint_idx ON public.device_fingerprints (fingerprint);

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "df_insert" ON public.device_fingerprints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── id_verification_requests ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.id_verification_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  photo_url   TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID        REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.id_verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "idv_select_own" ON public.id_verification_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "idv_insert_own" ON public.id_verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── reports (already exists from Block 1 as report_log) ────
-- Ensure the report_log table has all needed categories
-- (it already does — harassment, doxxing, impersonation, skill_fraud, ghosting, scam, sexual_content, no_show, other)
-- Just ensure moderators can read it via service_role (admin client only)
