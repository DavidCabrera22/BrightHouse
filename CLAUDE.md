contu# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrightHouse is a full-stack CRM SaaS for real estate management. It uses a NestJS backend and a React + Vite frontend, connected via REST API.

## Development Commands

### Backend (NestJS — `cd backend`)
```bash
npm run start:dev      # Start with hot-reload (port 3000)
npm run build          # Compile TypeScript to dist/
npm run lint           # ESLint with auto-fix
npm run test           # Run Jest unit tests
npm run test:watch     # Tests in watch mode
npm run test:cov       # Coverage report
npm run test:e2e       # End-to-end tests
npm run seed           # Seed the database
```

### Frontend (React + Vite — `cd frontend`)
```bash
npm run dev            # Start Vite dev server (port 5173)
npm run build          # TypeScript check + production build
npm run lint           # ESLint check
npm run preview        # Preview production build
```

## Architecture

### Backend (NestJS)

- **Global prefix**: all routes under `/api`
- **Swagger docs**: available at `/api/docs` in development
- **Static uploads**: only `/uploads/projects` (marketing images) is served statically. `uploads/documents` holds customer contracts and is served exclusively by `GET /api/documents/:id/file`, which checks the caller's tenant — `express.static` bypasses guards, so never mount it.
- **Auth**: JWT tokens issued at `POST /api/auth/login`. Token payload includes `{email, sub, role, project_id, tenant_id}`. Protected routes use `JwtAuthGuard` + `RolesGuard` with `@Roles('Admin' | 'Agent' | 'SuperAdmin')` decorator.
- **Database**: TypeORM with PostgreSQL on Supabase. All entities use UUID PKs and `createDate`/`updatedDate` timestamps.
- **Schema changes**: `synchronize` is OFF unless `DB_SYNCHRONIZE=true`. The schema evolves through migrations:
  `npm run migration:generate -- src/migrations/DescribeTheChange`, then `npm run migration:run`
  (`migration:show` lists state, `migration:revert` undoes the last one).
  `backend/.env` points at the **same Supabase database as production**, so never enable
  `DB_SYNCHRONIZE` there — a local entity edit would rewrite the production schema on boot.
- **Validation**: Global `ValidationPipe` with `whitelist: true` and `transform: true`.

**Module inventory** (`backend/src/app.module.ts`): Auth, Users, Roles, Projects, Units, UnitStatuses, UnitStatusHistory, Clients, Sales, Commissions, Documents, DigitalSignatures, Leads, Campaigns, AuditLogs.

### Frontend (React + Vite)

- **Routing** (`App.tsx`): Public routes (`/`, `/login`, `/proyectos`, etc.) and CRM protected routes under `/crm/*` wrapped in `<ProtectedRoute>`.
- **Auth**: Token stored in `localStorage` as `access_token`; role as `user_role`. `ProtectedRoute` checks token presence. All API calls include `Authorization: Bearer {token}` header.
- **API base**: `http://localhost:3000/api` (hardcoded for local dev).
- **Styling**: Tailwind CSS v4 with custom theme colors (`crm-primary`, `crm-dark`, `crm-green`, `crm-bg-light`, `crm-bg-dark`) and dark mode via the `class` strategy. Fonts: Manrope, Inter.

### Environment

Backend config is in `backend/.env`:
- `PORT`, `DB_HOST/PORT/USERNAME/PASSWORD/DATABASE`, `DB_SSL=true`
- `JWT_SECRET`, `JWT_EXPIRATION`

## Tenant isolation (required for any new tenant-owned data)

Isolation is enforced in one place: `backend/src/common/tenant/`. `TenantModule`
is global, so `TenantScopeService` can be injected anywhere without an import.

Rules when touching a module that stores customer data:

1. **Controllers** take the caller's tenant with `@CurrentTenant() tenant: TenantContext`
   and pass it down. Do not read `req.user.tenant_id` directly.
2. **Services** build reads with `tenantScope.scoped(Entity, 'alias', ctx)` — never
   the bare repository. `findOne`/`update`/`remove` must be scoped too, not just
   `findAll`: an unscoped `findOne(id)` is an IDOR, since the UUID is the only
   thing separating tenants.
3. **Writes** that carry a client-supplied foreign key must validate it with
   `assertProjectInTenant(project_id, ctx)` or `assertReference(Entity, id, ctx)`,
   otherwise a row can be written into another tenant.
4. **New entities** must be registered in `tenant-paths.ts` with the relation
   chain that reaches `tenant_id`. `getTenantPath` throws for unregistered
   entities, and `tenant-scope.spec.ts` fails if one is missed.

Only `projects`, `users` and `conversations` have a `tenant_id` column; every
other table reaches one through relations. `roles`, `unit_statuses` and
`tenants` are global — their writes are SuperAdmin-only.

A non-SuperAdmin whose `tenant_id` is NULL is **denied**, not treated as global.
Run `npm run backfill:tenants` (dry run; `-- --apply` to write) to assign a
tenant to rows created before multi-tenancy existed.

Methods named `*ForTenant` are the request-facing wrappers; the bare versions
they wrap are system-level and intentionally unscoped, called by the WhatsApp
and Instagram webhooks after they resolve the tenant from the payload.
