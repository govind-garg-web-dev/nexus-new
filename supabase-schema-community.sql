-- ============================================================
-- NEXUS — COMMUNITY LAYER SCHEMA (Block 8)
-- Run AFTER supabase-schema-roommates.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── confessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.confessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  college_domain  TEXT        NOT NULL,
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 10 AND 1000),
  toxicity_score  FLOAT,
  status          TEXT        NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved','pending','rejected')),
  upvotes         INT         NOT NULL DEFAULT 0,
  downvotes       INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS confessions_domain_idx ON public.confessions (college_domain, status, created_at DESC);

ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;

-- Author_id NEVER exposed to frontend via RLS
DROP POLICY IF EXISTS "confessions_select" ON public.confessions;
CREATE POLICY "confessions_select" ON public.confessions
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'approved');

DROP POLICY IF EXISTS "confessions_insert" ON public.confessions;
CREATE POLICY "confessions_insert" ON public.confessions
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS public.confession_votes (
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  confession_id UUID        NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  vote          SMALLINT    NOT NULL CHECK (vote IN (1,-1)),
  PRIMARY KEY (user_id, confession_id)
);

ALTER TABLE public.confession_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cvotes_select" ON public.confession_votes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cvotes_insert" ON public.confession_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cvotes_delete" ON public.confession_votes FOR DELETE USING (auth.uid() = user_id);

-- Trigger: sync vote counts
CREATE OR REPLACE FUNCTION public.sync_confession_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.confessions
  SET
    upvotes   = (SELECT COUNT(*) FROM public.confession_votes WHERE confession_id = COALESCE(NEW.confession_id, OLD.confession_id) AND vote = 1),
    downvotes = (SELECT COUNT(*) FROM public.confession_votes WHERE confession_id = COALESCE(NEW.confession_id, OLD.confession_id) AND vote = -1)
  WHERE id = COALESCE(NEW.confession_id, OLD.confession_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_confession_vote ON public.confession_votes;
CREATE TRIGGER on_confession_vote
  AFTER INSERT OR UPDATE OR DELETE ON public.confession_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_confession_votes();

ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;

-- ── marketplace_listings ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  college     TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'other'
    CHECK (category IN ('textbook','electronics','cycle','furniture','clothing','lost_found','other')),
  condition   TEXT        CHECK (condition IN ('new','like_new','good','fair','poor')),
  price       INT         NOT NULL DEFAULT 0,  -- 0 = free/exchange
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','reserved','sold')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketplace_college_idx  ON public.marketplace_listings (college, status, created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_category_idx ON public.marketplace_listings (category, status);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_select" ON public.marketplace_listings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ml_insert" ON public.marketplace_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "ml_update" ON public.marketplace_listings FOR UPDATE USING (auth.uid() = seller_id);

CREATE TABLE IF NOT EXISTS public.marketplace_interests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID        NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message    TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_interest UNIQUE (listing_id, buyer_id)
);

ALTER TABLE public.marketplace_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mi_select" ON public.marketplace_interests FOR SELECT USING (
  auth.uid() = buyer_id OR
  EXISTS (SELECT 1 FROM public.marketplace_listings ml WHERE ml.id = marketplace_interests.listing_id AND ml.seller_id = auth.uid())
);
CREATE POLICY "mi_insert" ON public.marketplace_interests FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- ── mental_health_circles ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mental_health_circles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic       TEXT        NOT NULL UNIQUE,
  description TEXT        NOT NULL,
  icon        TEXT        NOT NULL DEFAULT '💛',
  color       TEXT        NOT NULL DEFAULT '#f59e0b',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE
);

ALTER TABLE public.mental_health_circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mhc_select" ON public.mental_health_circles FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.circle_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   UUID        NOT NULL REFERENCES public.mental_health_circles(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  flagged     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cm_circle_idx ON public.circle_messages (circle_id, created_at);

ALTER TABLE public.circle_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_select" ON public.circle_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cm_insert" ON public.circle_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_messages;

-- Seed the mental health circles
INSERT INTO public.mental_health_circles (topic, description, icon, color) VALUES
  ('Exam Stress',      'Dealing with academic pressure, exam anxiety, and results.',      '📚', '#3b82f6'),
  ('Homesickness',     'Missing home, family, and the familiar — especially in first year.', '🏠', '#f59e0b'),
  ('Career Anxiety',   'Placement pressure, internship rejections, uncertain future.',    '💼', '#a855f7'),
  ('Relationship',     'Friendships, breakups, social dynamics, loneliness on campus.',  '💛', '#ec4899'),
  ('Family Pressure',  'Handling expectations, financial stress, family conflicts.',      '👨‍👩‍👧', '#10b981'),
  ('General Support',  'Anything on your mind — this space is for all of it.',            '🫂', '#06b6d4')
