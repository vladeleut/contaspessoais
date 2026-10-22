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
7. Configure default financial settings: salary entries, cards, accounts, and planned reserves.
8. Work with January 2026 as the real baseline for initial usage.

## Domain rules
- Income entries belong to a user and are associated with a monthly budget context.
- Fixed expenses have name, amount, due day, paid status, and recurring behavior.
- Card expenses are tracked by category, date, and invoice month.
- Categories are user-scoped and may be created dynamically.
- Eventual expenses should be handled under the single category `Eventuais`.
- The app should not rely on demo data in production mode.
- A user can configure salary defaults for the 15th, 30th, and a monthly salary; these are planning defaults and do not replace recorded income entries.
- A user can register three or more credit cards. Every card expense must belong to exactly one configured card.
- A user can create accounts, including a savings account, to track where available funds are held.
- A user can create reserve plans for future annual or exceptional costs, such as IPVA, IPTU, and transit expenses. A reserve plan has a target amount, target month, and an optional monthly contribution.

## Experience requirements
- The home screen must prioritize the current monthly position before data-entry forms.
- Income, card expense, and fixed expense are distinct financial actions and must remain visually distinct.
- The interface must be lightweight, mobile-first, and optimized for frequent, one-handed use.
- Forms should stay available on the same page but should not visually dominate an empty financial dashboard.
- Use concise, domain-specific language and show empty states when no real records exist.
- Settings are a dedicated view, separate from the monthly operational dashboard, and must support adding new cards, accounts, and reserve plans over time.

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
- Users can configure three or more cards, salary defaults, savings accounts, and future-cost reserves without altering application code.
- AI agents can understand the business intent from the spec without reverse engineering the code.
