-- ============================================================
-- NEXUS — ROOMMATES SCHEMA (Block 7)
-- Run AFTER supabase-schema-events.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── roommate_profiles ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roommate_profiles (
  user_id        UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

  -- Q1: Sleep schedule (1=before 10 PM, 3=midnight, 5=after 2 AM)
  sleep_schedule SMALLINT    NOT NULL CHECK (sleep_schedule BETWEEN 1 AND 5),
  -- Q2: Cleanliness (1=messy, 3=moderate, 5=surgical)
  cleanliness    SMALLINT    NOT NULL CHECK (cleanliness BETWEEN 1 AND 5),
  -- Q3: Visitors policy
  visitors       TEXT        NOT NULL CHECK (visitors IN ('rarely','monthly','weekly','often')),
  -- Q4: My diet
  diet           TEXT        NOT NULL CHECK (diet IN ('veg','non_veg','both')),
  -- Q5: Preference for roommate's diet
  diet_pref      TEXT        NOT NULL CHECK (diet_pref IN ('veg_only','non_veg_ok','no_pref')),
  -- Q6: Study environment needed
  study_env      TEXT        NOT NULL CHECK (study_env IN ('silent','music_ok','calls_ok','anything')),
  -- Q7: Smoke at home
  smoke          TEXT        NOT NULL CHECK (smoke IN ('no','yes','no_pref')),
  -- Q8: Drink at home
  drink          TEXT        NOT NULL CHECK (drink IN ('no','yes','no_pref')),
  -- Q9: Weekend pattern
  weekend        TEXT        NOT NULL CHECK (weekend IN ('home_always','sometimes_home','stays_in','social')),
  -- Q10: Wake-up time
  wake_time      TEXT        NOT NULL CHECK (wake_time IN ('early','normal','late','very_late')),
  -- Q11: Overnight guests
  overnight      TEXT        NOT NULL CHECK (overnight IN ('never','rarely','ok','often')),
  -- Q12: Gender preference for roommate
  gender_pref    TEXT        NOT NULL CHECK (gender_pref IN ('same','any')),

  -- Housing preferences
  looking_for    TEXT        CHECK (looking_for IN ('hostel','pg','flat','any')),
  budget_max     INT,
  move_in_date   DATE,
  bio            TEXT,

  active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS roommate_updated_at ON public.roommate_profiles;
CREATE TRIGGER roommate_updated_at
  BEFORE UPDATE ON public.roommate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.roommate_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rp_select" ON public.roommate_profiles;
CREATE POLICY "rp_select" ON public.roommate_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rp_insert" ON public.roommate_profiles;
CREATE POLICY "rp_insert" ON public.roommate_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rp_update" ON public.roommate_profiles;
CREATE POLICY "rp_update" ON public.roommate_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ── pg_listings (off-campus housing) ──────────────────────
CREATE TABLE IF NOT EXISTS public.pg_listings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  location        TEXT        NOT NULL,
  area            TEXT,
  rent_per_month  INT         NOT NULL,
  slots_available SMALLINT    NOT NULL DEFAULT 1,
  gender_pref     TEXT        NOT NULL DEFAULT 'any'
    CHECK (gender_pref IN ('male','female','any')),
  amenities       TEXT[]      NOT NULL DEFAULT '{}',
  description     TEXT,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pg_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pg_select" ON public.pg_listings;
CREATE POLICY "pg_select" ON public.pg_listings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pg_insert" ON public.pg_listings;
CREATE POLICY "pg_insert" ON public.pg_listings
  FOR INSERT WITH CHECK (auth.uid() = poster_id);

DROP POLICY IF EXISTS "pg_update" ON public.pg_listings;
CREATE POLICY "pg_update" ON public.pg_listings
  FOR UPDATE USING (auth.uid() = poster_id);

CREATE INDEX IF NOT EXISTS pg_listings_active_idx ON public.pg_listings (active, created_at DESC);
