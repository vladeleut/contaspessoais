# Product specification

## Product goal
Create a mobile-first personal finance app for tracking salaries, fixed expenses, card spending, invoice totals, transfers, and monthly budget balance.

## Core user flows
1. Sign in with Supabase auth.
2. Register income entries for salary and other incomes.
3. Register fixed expenses with due day and paid/scheduled status.
4. Register card expenses by category.
5. Group card category names per user and allow custom categories.
6. View total income, total expense, total card spend, and current month result.
7. Work with January 2026 as the real baseline for initial usage.

## Domain rules
- Income entries belong to a user and are associated with a monthly budget context.
- Fixed expenses have name, amount, due day, paid status, and recurring behavior.
- Card expenses are tracked by category, date, and invoice month.
- Categories are user-scoped and may be created dynamically.
- Eventual expenses should be handled under the single category `Eventuais`.
- The app should not rely on demo data in production mode.

## Out of scope for the current baseline
- Heavy analytics dashboards
- CSV import/export
- Multi-user collaboration
- Generic payment-processor features not tied to this finance domain

## Acceptance criteria
- App loads without demo values when no real data is present.
- Card category names can be added on the fly.
- The data model remains consistent with `supabase/create-tables.sql`.
- The app supports January 2026 as the working starting month.
- AI agents can understand the business intent from the spec without reverse engineering the code.
