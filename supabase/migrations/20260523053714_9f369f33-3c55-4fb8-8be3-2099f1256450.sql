
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  address text,
  account_number text unique not null,
  balance_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Transactions
create type public.txn_type as enum ('credit', 'debit');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.txn_type not null,
  amount_cents bigint not null check (amount_cents > 0),
  description text not null default '',
  balance_after_cents bigint not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create index on public.transactions (user_id, created_at desc);

-- RLS: profiles
create policy "Users view own profile" on public.profiles for select
  using (auth.uid() = id);
create policy "Admins view all profiles" on public.profiles for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update profiles" on public.profiles for update
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert profiles" on public.profiles for insert
  with check (public.has_role(auth.uid(), 'admin'));

-- RLS: user_roles
create policy "Users view own roles" on public.user_roles for select
  using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- RLS: transactions
create policy "Users view own transactions" on public.transactions for select
  using (auth.uid() = user_id);
create policy "Admins view all transactions" on public.transactions for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert transactions" on public.transactions for insert
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update transactions" on public.transactions for update
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete transactions" on public.transactions for delete
  using (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + assign user role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  acct text;
begin
  acct := lpad((floor(random() * 1000000000)::bigint)::text, 10, '0');
  insert into public.profiles (id, email, full_name, phone, account_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    acct
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
