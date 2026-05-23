
-- Transaction status enum
DO $$ BEGIN
  CREATE TYPE public.txn_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status public.txn_status NOT NULL DEFAULT 'completed';

-- Let users update their own profile, but lock down sensitive fields
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  AND account_number = (SELECT account_number FROM public.profiles WHERE id = auth.uid())
  AND balance_cents = (SELECT balance_cents FROM public.profiles WHERE id = auth.uid())
);
