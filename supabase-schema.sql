-- ============================================================
-- NEXUS DATABASE SCHEMA
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- ── Users table (private identity layer) ──────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,
  college_domain      TEXT        NOT NULL,
  phone               TEXT,
  phone_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  onboarding_complete BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Profiles table (public anonymous layer) ───────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  pseudonym       TEXT        NOT NULL UNIQUE,
  college         TEXT        NOT NULL,
  branch          TEXT,
  batch_year      SMALLINT,
  bio             TEXT,
  interests       TEXT[]      NOT NULL DEFAULT '{}',
  github_url      TEXT,
  behance_url     TEXT,
  avatar_color    TEXT        NOT NULL DEFAULT '#7c3aed',
  reliability_score SMALLINT  NOT NULL DEFAULT 70 CHECK (reliability_score BETWEEN 0 AND 100),
  is_shadow_banned BOOLEAN    NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auto-update updated_at on profiles ───────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Auto-create users row on Google sign-in ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, college_domain)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 2)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- users: each user can only see and edit their own row
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- profiles: any authenticated user can read; only owner can write
DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_pseudonym_idx ON public.profiles (pseudonym);
CREATE INDEX IF NOT EXISTS profiles_college_domain_idx ON public.users (college_domain);
CREATE INDEX IF NOT EXISTS profiles_reliability_idx ON public.profiles (reliability_score DESC);
