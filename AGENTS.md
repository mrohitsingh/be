# Edvnt Engineering Agent Contract

## Authority and uncertainty
- Treat `docs/` architecture/product documents as the source of truth when present. The supplied planning set defines Edvnt as a multi-tenant School Management SaaS, with separate `edvnt-web` and `edvnt-api` repositories.
- Before coding, inspect the actual repository, relevant implementation, tests, package scripts, migrations, and docs. Do not assume a documented design is already implemented.
- Never invent APIs, fields, routes, package scripts, environment variables, schema objects, or behavior. Verify them in the repository or official documentation for the installed version. If still unknown, ask one focused question or state the assumption and stop before risky changes.
- The supplied README says no implementation before the explicit phrase `Start implementation`. This is a planning-document gate: do not create implementation code unless the user explicitly authorizes implementation. If the user directly requests a code change, that request is explicit authorization for that change; do not interpret it as permission for unrelated work.
- If project documents conflict or leave a decision open, do not silently reconcile it. Identify the conflict and request a decision when it affects implementation.

## Minimal-diff contract
- Make only changes required by the explicit task. No opportunistic refactors, redesigns, renames, dependency upgrades, formatting sweeps, file moves, architecture rewrites, or unrelated bug fixes.
- Preserve existing behavior and public contracts unless the task explicitly changes them. Prefer the smallest local patch.
- Before editing, inspect `git status` and the relevant code. Never overwrite or revert pre-existing user changes. Do not use destructive git commands.
- Do not create files merely because the architecture document lists them. Match the repository's actual conventions.
- Do not install dependencies or change lockfiles unless necessary and authorized. Do not change `.env*`, secrets, CI/CD, deployment, permissions, database schema, or migrations without explicit need and review.
- If the request expands during work, stop and confirm scope before implementing the expansion.

## Edvnt invariants (non-negotiable)
- One school is one tenant in the MVP.
- `tenant_id` on tenant-owned records is immutable. Never update it as a routine edit or transfer shortcut.
- Every tenant-owned read/write/delete/count/export/background job must be scoped to the authenticated tenant. Permission checks do not replace tenant filters.
- Keep platform scope (Super Admin) separate from school/tenant scope. Super Admin is not a School Admin by default and must not silently inherit school operational access.
- Authorization must consider authenticated user/session, tenant context, permission, resource ownership/assignment, and tenant-scoped data access. Role-name checks alone are insufficient.
- Reject cross-tenant relationships, IDs, joins, and nested writes. Never trust a client-supplied tenant ID as the authority for tenant scope.
- Invitation tokens and refresh tokens must not be stored in plaintext; invitation acceptance must be single-use, expiry-aware, tenant/role-bound, and concurrency-safe.
- Passwords must be stored only as secure hashes. Never log credentials, tokens, secrets, or unnecessary sensitive payloads.
- Preserve historical academic records across academic-year/class transitions; use enrollment/history semantics rather than overwriting history.
- Numeric lookup IDs are the documented convention for status (`status_id`), not string status columns or PostgreSQL enums where this convention applies. Core/public IDs are documented as database-generated `Int` and not reused.
- MVP is a modular monolith; do not introduce microservices, Kubernetes, Redis, GraphQL, or event-driven infrastructure without explicit approval and a measured requirement.
- No public registration. Onboarding is invitation-based.
- Out of MVP unless explicitly approved: fees, payroll, transport, library, hostel, automated timetable optimization, mobile app, WhatsApp/SMS, AI insights, SSO, MFA, and custom roles.

## Change protocol
1. Restate the requested outcome and explicit boundaries briefly.
2. Inspect current implementation and relevant tests/docs; identify the smallest affected surface.
3. State a short plan. If a critical product/security decision is unresolved, ask before coding.
4. Implement only the approved scope.
5. Add/update tests for the changed behavior and important regressions.
6. Run targeted checks first, then relevant lint/typecheck/build/tests available in the repo. Do not claim checks passed unless they ran and passed.
7. Review the diff for unrelated changes, contract drift, tenant-scope gaps, secrets, and destructive operations.
8. Report files changed, behavior changed, checks run/results, and anything not verified.

## Completion standard
- Explain what changed and what did not change.
- If tests cannot be run, state why and give the exact commands that should be run.
- Never say “no regressions” as a guarantee. Say which regression checks were performed and their results.