ON CONFLICT (topic) DO NOTHING;

-- ── societies ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.societies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  college    TEXT        NOT NULL,
  category   TEXT        DEFAULT 'general',
  leader_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_society_name UNIQUE (name, college)
);

ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "soc_select" ON public.societies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "soc_insert" ON public.societies FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "soc_update" ON public.societies FOR UPDATE USING (auth.uid() = leader_id);

CREATE TABLE IF NOT EXISTS public.society_polls (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id  UUID        NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  question    TEXT        NOT NULL,
  options     TEXT[]      NOT NULL,
  ends_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.society_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_select" ON public.society_polls FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sp_insert" ON public.society_polls FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.societies s WHERE s.id = society_polls.society_id AND s.leader_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID        NOT NULL REFERENCES public.society_polls(id) ON DELETE CASCADE,
  voter_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_index SMALLINT    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_poll_vote UNIQUE (poll_id, voter_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_select" ON public.poll_votes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pv_insert" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE TABLE IF NOT EXISTS public.society_recruitment (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id  UUID        NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  criteria    TEXT,
  deadline    TIMESTAMPTZ,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.society_recruitment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_select" ON public.society_recruitment FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sr_insert" ON public.society_recruitment FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.societies s WHERE s.id = society_recruitment.society_id AND s.leader_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.recruitment_applications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recruitment_id  UUID        NOT NULL REFERENCES public.society_recruitment(id) ON DELETE CASCADE,
  applicant_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  portfolio_text  TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_recruitment_app UNIQUE (recruitment_id, applicant_id)
);

ALTER TABLE public.recruitment_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra_select" ON public.recruitment_applications FOR SELECT USING (
  auth.uid() = applicant_id OR
  EXISTS (
    SELECT 1 FROM public.society_recruitment sr
    JOIN public.societies s ON s.id = sr.society_id
    WHERE sr.id = recruitment_applications.recruitment_id AND s.leader_id = auth.uid()
  )
);
CREATE POLICY "ra_insert" ON public.recruitment_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- ── daily challenges + streaks ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_challenge_assignments (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID  NOT NULL REFERENCES public.skill_challenges(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT unique_daily_assignment UNIQUE (assigned_date, challenge_id)
);

ALTER TABLE public.daily_challenge_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dca_select" ON public.daily_challenge_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dca_insert" ON public.daily_challenge_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id            UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak     INT         NOT NULL DEFAULT 0,
  longest_streak     INT         NOT NULL DEFAULT 0,
  last_completed_at  DATE,
  total_completions  INT         NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us_select" ON public.user_streaks FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger: update streak when a badge is minted (badge_earned score event)
CREATE OR REPLACE FUNCTION public.update_streak_on_badge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today        DATE := CURRENT_DATE;
  v_last_date    DATE;
  v_current      INT;
  v_longest      INT;
  v_total        INT;
BEGIN
  SELECT last_completed_at, current_streak, longest_streak, total_completions
  INTO   v_last_date, v_current, v_longest, v_total
  FROM   public.user_streaks
  WHERE  user_id = NEW.user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_completed_at, total_completions)
    VALUES (NEW.user_id, 1, 1, v_today, 1);
    RETURN NEW;
  END IF;

  -- Already completed today
  IF v_last_date = v_today THEN
    UPDATE public.user_streaks SET total_completions = v_total + 1, updated_at = NOW() WHERE user_id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Completed yesterday → extend streak
  IF v_last_date = v_today - 1 THEN
    v_current := v_current + 1;
  ELSE
    -- Streak broken
    v_current := 1;
  END IF;

  v_longest := GREATEST(v_longest, v_current);

  UPDATE public.user_streaks
  SET current_streak    = v_current,
      longest_streak    = v_longest,
      last_completed_at = v_today,
      total_completions = v_total + 1,
      updated_at        = NOW()
  WHERE user_id = NEW.user_id;

  -- Award streak badges
  IF v_current IN (5, 10, 30) THEN
    INSERT INTO public.badges (user_id, category, difficulty)
    VALUES (NEW.user_id, 'streak_' || v_current, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_badge_minted ON public.badges;
CREATE TRIGGER on_badge_minted
  AFTER INSERT ON public.badges
  FOR EACH ROW EXECUTE FUNCTION public.update_streak_on_badge();
