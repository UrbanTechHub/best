
-- Allow users to insert their own transactions (e.g. transfers they initiate)
CREATE POLICY "Users insert own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

-- Allow users to update their own accounts (needed to adjust balance on transfer)
CREATE POLICY "Users update own accounts"
ON public.accounts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add login OTP column (admin-controlled)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_otp text;

-- Rewrite the user self-update policy to also lock login_otp
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
);
