
-- Wire trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles/accounts/roles for existing users
DO $$
DECLARE
  u RECORD;
  acct_checking text;
  acct_savings text;
  acct_credit text;
  acct_loan text;
BEGIN
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
      acct_checking := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');
      acct_savings  := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');
      acct_credit   := lpad((floor(random() * 10000000000000000)::bigint)::text, 16, '0');
      acct_loan     := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');

      INSERT INTO public.profiles (id, email, full_name, phone, account_number)
      VALUES (
        u.id,
        u.email,
        coalesce(u.raw_user_meta_data->>'full_name', ''),
        coalesce(u.raw_user_meta_data->>'phone', ''),
        acct_checking
      );

      INSERT INTO public.user_roles (user_id, role)
      VALUES (u.id, 'user')
      ON CONFLICT (user_id, role) DO NOTHING;

      INSERT INTO public.accounts (user_id, kind, name, account_number) VALUES
        (u.id, 'checking', 'Total Checking', acct_checking),
        (u.id, 'savings',  'Savings',         acct_savings),
        (u.id, 'credit',   'Sapphire Preferred Card', acct_credit),
        (u.id, 'loan',     'Auto Loan',       acct_loan);
    END IF;
  END LOOP;
END $$;
