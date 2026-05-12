-- ============================================================
-- NEXUS — BEHAVIORAL SCHEMA (Block 1, Part 2)
-- Run AFTER supabase-schema.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── Enable pgvector (for semantic profile matching) ────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── match_events ───────────────────────────────────────────
-- Central table: every like, mutual match, icebreaker, reveal, ghost
CREATE TABLE IF NOT EXISTS public.match_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'liked'
    CHECK (status IN (
      'liked',               -- user_a liked user_b (one-way)
      'mutual',              -- both liked each other
      'icebreaker_sent',     -- icebreaker question delivered
      'icebreaker_completed',-- both answered; ready for reveal
      'revealed',            -- real identities revealed
      'ghosted',             -- one party went silent post-match
      'blocked'              -- one party blocked the other
    )),
  intent              TEXT        CHECK (intent IN ('project','study','co_founder','roommate','general')),
  icebreaker_question TEXT,
  user_a_answer       TEXT,
  user_b_answer       TEXT,
  revealed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_match CHECK (user_a_id <> user_b_id)
);

-- ── ghost_log ──────────────────────────────────────────────
-- Written when a user goes silent after a confirmed match
CREATE TABLE IF NOT EXISTS public.ghost_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ghoster_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ghosted_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_event_id  UUID        REFERENCES public.match_events(id),
  score_delta     SMALLINT    NOT NULL DEFAULT -5,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── report_log ─────────────────────────────────────────────
-- User-submitted reports; reviewed by paid moderators
CREATE TABLE IF NOT EXISTS public.report_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL
    CHECK (category IN (
      'harassment','doxxing','impersonation','skill_fraud',
      'ghosting','scam','sexual_content','no_show','other'
    )),
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','dismissed')),
  score_delta     SMALLINT,       -- applied to reported_id when status = 'verified'
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── score_events ───────────────────────────────────────────
-- Immutable audit log of every reliability score change
CREATE TABLE IF NOT EXISTS public.score_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta           SMALLINT    NOT NULL,          -- signed: +3, -5, -10, etc.
  reason          TEXT        NOT NULL,          -- 'ghost','endorsement','report_verified', etc.
  reference_id    UUID,                          -- match_event_id / report_id / etc.
  score_before    SMALLINT    NOT NULL,
  score_after     SMALLINT    NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── embedding_vectors ──────────────────────────────────────
-- One 1536-dim OpenAI embedding per profile, re-computed on profile change
CREATE TABLE IF NOT EXISTS public.embedding_vectors (
  user_id         UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  embedding       vector(1536),
  embedding_text  TEXT,                          -- the text that was embedded
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── reveal_log ─────────────────────────────────────────────
-- Every identity reveal is logged here — security audit trail
CREATE TABLE IF NOT EXISTS public.reveal_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_event_id    UUID        NOT NULL REFERENCES public.match_events(id),
  requester_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  revealed_user_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.match_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reveal_log       ENABLE ROW LEVEL SECURITY;

-- match_events: only participants can read/update
DROP POLICY IF EXISTS "match_events_select" ON public.match_events;
CREATE POLICY "match_events_select" ON public.match_events
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

DROP POLICY IF EXISTS "match_events_insert" ON public.match_events;
CREATE POLICY "match_events_insert" ON public.match_events
  FOR INSERT WITH CHECK (auth.uid() = user_a_id);

DROP POLICY IF EXISTS "match_events_update" ON public.match_events;
CREATE POLICY "match_events_update" ON public.match_events
  FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- ghost_log: participants only
DROP POLICY IF EXISTS "ghost_log_select" ON public.ghost_log;
CREATE POLICY "ghost_log_select" ON public.ghost_log
  FOR SELECT USING (auth.uid() = ghoster_id OR auth.uid() = ghosted_id);

-- report_log: reporter sees their own; reported cannot see
DROP POLICY IF EXISTS "report_log_select" ON public.report_log;
CREATE POLICY "report_log_select" ON public.report_log
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "report_log_insert" ON public.report_log;
CREATE POLICY "report_log_insert" ON public.report_log
  FOR INSERT WITH CHECK (auth.uid() = reporter_id AND auth.uid() <> reported_id);

-- score_events: each user sees their own history
DROP POLICY IF EXISTS "score_events_select" ON public.score_events;
CREATE POLICY "score_events_select" ON public.score_events
  FOR SELECT USING (auth.uid() = user_id);

-- embedding_vectors: own only (matching done server-side)
DROP POLICY IF EXISTS "embedding_vectors_select" ON public.embedding_vectors;
CREATE POLICY "embedding_vectors_select" ON public.embedding_vectors
  FOR SELECT USING (auth.uid() = user_id);

-- reveal_log: both parties can see their reveals
DROP POLICY IF EXISTS "reveal_log_select" ON public.reveal_log;
CREATE POLICY "reveal_log_select" ON public.reveal_log
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = revealed_user_id);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS match_events_user_a_idx   ON public.match_events (user_a_id, status);
CREATE INDEX IF NOT EXISTS match_events_user_b_idx   ON public.match_events (user_b_id, status);
CREATE INDEX IF NOT EXISTS match_events_status_idx   ON public.match_events (status);
CREATE INDEX IF NOT EXISTS ghost_log_ghoster_idx     ON public.ghost_log (ghoster_id);
CREATE INDEX IF NOT EXISTS report_log_reported_idx   ON public.report_log (reported_id, status);
CREATE INDEX IF NOT EXISTS score_events_user_idx     ON public.score_events (user_id, created_at DESC);
-- IVFFlat index for cosine similarity search (semantic matching)
CREATE INDEX IF NOT EXISTS embedding_cosine_idx      ON public.embedding_vectors
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── auto updated_at for match_events ──────────────────────
DROP TRIGGER IF EXISTS match_events_updated_at ON public.match_events;
CREATE TRIGGER match_events_updated_at
  BEFORE UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Reliability Score engine ───────────────────────────────
