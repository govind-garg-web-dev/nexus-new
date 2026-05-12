-- ============================================================
-- NEXUS — ACADEMIC VAULT SCHEMA (Block 5)
-- Run AFTER supabase-schema-chat.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- Allow system-awarded badges (Contributor) without a challenge
ALTER TABLE public.badges ALTER COLUMN challenge_id DROP NOT NULL;
ALTER TABLE public.badges ALTER COLUMN submission_id DROP NOT NULL;

-- Add vault karma to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vault_karma INT NOT NULL DEFAULT 0;

-- ── vault_uploads ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_uploads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  college      TEXT        NOT NULL,
  branch       TEXT        NOT NULL,
  semester     SMALLINT    CHECK (semester BETWEEN 1 AND 10),
  course_code  TEXT,
  course_name  TEXT        NOT NULL,
  year         SMALLINT,
  type         TEXT        NOT NULL DEFAULT 'notes'
    CHECK (type IN ('pyq','notes','lab','assignment','other')),
  file_url     TEXT        NOT NULL,
  file_name    TEXT        NOT NULL,
  file_size    INT,
  mime_type    TEXT,
  search_text  TEXT,       -- extracted from PDF or user description
  verified     BOOLEAN     NOT NULL DEFAULT TRUE, -- auto-verified for now
  upvotes      INT         NOT NULL DEFAULT 0,
  downvotes    INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vault_college_idx  ON public.vault_uploads (college);
CREATE INDEX IF NOT EXISTS vault_branch_idx   ON public.vault_uploads (branch);
CREATE INDEX IF NOT EXISTS vault_semester_idx ON public.vault_uploads (semester);
CREATE INDEX IF NOT EXISTS vault_course_idx   ON public.vault_uploads (course_code);
CREATE INDEX IF NOT EXISTS vault_type_idx     ON public.vault_uploads (type);
-- Full-text search index
CREATE INDEX IF NOT EXISTS vault_search_idx   ON public.vault_uploads
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(course_name,'') || ' ' || coalesce(search_text,'')));

ALTER TABLE public.vault_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault_select" ON public.vault_uploads;
CREATE POLICY "vault_select" ON public.vault_uploads
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "vault_insert" ON public.vault_uploads;
CREATE POLICY "vault_insert" ON public.vault_uploads
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);

-- ── vault_votes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_votes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id   UUID        NOT NULL REFERENCES public.vault_uploads(id) ON DELETE CASCADE,
  vote        SMALLINT    NOT NULL CHECK (vote IN (1, -1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_vote_per_upload UNIQUE (user_id, upload_id)
);

ALTER TABLE public.vault_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_votes_select" ON public.vault_votes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vault_votes_insert" ON public.vault_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vault_votes_delete" ON public.vault_votes FOR DELETE USING (auth.uid() = user_id);

-- Trigger: sync vote counts on vault_uploads
CREATE OR REPLACE FUNCTION public.sync_vault_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.vault_uploads
  SET
    upvotes   = (SELECT COUNT(*) FROM public.vault_votes WHERE upload_id = COALESCE(NEW.upload_id, OLD.upload_id) AND vote =  1),
    downvotes = (SELECT COUNT(*) FROM public.vault_votes WHERE upload_id = COALESCE(NEW.upload_id, OLD.upload_id) AND vote = -1)
  WHERE id = COALESCE(NEW.upload_id, OLD.upload_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_vault_vote ON public.vault_votes;
CREATE TRIGGER on_vault_vote
  AFTER INSERT OR UPDATE OR DELETE ON public.vault_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_vault_vote_counts();

-- ── vault_flags ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_flags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id  UUID        NOT NULL REFERENCES public.vault_uploads(id) ON DELETE CASCADE,
  reason     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_flag_per_upload UNIQUE (user_id, upload_id)
);

ALTER TABLE public.vault_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_flags_insert" ON public.vault_flags FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger: award karma + contributor badge when uploads cross 10
CREATE OR REPLACE FUNCTION public.handle_vault_upload()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  -- Award 5 karma per upload
  UPDATE public.profiles SET vault_karma = vault_karma + 5 WHERE id = NEW.uploader_id;

  -- Check if contributor badge threshold reached (10 uploads)
  SELECT COUNT(*) INTO v_count FROM public.vault_uploads WHERE uploader_id = NEW.uploader_id AND verified = TRUE;
  IF v_count >= 10 THEN
    INSERT INTO public.badges (user_id, category, difficulty)
    VALUES (NEW.uploader_id, 'contributor', 1)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vault_upload ON public.vault_uploads;
CREATE TRIGGER on_vault_upload
  AFTER INSERT ON public.vault_uploads
  FOR EACH ROW EXECUTE FUNCTION public.handle_vault_upload();

-- ── course_reviews ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  college          TEXT        NOT NULL,
  course_code      TEXT        NOT NULL,
  course_name      TEXT        NOT NULL,
  professor_name   TEXT        NOT NULL,
  year_taken       SMALLINT,
  clarity          SMALLINT    CHECK (clarity     BETWEEN 1 AND 5),
  fairness         SMALLINT    CHECK (fairness    BETWEEN 1 AND 5),
  difficulty       SMALLINT    CHECK (difficulty  BETWEEN 1 AND 5),
  attendance_req   SMALLINT    CHECK (attendance_req BETWEEN 1 AND 5),
  review_text      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_review_per_course UNIQUE (reviewer_id, course_code)
);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select" ON public.course_reviews FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "reviews_insert" ON public.course_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ── study_rooms ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject       TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','pomodoro','break','ended')),
  pomodoro_mins SMALLINT    NOT NULL DEFAULT 25,
  break_mins    SMALLINT    NOT NULL DEFAULT 5,
  timer_ends_at TIMESTAMPTZ,
  phase         SMALLINT    NOT NULL DEFAULT 0,
  max_members   SMALLINT    NOT NULL DEFAULT 6,
  jitsi_room_id TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_room_members (
  room_id   UUID        NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

ALTER TABLE public.study_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select" ON public.study_rooms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "rooms_insert" ON public.study_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "rooms_update" ON public.study_rooms FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "members_select" ON public.study_room_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "members_insert" ON public.study_room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete" ON public.study_room_members FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_members;

-- ── micro_consulting ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.micro_consulting (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject      TEXT        NOT NULL,
  difficulty   SMALLINT    NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  description  TEXT        NOT NULL,
  badge_needed TEXT,       -- category of badge solver should have
  status       TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','accepted','completed','expired')),
  solver_id    UUID        REFERENCES public.users(id),
  room_id      TEXT,       -- shared Jitsi + Excalidraw room identifier
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.micro_consulting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consulting_select" ON public.micro_consulting FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "consulting_insert" ON public.micro_consulting FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "consulting_update" ON public.micro_consulting
  FOR UPDATE USING (auth.uid() = poster_id OR auth.uid() = solver_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.micro_consulting;
