
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transfer_pin text;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
  AND account_number = (SELECT p.account_number FROM public.profiles p WHERE p.id = auth.uid())
  AND balance_cents = (SELECT p.balance_cents FROM public.profiles p WHERE p.id = auth.uid())
  AND transfer_pin IS NOT DISTINCT FROM (SELECT p.transfer_pin FROM public.profiles p WHERE p.id = auth.uid())
);
