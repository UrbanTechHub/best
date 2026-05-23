
-- 1. Trigger on auth.users to run handle_new_user on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill for existing users missing profile/accounts/role
DO $$
DECLARE
  u RECORD;
  acct_checking text;
  acct_savings text;
  acct_credit text;
  acct_loan text;
BEGIN
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    acct_checking := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');
    acct_savings  := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');
    acct_credit   := lpad((floor(random() * 10000000000000000)::bigint)::text, 16, '0');
    acct_loan     := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
      INSERT INTO public.profiles (id, email, full_name, phone, account_number)
      VALUES (
        u.id,
        u.email,
        coalesce(u.raw_user_meta_data->>'full_name', ''),
        coalesce(u.raw_user_meta_data->>'phone', ''),
        acct_checking
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (u.id, 'user');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = u.id) THEN
      INSERT INTO public.accounts (user_id, kind, name, account_number) VALUES
        (u.id, 'checking', 'Total Checking', acct_checking),
        (u.id, 'savings',  'Savings',         acct_savings),
        (u.id, 'credit',   'Sapphire Preferred Card', acct_credit),
        (u.id, 'loan',     'Auto Loan',       acct_loan);
    END IF;
  END LOOP;
END $$;

-- 3. Create admin account
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@mail.com';

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@mail.com',
      crypt('Admin3344@@', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin"}'::jsonb,
      false, '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@mail.com'),
      'email',
      admin_id::text,
      now(), now(), now()
    );
  END IF;

  -- Ensure admin role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = admin_id AND role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
  END IF;
END $$;
