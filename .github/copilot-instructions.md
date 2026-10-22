# Copilot instructions

This repository follows spec-driven development.

Before changing behavior:
- read the relevant files in `specs/`
- update the spec when the request adds or changes requirements
- keep the implementation aligned with the domain model and the Supabase schema

Always prefer:
- real finance semantics over generic bookkeeping UX
- explicit categories and monthly budget logic over placeholder data
- small, reviewed changes with clear acceptance criteria

Avoid:
- demo data in production flows
- generic payment fields that don't match the card/invoice domain
- broad refactors without a spec update

Project source of truth:
- `specs/01-product-spec.md`
- `supabase/create-tables.sql`
- `app.js`
