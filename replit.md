# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Cleaning company employee app called "CleanTrack".

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Auth**: Clerk (email/password, boss/employee roles stored in publicMetadata)
- **Map**: Leaflet + react-leaflet

## App: CleanTrack

A cleaning company employee app with authentication and two user roles.

### Auth Flow
- Landing page (/) — shows Sign In / Create Account for unauthenticated users
- Sign-up (/sign-up) — custom 2-step: 1) pick role (Boss/Employee), 2) username + email + password
- Sign-in (/sign-in) — Clerk built-in (email/password + Google)
- After sign-up: calls POST /api/users/set-role to store role in Clerk publicMetadata

### Employee View
- Profile: username, "Employee" badge, email, today's assignments with house name, time slot, guest count
- Houses: searchable property grid, click for detail modal with editable notes
- Map: interactive map with house pins

### Boss View  
- Profile: username, "Boss" badge, full employee list, click employee to assign houses for the day (house, date, time slot, guest count)
- Also sees all today's assignments in a dashboard
- Houses: same as employee + editable notes
- Map: same as employee

## Important Clerk Note

`@clerk/react` v6 changed `useSignUp()` to a signals-based API by default (`{ signUp, errors, fetchStatus }`). This breaks the traditional `signUp.create()` → `result.status` pattern. The sign-up page uses:
```ts
import { useSignUp } from "@clerk/react/legacy"; // traditional API with { isLoaded, signUp, setActive }
```
Always import from `@clerk/react/legacy` for sign-up/sign-in custom flows that use the `.create()` / `.attempt*()` patterns.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `houses` — all company properties with coordinates
- `assignments` — cleaning jobs: houseId, assignedToClerkId, date, timeSlot, guestCount, status, priority, notes
- (No profile table — user data stored in Clerk)

## API Routes

- `GET /api/users` — list all users (boss only)
- `GET /api/users/me` — current user info from Clerk
- `POST /api/users/set-role` — set role (boss/employee) on first sign-up
- `GET/POST /api/assignments` — assignments (employees see only theirs)
- `GET /api/assignments/today` — today's assignments
- `PUT/DELETE /api/assignments/:id` — update/delete
- `GET /api/houses/stats` — stats summary
- `GET/POST /api/houses` — all houses
- `GET/PUT/DELETE /api/houses/:id` — single house
- `PATCH /api/houses/:id/notes` — update notes (anyone can edit)
