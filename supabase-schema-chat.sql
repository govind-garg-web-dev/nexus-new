-- ============================================================
-- NEXUS — CHAT & REAL-TIME SCHEMA (Block 4)
-- Run AFTER supabase-schema-matching.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID        NOT NULL REFERENCES public.match_events(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES public.users(id)        ON DELETE CASCADE,
  content     TEXT,
  type        TEXT        NOT NULL DEFAULT 'text'
    CHECK (type IN ('text','image','system')),
  image_url   TEXT,
  flagged     BOOLEAN     NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_match_idx  ON public.messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages (sender_id);

-- RLS: only participants can read/write messages in their match
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.match_events me
      WHERE me.id = messages.match_id
      AND   (me.user_a_id = auth.uid() OR me.user_b_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.match_events me
      WHERE me.id = messages.match_id
      AND   (me.user_a_id = auth.uid() OR me.user_b_id = auth.uid())
      AND   me.status = 'revealed'
    )
  );

-- Enable Supabase Realtime on messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── blocks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_hash  TEXT,
  device_hash TEXT,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_block  CHECK (blocker_id <> blocked_id),
  CONSTRAINT unique_block   UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select" ON public.blocks;
CREATE POLICY "blocks_select" ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "blocks_insert" ON public.blocks;
CREATE POLICY "blocks_insert" ON public.blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- ── mod_queue ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mod_queue (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  flag_reason TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','dismissed')),
  reviewed_by UUID        REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Mod queue is admin-only (read via service_role)
ALTER TABLE public.mod_queue ENABLE ROW LEVEL SECURITY;

-- ── Update get_feed_profiles to exclude blocked users ──────
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
      ELSE (pr.reliability_score::FLOAT8 / 100)
    END AS similarity
  FROM  public.profiles pr
  JOIN  public.users u ON u.id = pr.id
  LEFT  JOIN public.embedding_vectors ev ON ev.user_id = pr.id
  WHERE
    u.college_domain = p_college_domain
    AND pr.id <> p_user_id
    AND pr.is_shadow_banned = FALSE
    AND u.onboarding_complete = TRUE
    -- Exclude already-interacted profiles
    AND pr.id NOT IN (
      SELECT fi.target_id FROM public.feed_interactions fi
      WHERE  fi.actor_id = p_user_id
    )
    -- Exclude blocked users (bidirectional)
    AND pr.id NOT IN (
      SELECT b.blocked_id FROM public.blocks b WHERE b.blocker_id = p_user_id
      UNION
      SELECT b.blocker_id FROM public.blocks b WHERE b.blocked_id = p_user_id
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
