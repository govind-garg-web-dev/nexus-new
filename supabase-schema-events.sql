-- ============================================================
-- NEXUS — EVENTS & REFERRALS SCHEMA (Block 6)
-- Run AFTER supabase-schema-vault.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── Add admin role to users ────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user','admin','moderator'));

-- ── events ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'other'
    CHECK (type IN ('hackathon','fest','internship','workshop','other')),
  organizer    TEXT,
  deadline     TIMESTAMPTZ,
  event_date   TIMESTAMPTZ,
  link         TEXT,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  is_featured  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON public.events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','moderator'))
);
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

CREATE INDEX IF NOT EXISTS events_type_idx     ON public.events (type);
CREATE INDEX IF NOT EXISTS events_deadline_idx ON public.events (deadline);
CREATE INDEX IF NOT EXISTS events_featured_idx ON public.events (is_featured DESC, created_at DESC);

-- ── event_lobbies (team formation posts) ──────────────────
CREATE TABLE IF NOT EXISTS public.event_lobbies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  looking_for  TEXT        NOT NULL,
  team_size    SMALLINT    NOT NULL DEFAULT 1,
  slots_needed SMALLINT    NOT NULL DEFAULT 1,
  badge_filter TEXT,            -- required badge category for applicants
  locked       BOOLEAN     NOT NULL DEFAULT FALSE,
  locked_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_lobby_per_user_per_event UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_lobbies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lobbies_select" ON public.event_lobbies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "lobbies_insert" ON public.event_lobbies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lobbies_update" ON public.event_lobbies FOR UPDATE USING (auth.uid() = user_id);

-- ── lobby_replies (applications to join a team) ────────────
CREATE TABLE IF NOT EXISTS public.lobby_replies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id     UUID        NOT NULL REFERENCES public.event_lobbies(id) ON DELETE CASCADE,
  applicant_id UUID        NOT NULL REFERENCES public.users(id)         ON DELETE CASCADE,
  note         TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_reply_per_lobby UNIQUE (lobby_id, applicant_id)
);

ALTER TABLE public.lobby_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies_select" ON public.lobby_replies FOR SELECT USING (
  auth.uid() = applicant_id OR
  EXISTS (SELECT 1 FROM public.event_lobbies el WHERE el.id = lobby_replies.lobby_id AND el.user_id = auth.uid())
);
CREATE POLICY "replies_insert" ON public.lobby_replies FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "replies_update" ON public.lobby_replies FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.event_lobbies el WHERE el.id = lobby_replies.lobby_id AND el.user_id = auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.event_lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_replies;

-- ── referral_posts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company     TEXT        NOT NULL,
  role        TEXT        NOT NULL,
  slots       SMALLINT    NOT NULL DEFAULT 1,
  criteria    TEXT        NOT NULL,
  deadline    TIMESTAMPTZ,
  is_alumni   BOOLEAN     NOT NULL DEFAULT FALSE,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_posts_select" ON public.referral_posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ref_posts_insert" ON public.referral_posts FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "ref_posts_update" ON public.referral_posts FOR UPDATE USING (auth.uid() = poster_id);

-- ── referral_applications ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_applications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID        NOT NULL REFERENCES public.referral_posts(id) ON DELETE CASCADE,
  applicant_id UUID        NOT NULL REFERENCES public.users(id)           ON DELETE CASCADE,
  note         TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','selected','rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_app_per_post UNIQUE (post_id, applicant_id)
);

ALTER TABLE public.referral_applications ENABLE ROW LEVEL SECURITY;
-- Applicant sees their own; poster sees all for their post
CREATE POLICY "ref_apps_select" ON public.referral_applications FOR SELECT USING (
  auth.uid() = applicant_id OR
  EXISTS (SELECT 1 FROM public.referral_posts rp WHERE rp.id = referral_applications.post_id AND rp.poster_id = auth.uid())
);
CREATE POLICY "ref_apps_insert" ON public.referral_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "ref_apps_update" ON public.referral_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.referral_posts rp WHERE rp.id = referral_applications.post_id AND rp.poster_id = auth.uid())
);

-- ── carpool_posts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carpool_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_location TEXT        NOT NULL,
  to_location   TEXT        NOT NULL,
  travel_date   DATE        NOT NULL,
  seats         SMALLINT    NOT NULL DEFAULT 1,
  cost_per_head INT,
  gender_pref   TEXT        NOT NULL DEFAULT 'any'
    CHECK (gender_pref IN ('any','male','female')),
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','full','cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.carpool_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carpool_select" ON public.carpool_posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "carpool_insert" ON public.carpool_posts FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "carpool_update" ON public.carpool_posts FOR UPDATE USING (auth.uid() = poster_id);

-- ── carpool_requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carpool_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID        NOT NULL REFERENCES public.carpool_posts(id) ON DELETE CASCADE,
  requester_id UUID        NOT NULL REFERENCES public.users(id)          ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_request_per_post UNIQUE (post_id, requester_id)
);

ALTER TABLE public.carpool_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carpool_req_select" ON public.carpool_requests FOR SELECT USING (
  auth.uid() = requester_id OR
  EXISTS (SELECT 1 FROM public.carpool_posts cp WHERE cp.id = carpool_requests.post_id AND cp.poster_id = auth.uid())
);
CREATE POLICY "carpool_req_insert" ON public.carpool_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "carpool_req_update" ON public.carpool_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.carpool_posts cp WHERE cp.id = carpool_requests.post_id AND cp.poster_id = auth.uid())
);
