create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.incomes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  income_type text not null check (
    income_type in ('salario_15', 'salario_30', 'bonus', 'outro')
  ),
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  received_on date not null,
  budget_month date not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.fixed_expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_day int not null check (due_day between 1 and 31),
  category text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'paid')),
  paid_at date,
  active boolean not null default true,
  recurring boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.card_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.card_expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  occurred_on date not null,
  invoice_month date not null,
  is_installment boolean not null default false,
  installments_total int,
  installment_current int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.card_invoice_adjustments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null,
  invoice_month date not null,
  affects_budget boolean not null default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.account_transfers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  transfer_date date not null,
  source_account text not null default 'principal',
  destination_account text not null default 'paralela',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.month_periods (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  month_end date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'locked')),
  created_at timestamptz default now(),
  unique (user_id, month_start)
);

create table if not exists public.budget_months (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  total_income numeric(12,2) not null default 0,
  total_fixed_expenses numeric(12,2) not null default 0,
  total_card_expenses numeric(12,2) not null default 0,
  total_adjustments numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  unique (user_id, month_start)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuário'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.incomes enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.card_categories enable row level security;
alter table public.card_expenses enable row level security;
alter table public.card_invoice_adjustments enable row level security;
alter table public.account_transfers enable row level security;
alter table public.month_periods enable row level security;
alter table public.budget_months enable row level security;

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can manage their incomes"
on public.incomes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their fixed expenses"
on public.fixed_expenses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their card categories"
on public.card_categories
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their card expenses"
on public.card_expenses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their invoice adjustments"
on public.card_invoice_adjustments
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their transfers"
on public.account_transfers
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their months"
on public.month_periods
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their budget months"
on public.budget_months
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
