# AGENTS.md

This repository uses spec-driven development. All functional changes must be traceable to a written specification before implementation.

## Mission
Build and evolve a personal finance app for tracking income, fixed expenses, card expenses, invoice logic, and budget movement for a single user.

## Source of truth
- Functional requirements live in `specs/`
- The implementation lives in the app root (`index.html`, `app.js`, `styles.css`, `config.js`)
- Database rules live in `supabase/`

## Required workflow for every AI agent
1. Read the relevant spec in `specs/` before editing behavior.
2. If the requested change is not covered by an existing spec, create or update a spec first.
3. Make the smallest change necessary to satisfy the spec.
4. Keep the codebase free of demo-only data in production-ready state.
5. Preserve real finance rules: income, fixed expenses, card categories, invoice totals, and budget balance.
6. Validate the behavior with the browser and relevant repo checks before finalizing.

## Project constraints
- Do not reintroduce fake/default demo values into production paths.
- Do not add generic payment forms when the domain is already defined by the app.
- Do not create broad, unrelated refactors without a matching spec update.
- Prefer explicit domain terms: salary, fixed expense, card expense, invoice adjustment, transfer, budget month.
- Keep the app mobile-first and lightweight.
- Keep Supabase integration aligned with the schema in `supabase/create-tables.sql`.

## Repository map
- `index.html` — app layout and auth shell
- `app.js` — runtime logic and Supabase integration
- `styles.css` — visual design
- `config.js` — project config values
- `supabase/create-tables.sql` — canonical database schema
- `supabase/seed-categories.sql` — initial category seed
- `specs/` — product and implementation specs

## Acceptance standard
A valid change must:
- match one or more entries in `specs/`
- avoid introducing fake data or demo artifacts
- remain consistent with Supabase schema and domain rules
- be understandable without hidden assumptions
