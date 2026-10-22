-- Run this once in the Supabase SQL Editor after 20261021_financial_settings.sql.

alter table public.financial_settings
  drop column if exists salary_15,
  drop column if exists salary_30,
  drop column if exists monthly_salary;

drop table if exists public.financial_settings;

create table if not exists public.salary_confirmations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  salary_date date not null,
  salary_part text not null check (salary_part in ('day_15', 'day_30')),
  expected_amount numeric(12,2) check (expected_amount >= 0),
  confirmed_amount numeric(12,2) not null check (confirmed_amount >= 0),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, salary_date, salary_part)
);

create table if not exists public.budget_topups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month date not null,
  amount numeric(12,2) not null check (amount > 0),
  source text not null check (char_length(trim(source)) > 0),
  occurred_on date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.salary_confirmations enable row level security;
alter table public.budget_topups enable row level security;

create policy "Users can manage their salary confirmations"
on public.salary_confirmations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their budget topups"
on public.budget_topups
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
