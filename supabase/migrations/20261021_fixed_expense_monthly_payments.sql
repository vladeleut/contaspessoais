-- Run this once in the Supabase SQL Editor after the previous migrations.

alter table public.fixed_expenses
  add column if not exists payment_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists payment_method text not null default 'manual' check (payment_method in ('manual', 'automatic_debit'));

create table if not exists public.fixed_expense_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixed_expense_id uuid not null references public.fixed_expenses(id) on delete cascade,
  budget_month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  paid_on date not null,
  payment_account_id uuid references public.accounts(id) on delete set null,
  payment_method text not null check (payment_method in ('manual', 'automatic_debit')),
  created_at timestamptz not null default now(),
  unique (fixed_expense_id, budget_month)
);

alter table public.fixed_expense_payments enable row level security;

create policy "Users can manage their fixed expense payments"
on public.fixed_expense_payments
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
