-- Run this once in the Supabase SQL Editor after create-tables.sql.
-- Salary configuration moved to salary_confirmations.

create table if not exists public.credit_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  closing_day int check (closing_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('principal', 'poupanca', 'reserva', 'outro')),
  active boolean not null default true,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.reserve_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount >= 0),
  target_month date not null,
  monthly_contribution numeric(12,2) check (monthly_contribution >= 0),
  account_id uuid references public.accounts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.card_expenses
  add column if not exists card_id uuid references public.credit_cards(id) on delete restrict;

alter table public.credit_cards enable row level security;
alter table public.accounts enable row level security;
alter table public.reserve_plans enable row level security;

drop policy if exists "Users can manage their credit cards" on public.credit_cards;
drop policy if exists "Users can manage their accounts" on public.accounts;
drop policy if exists "Users can manage their reserve plans" on public.reserve_plans;

create policy "Users can manage their credit cards"
on public.credit_cards
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their accounts"
on public.accounts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their reserve plans"
on public.reserve_plans
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
