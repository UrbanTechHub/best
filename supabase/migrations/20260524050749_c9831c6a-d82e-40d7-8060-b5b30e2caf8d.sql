ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_logout boolean NOT NULL DEFAULT false;

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
  AND NOT (transfer_pin IS DISTINCT FROM (SELECT p.transfer_pin FROM public.profiles p WHERE p.id = auth.uid()))
  AND transfers_disabled = (SELECT p.transfers_disabled FROM public.profiles p WHERE p.id = auth.uid())
  AND NOT (login_otp IS DISTINCT FROM (SELECT p.login_otp FROM public.profiles p WHERE p.id = auth.uid()))
  AND force_logout = (SELECT p.force_logout FROM public.profiles p WHERE p.id = auth.uid())
);