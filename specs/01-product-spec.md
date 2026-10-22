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
7. Confirm the salary received on the 15th and 30th for each budget month.
8. Register a current-month top-up when external money is used to cover an overage, including its origin.
9. Configure cards, accounts, and planned reserves.
10. Work with January 2026 as the real baseline for initial usage.

## Domain rules
- Income entries belong to a user and are associated with a monthly budget context.
- Fixed expenses have name, amount, due day, paid status, and recurring behavior.
- Card expenses are tracked by category, date, and invoice month.
- Categories are user-scoped and may be created dynamically.
- Eventual expenses should be handled under the single category `Eventuais`.
- The app should not rely on demo data in production mode.
- Salary is a monthly cycle with two independent confirmations: the 15th and the 30th.
- When a new month begins, the expected amount for each salary date is dynamically carried from the matching confirmed amount in the previous month. A first cycle has no expectation until the user confirms it.
- Confirming a salary records the real amount received for that date; it can differ from the carried expectation.
- Monthly salary is derived from the sum of the confirmed 15th and 30th values. It is never a separate configurable or recorded income.
- The salary confirmed in a month is the money available to live in the following budget month.
- A top-up is money added to the current budget month to cover an overage. It has amount, date, and a mandatory origin, such as `tirei do cofrinho`.
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
- The dashboard must show the current salary cycle, its carried expectations, confirmed amounts, and a direct action to record a top-up.

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
- Users can configure three or more cards, savings accounts, and future-cost reserves without altering application code.
- A month carries each salary expectation forward from the previous matching salary confirmation, and the following budget month receives the sum only after confirmation.
- A current-month top-up cannot be saved without its origin.
- AI agents can understand the business intent from the spec without reverse engineering the code.
