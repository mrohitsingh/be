# Edvnt — Architecture & Engineering Documentation

## Document Set

This directory contains the planning and architecture documentation for **Edvnt**, a B2B SaaS multi-tenant School Management System.

### Documents

1. `[01-phase-1-requirements.md](./docs/01-phase-1-requirements.md)` — Requirements discovery and product requirements
2. `[02-phase-2-scope.md](./docs/02-phase-2-scope.md)` — MVP scope and boundaries
3. `[03-phase-3-architecture.md](./docs/03-phase-3-architecture.md)` — System architecture and architectural decisions
4. `[04-phase-4-technology-decisions.md](./docs/04-phase-4-technology-decisions.md)` — Technology stack and engineering decisions
5. `[05-phase-5-database-design.md](./docs/05-phase-5-database-design.md)` — PostgreSQL/Prisma database architecture
6. `[06-phase-6-api-design.md](./docs/06-phase-6-api-design.md)` — REST API architecture and endpoint conventions
7. `[07-phase-7-security.md](./docs/07-phase-7-security.md)` — Authentication, authorization, tenant isolation and security
8. `[08-phase-8-scalability.md](./docs/08-phase-8-scalability.md)` — Performance, scaling and reliability strategy
9. `[09-phase-9-repository-structure.md](./docs/09-phase-9-repository-structure.md)` — Separate frontend/backend repository structure
10. `[10-phase-10-development-roadmap.md](./docs/10-phase-10-development-roadmap.md)` — Delivery roadmap and definition of done
11. `[11-phase-11-risk-assessment.md](./docs/11-phase-11-risk-assessment.md)` — Risk matrix, mitigations and contingency planning



## Implementation Rule

These documents are planning artifacts. **No implementation code should be written until the explicit instruction** `Start implementation` **is given.**

## Core Product

Edvnt is a multi-tenant SaaS platform where each school is a tenant.

Initial roles:

- Super Admin
- School Admin
- Teacher
- Student
- Parent

Initial authentication:

- Invite-only
- Email + password
- JWT access token
- Refresh token rotation
- Session table
- Password reset
- Logout and logout-all-devices

Core technical stack:

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: NestJS 12, TypeScript, Express
- ORM: Prisma 7
- Database: PostgreSQL
- Hosting: Vercel + Railway/Render initially
- Storage: S3-compatible object storage
- Email: Resend
- API: REST `/api/v1`

