
-- 1) Add transfers_disabled column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS transfers_disabled boolean NOT NULL DEFAULT false;

-- 2) Wire the existing handle_new_user function as trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill profiles for existing auth users
INSERT INTO public.profiles (id, email, full_name, phone, account_number)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  lpad((floor(random() * 1000000000)::bigint)::text, 10, '0')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4) Backfill default user role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;

-- 5) Backfill the 4 accounts for users that have a profile but no accounts
INSERT INTO public.accounts (user_id, kind, name, account_number)
SELECT
  p.id, 'checking'::account_kind, 'Total Checking',
  lpad((floor(random() * 1000000000)::bigint)::text, 10, '0')
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = p.id AND a.kind = 'checking');

INSERT INTO public.accounts (user_id, kind, name, account_number)
SELECT
  p.id, 'savings'::account_kind, 'Savings',
  lpad((floor(random() * 1000000000)::bigint)::text, 10, '0')
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = p.id AND a.kind = 'savings');

INSERT INTO public.accounts (user_id, kind, name, account_number)
SELECT
  p.id, 'credit'::account_kind, 'Sapphire Preferred Card',
  lpad((floor(random() * 10000000000000000)::bigint)::text, 16, '0')
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = p.id AND a.kind = 'credit');

INSERT INTO public.accounts (user_id, kind, name, account_number)
SELECT
  p.id, 'loan'::account_kind, 'Auto Loan',
  lpad((floor(random() * 1000000000)::bigint)::text, 10, '0')
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = p.id AND a.kind = 'loan');

-- 6) Update the users update policy to also lock transfers_disabled
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
  );
