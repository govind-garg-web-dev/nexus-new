-- ============================================================
-- MATCHBATCH — COINS, PG PHOTOS, SOCIETY EVENTS
-- Run in Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── Coins balance on profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coins_balance INT NOT NULL DEFAULT 0;

-- ── coin_transactions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount        INT         NOT NULL,   -- positive = credit, negative = debit
  reason        TEXT        NOT NULL,   -- e.g. 'challenge_review', 'consulting_help'
  reference_id  UUID,
  balance_after INT         NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ct_user_idx ON public.coin_transactions (user_id, created_at DESC);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_select_own" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);

-- Enable Realtime so CoinToast fires instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;

-- ── coin_config (admin-editable per action) ─────────────────
CREATE TABLE IF NOT EXISTS public.coin_config (
  action_key  TEXT PRIMARY KEY,
  coins       INT  NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_select" ON public.coin_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cc_update" ON public.coin_config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

INSERT INTO public.coin_config (action_key, coins, description) VALUES
  ('challenge_review', 5,   'Reviewing a peer challenge submission'),
  ('consulting_help',  20,  'Completing a 15-min consulting session as solver'),
  ('badge_earned',     10,  'Earning a new skill badge via challenge'),
  ('event_approved',   50,  'Society event approved and published')
ON CONFLICT (action_key) DO NOTHING;

-- ── coin_prizes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coin_prizes (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  description TEXT,
  coin_cost   INT     NOT NULL,
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  stock       INT,    -- NULL = unlimited
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coin_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prizes_select" ON public.coin_prizes FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO public.coin_prizes (name, description, coin_cost, stock) VALUES
  ('Amazon Gift Card ₹100',     'Redeemable Amazon e-gift card',        500,  NULL),
  ('MatchBatch Merch Bundle',   'Exclusive T-shirt + sticker pack',     1000, 50),
  ('Campus Ambassador Bonus',   'Special recognition badge + perks',    300,  NULL),
  ('Swiggy Voucher ₹100',       'Food delivery voucher',                400,  NULL)
ON CONFLICT DO NOTHING;

-- ── award_coins() DB function ──────────────────────────────
CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id    UUID,
  p_amount     INT,
  p_reason     TEXT,
  p_reference  UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_balance INT;
BEGIN
  UPDATE public.profiles
  SET    coins_balance = coins_balance + p_amount
  WHERE  id = p_user_id
  RETURNING coins_balance INTO v_balance;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found: %', p_user_id; END IF;

  INSERT INTO public.coin_transactions (user_id, amount, reason, reference_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_reference, v_balance);

  RETURN v_balance;
END;
$$;

-- ── PG listings: photo support ─────────────────────────────
ALTER TABLE public.pg_listings
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

-- ── Events: society submission + approval flow ─────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS society_id      UUID REFERENCES public.societies(id),
  ADD COLUMN IF NOT EXISTS is_charged      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ticket_price    INT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending','approved','rejected'));

-- Update events RLS: verified society leaders can also submit (as pending)
DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  OR
  EXISTS (
    SELECT 1 FROM public.societies s
    WHERE s.leader_id = auth.uid() AND s.verified = TRUE
  )
);

-- Update events select: regular users only see approved events
DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT USING (
  approval_status = 'approved'
  OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  OR
  EXISTS (
    SELECT 1 FROM public.societies s
    WHERE s.id = events.society_id AND s.leader_id = auth.uid()
  )
);
