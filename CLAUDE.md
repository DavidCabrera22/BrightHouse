# CLAUDE.md

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
- **Static uploads**: served at `/uploads`
- **Auth**: JWT tokens issued at `POST /api/auth/login`. Token payload includes `{email, sub, role, project_id}`. Protected routes use `JwtAuthGuard` + `RolesGuard` with `@Roles('Admin' | 'Agent')` decorator.
- **Database**: TypeORM with PostgreSQL on Supabase (`synchronize: true` — schema auto-syncs on startup). All entities use UUID PKs and `createDate`/`updatedDate` timestamps.
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
