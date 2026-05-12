-- ============================================================
-- NEXUS — MATCHING & DISCOVERY SCHEMA (Block 3)
-- Run AFTER supabase-schema-behavioral.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── Add intent + bio to profiles ──────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'general'
    CHECK (intent IN ('general','project','study','co_founder','roommate'));

-- ── feed_interactions (likes + skips) ─────────────────────
CREATE TABLE IF NOT EXISTS public.feed_interactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL CHECK (action IN ('like','skip')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_interaction   CHECK (actor_id <> target_id),
  CONSTRAINT unique_interaction    UNIQUE (actor_id, target_id)
);

ALTER TABLE public.feed_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fi_select" ON public.feed_interactions;
CREATE POLICY "fi_select" ON public.feed_interactions
  FOR SELECT USING (auth.uid() = actor_id);

DROP POLICY IF EXISTS "fi_insert" ON public.feed_interactions;
CREATE POLICY "fi_insert" ON public.feed_interactions
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE INDEX IF NOT EXISTS fi_actor_idx  ON public.feed_interactions (actor_id);
CREATE INDEX IF NOT EXISTS fi_target_idx ON public.feed_interactions (target_id, action);

-- ── co_founder_profiles ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.co_founder_profiles (
  user_id             UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  commitment_level    TEXT        NOT NULL
    CHECK (commitment_level IN ('side_5h','side_10h','part_time','full_time')),
  equity_comfort      BOOLEAN     NOT NULL DEFAULT FALSE,
  equity_range        TEXT,
  domain              TEXT        NOT NULL,
  problem_statement   TEXT        NOT NULL,
  active              BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.co_founder_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cf_select" ON public.co_founder_profiles;
CREATE POLICY "cf_select" ON public.co_founder_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cf_insert" ON public.co_founder_profiles;
CREATE POLICY "cf_insert" ON public.co_founder_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cf_update" ON public.co_founder_profiles;
CREATE POLICY "cf_update" ON public.co_founder_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS cf_updated_at ON public.co_founder_profiles;
CREATE TRIGGER cf_updated_at
  BEFORE UPDATE ON public.co_founder_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── pgvector feed function ────────────────────────────────
-- Returns ranked profiles for the merit feed.
-- Ranks by cosine similarity when embedding provided, else reliability score.
CREATE OR REPLACE FUNCTION public.get_feed_profiles(
  p_user_id        UUID,
  p_college_domain TEXT,
  p_intent         TEXT     DEFAULT NULL,
  p_skill          TEXT     DEFAULT NULL,
  p_branch         TEXT     DEFAULT NULL,
  p_year           SMALLINT DEFAULT NULL,
  p_embedding      vector(1536) DEFAULT NULL,
  p_limit          INT      DEFAULT 20,
  p_offset         INT      DEFAULT 0
)
RETURNS TABLE (
  id                UUID,
  pseudonym         TEXT,
  college           TEXT,
  branch            TEXT,
  batch_year        SMALLINT,
  bio               TEXT,
  interests         TEXT[],
  avatar_color      TEXT,
  reliability_score SMALLINT,
  intent            TEXT,
  github_url        TEXT,
  behance_url       TEXT,
  similarity        FLOAT8
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    pr.pseudonym,
    pr.college,
    pr.branch,
    pr.batch_year,
    pr.bio,
    pr.interests,
    pr.avatar_color,
    pr.reliability_score,
    pr.intent,
    pr.github_url,
    pr.behance_url,
    CASE
      WHEN p_embedding IS NOT NULL AND ev.embedding IS NOT NULL
        THEN (1 - (ev.embedding <=> p_embedding))::FLOAT8
      ELSE
        (pr.reliability_score::FLOAT8 / 100)
    END AS similarity
  FROM  public.profiles pr
  JOIN  public.users u ON u.id = pr.id
  LEFT  JOIN public.embedding_vectors ev ON ev.user_id = pr.id
  WHERE
    u.college_domain = p_college_domain
    AND pr.id <> p_user_id
    AND pr.is_shadow_banned = FALSE
    AND u.onboarding_complete = TRUE
    AND pr.id NOT IN (
      SELECT fi.target_id
      FROM   public.feed_interactions fi
      WHERE  fi.actor_id = p_user_id
    )
    AND (p_intent IS NULL OR pr.intent = p_intent)
    AND (p_branch IS NULL OR pr.branch = p_branch)
    AND (p_year   IS NULL OR pr.batch_year = p_year)
    AND (
      p_skill IS NULL OR EXISTS (
        SELECT 1 FROM public.badges b
        WHERE  b.user_id = pr.id
        AND    b.category = p_skill
        AND    b.expires_at > NOW()
      )
    )
  ORDER BY similarity DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;
