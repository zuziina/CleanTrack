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
- **Map**: Leaflet + react-leaflet

## App: CleanTrack

A cleaning company employee app with three main sections:
1. **Profile** (`/profile`) — Employee personal info + today's job assignments from the boss
2. **Houses** (`/houses`) — All company properties with details, search, and filter
3. **Map** (`/map`) — Interactive map showing all house locations with clickable pins

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `profile` table — single row for the current user's profile info
- `houses` table — all company properties with coordinates for map
- `assignments` table — cleaning job assignments tied to houses

## API Routes

- `GET/PUT /api/profile` — user profile
- `GET /api/assignments` — all assignments
- `GET /api/assignments/today` — today's assignments
- `POST/PUT/DELETE /api/assignments/:id` — CRUD for assignments
- `GET /api/houses/stats` — house statistics summary
- `GET /api/houses` — all houses
- `POST/PUT/DELETE /api/houses/:id` — CRUD for houses

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
