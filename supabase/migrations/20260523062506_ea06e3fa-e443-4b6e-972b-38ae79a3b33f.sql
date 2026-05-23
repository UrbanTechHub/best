
-- 1) accounts table
CREATE TYPE public.account_kind AS ENUM ('checking', 'savings', 'credit', 'loan');

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.account_kind NOT NULL,
  name text NOT NULL,
  account_number text NOT NULL,
  balance_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all accounts" ON public.accounts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update accounts" ON public.accounts
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete accounts" ON public.accounts
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX accounts_user_id_idx ON public.accounts(user_id);

-- 2) transactions linked to accounts
ALTER TABLE public.transactions ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
CREATE INDEX transactions_account_id_idx ON public.transactions(account_id);

-- 3) signup hook seeds default accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  acct_checking text;
  acct_savings text;
  acct_credit text;
  acct_loan text;
begin
  acct_checking := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');
  acct_savings  := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');
  acct_credit   := lpad((floor(random() * 10000000000000000)::bigint)::text, 16, '0');
  acct_loan     := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');

  insert into public.profiles (id, email, full_name, phone, account_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    acct_checking
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');

  insert into public.accounts (user_id, kind, name, account_number) values
    (new.id, 'checking', 'Total Checking', acct_checking),
    (new.id, 'savings',  'Savings',         acct_savings),
    (new.id, 'credit',   'Sapphire Preferred Card', acct_credit),
    (new.id, 'loan',     'Auto Loan',       acct_loan);

  return new;
end;
$$;

-- 4) create admin user
DO $$
DECLARE
  uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@mail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'admin@mail.com', crypt('Admin3344@@', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), uid,
      jsonb_build_object('sub', uid::text, 'email', 'admin@mail.com'),
      'email', uid::text, now(), now(), now()
    );

    -- handle_new_user trigger already inserted a 'user' role; add admin
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