-- Single function that handles ALL score mutations.
-- Always call this — never UPDATE profiles.reliability_score directly.
--
-- Score deltas (from the masterplan):
--   ghost after match      : -5
--   no-show at event       : -10
--   mild rudeness (ML flag): -5
--   report verified        : -15 to -30 (pass as delta)
--   doxxing / harassment   : -20
--   badge challenge passed : +3
--   positive endorsement   : +3
--   completed collaboration: +3
--
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
  -- Lock the row to prevent concurrent updates
  SELECT reliability_score
  INTO   v_current
  FROM   public.profiles
  WHERE  id = p_user_id
  FOR    UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_user_id;
  END IF;

  -- Clamp to [0, 100]
  v_new := GREATEST(0, LEAST(100, v_current + p_delta));

  -- Update score and shadow-ban threshold
  UPDATE public.profiles
  SET
    reliability_score = v_new,
    is_shadow_banned  = (v_new < 40)
  WHERE id = p_user_id;

  -- Immutable audit entry
  INSERT INTO public.score_events
    (user_id, delta, reason, reference_id, score_before, score_after)
  VALUES
    (p_user_id, p_delta, p_reason, p_reference_id, v_current, v_new);

  RETURN v_new;
END;
$$;

-- ── Ghost trigger ──────────────────────────────────────────
-- When a ghost_log row is inserted, automatically apply the score penalty
CREATE OR REPLACE FUNCTION public.handle_ghost_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.apply_score_event(
    NEW.ghoster_id,
    NEW.score_delta,
    'ghost',
    NEW.match_event_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ghost_inserted ON public.ghost_log;
CREATE TRIGGER on_ghost_inserted
  AFTER INSERT ON public.ghost_log
  FOR EACH ROW EXECUTE FUNCTION public.handle_ghost_inserted();

-- ── Report-verified trigger ────────────────────────────────
-- When a report is marked verified, apply the score delta to the reported user
CREATE OR REPLACE FUNCTION public.handle_report_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status = 'pending' AND NEW.score_delta IS NOT NULL THEN
    PERFORM public.apply_score_event(
      NEW.reported_id,
      NEW.score_delta,
      'report_verified:' || NEW.category,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_verified ON public.report_log;
CREATE TRIGGER on_report_verified
  AFTER UPDATE ON public.report_log
  FOR EACH ROW EXECUTE FUNCTION public.handle_report_verified();
