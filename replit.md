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

A multi-tenant cleaning company app with authentication, two user roles (boss/employee), and complete company-scoped data isolation.

### Multi-Tenancy Architecture
- Each company is stored in the `companies` table with a unique 8-char invite code (`XXXX-XXXX` format)
- `companyId` is stored in Clerk `publicMetadata` alongside `role` — no separate users table in DB
- `housesTable` and `assignmentsTable` both have a nullable `companyId` FK → `companiesTable.id`
- All API queries filter by the user's `companyId` via `requireAuthAndCompany` middleware
- Boss: creates a company, gets an invite code to share
- Employee: enters the invite code to join
- `GET /api/users` filters Clerk users by matching `companyId` (max 500 users fetched)

### Auth + Setup Flow
1. Landing page `/` — Sign In / Create Account (unauthenticated)
2. Sign-up `/sign-up` — pick role → enter details → verify email → `POST /api/users/set-role`
3. Setup company `/setup-company`:
   - **Boss**: enter company name → create → get invite code → `POST /api/companies`
   - **Employee**: enter invite code → join → `POST /api/companies/join`
4. After setup: `user.reload()` refreshes Clerk session with `companyId` → redirect to `/profile`
5. `CompanyGuard` in `App.tsx` checks `user.publicMetadata.companyId` client-side; redirects to `/setup-company` if missing

### Employee View
- Profile: username, "Employee" badge, email, today's assignments with house name, time slot, guest count
- Houses: searchable property grid, click for detail modal with editable notes

### Boss View
- Profile: username + pencil icon (inline edit), "Boss" badge, **company name + invite code card** (copy + settings buttons), **live Team Status** (who is clocked in now, refreshes every 60s), today's summary with per-employee progress, quick stats, schedule CTA
- Houses: same as employee + editable notes

### Company Settings (Boss only)
- Settings gear icon on the company card opens a modal
- Rename company (`PUT /api/companies/me`)
- Regenerate invite code with 2-step confirmation (`POST /api/companies/me/regenerate-invite`)

### Username Change (all users)
- Pencil icon next to display name in profile header
- Opens a dialog to update `unsafeMetadata.displayName` via `PATCH /api/users/me`

### Live Team Status (Boss)
- `GET /api/work-sessions/live` returns today's clock-in records for the company
- Shows green "active" rows for currently clocked-in employees, gray rows for those who clocked out
- Auto-refreshes every 60 seconds

### Offline Cache
- `@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister` installed
- localStorage persister configured in `queryClient.ts` with 24h TTL (`gcTime` + `maxAge`)
- React Query data survives page reloads and brief offline periods

## Important Clerk Note

`@clerk/react` v6 changed `useSignUp()` to a signals-based API by default. This breaks the traditional `signUp.create()` → `result.status` pattern. The sign-up page uses:
```ts
import { useSignUp } from "@clerk/react/legacy"; // traditional API with { isLoaded, signUp, setActive }
```
Always import from `@clerk/react/legacy` for sign-up/sign-in custom flows that use the `.create()` / `.attempt*()` patterns.

`useUser`, `useClerk`, `ClerkProvider`, `SignIn`, `Show` all import from `@clerk/react` (non-legacy) without issue.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from `lib/api-spec/openapi.yaml`
- `pnpm --filter @workspace/db run push-force` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `companies` — `id, name, inviteCode (unique), createdAt`
- `houses` — all company properties; has `companyId` FK
- `assignments` — cleaning jobs: houseId, assignedToClerkId, date, timeSlot, guestCount, status, priority, notes, issuePhotoCount; has `companyId` FK
- `assignment_issue_photos` — per-assignment issue photos: assignmentId, companyId, uploadedByClerkId, objectPath (GCS), description, uploadedAt, expiresAt (60 days)
- (No profile table — user data stored in Clerk; companyId stored in Clerk publicMetadata)

## API Routes

- `GET /api/users` — list users in caller's company (boss only, filters by companyId)
- `GET /api/users/me` — current user info (includes companyId)
- `POST /api/users/set-role` — set role on first sign-up (stored in Clerk publicMetadata)
- `POST /api/companies` — create company (boss), stores companyId in Clerk metadata
- `GET /api/companies/me` — get caller's company info
- `POST /api/companies/join` — join company by invite code (employee)
- `GET/POST /api/assignments` — company-scoped (employees see only theirs)
- `GET /api/assignments/today` — today's company-scoped assignments
- `PUT/DELETE /api/assignments/:id` — update/delete (company-scoped)
- `PATCH /api/assignments/:id/timing` — update start/finish timestamps
- `POST /api/assignments/:id/start` — mark in-progress
- `POST /api/assignments/:id/finish` — mark complete
- `GET/POST /api/assignments/:id/issue-photos` — list/add issue photos for an assignment
- `DELETE /api/assignments/:id/issue-photos/:photoId` — delete a specific issue photo
- `POST /api/storage/uploads/request-url` — get a presigned GCS URL for direct browser upload (auth required)
- `GET /api/storage/objects/*path` — serve private GCS objects (auth required)
- `GET /api/houses/stats` — company-scoped stats summary
- `GET/POST /api/houses` — company-scoped houses
- `GET/PUT/DELETE /api/houses/:id` — single house (company-scoped)
- `PATCH /api/houses/:id/notes` — update notes
