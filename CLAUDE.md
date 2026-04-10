# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Next.js production build (also runs ESLint + TypeScript checks)
npm run dev            # Dev server on localhost:3000
npm run lint           # ESLint only
npm test               # Jest (tests live in lib/__tests__/)
npx jest --testPathPattern pricing   # Run a single test file
```

Jest is configured with `ts-jest`, roots restricted to `lib/`, and `@/*` path alias mapped to the repo root.

## Architecture

Single-tenant campground management app — Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (Postgres + Auth).

### Route Groups

- `app/(public)/*` — Guest-facing: browse sites, book, confirmation, login
- `app/(admin)/*` — Owner-facing: dashboard, bookings, map, settings. Protected by `middleware.ts` which checks Supabase session and redirects to `/login`.

### Server → Client Data Flow

Server components fetch data using `createServiceRoleClient()` (bypasses RLS), then pass it as props to `'use client'` shell components that handle interactivity. Client shells call API routes for mutations and invoke `router.refresh()` to re-render server data. Examples: `DashboardShell`, `BookingsShell`, `AdminMapClient`, `BrowseClient`.

### Supabase Client Split

Two files to prevent bundling `next/headers` into client components:
- **`lib/supabase.ts`** — `createBrowserSupabaseClient()` (client components, anon key) and `createServiceRoleClient()` (server-only, full access). Safe to import from `'use client'` files.
- **`lib/supabase.server.ts`** — `createServerSupabaseClient()` (cookie-based, uses `next/headers`). Only import from server components and API route handlers.

The middleware creates its own Supabase client inline (it runs in Edge and can't use `next/headers` from `cookies()`).

### Pricing Engine (`lib/pricing.ts`)

Multiplicative rule application: each matching `PricingRule` from `lib/pricing.config.ts` multiplies the rate (sorted by priority). Result is clamped to `[floor_rate, ceiling_rate]`. Triggers: `weekend`, `peak_season`, `gap_lte_3_nights` (1-3 night gaps), `gap_lte_6_nights` (4-6 nights, exclusive of trigger above), `last_minute_lte_5_days`. Gap detection uses `findGapNights()` which scans approved/pending bookings around a date.

### Site Optimizer (`lib/optimizer.ts`)

`scoreSites()` returns `ScoredSite[]` (extends `Site` with `urgency_score`, `dynamic_rate`, `badge`). Urgency = `1 - totalGap/56` where totalGap includes the stay itself. Sites with `urgency > 0.6` and `dynamic_rate <= median` get a `best_value` badge. Sorted by urgency desc, rate asc.

### Database

Schema in `supabase/migrations/001_initial_schema.sql`. Tables: zones, sites, site_tags, seasons, guests, bookings. RLS: anon can SELECT active sites/zones/seasons and INSERT guests/bookings (status forced to 'pending'); authenticated has full access.

### Dynamic Rendering

Pages that query Supabase at request time need `export const dynamic = 'force-dynamic'` to prevent Next.js from attempting static generation at build time (which fails without DB access).

## Environment Variables

Required in `.env.local` and Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, baked into client bundle at build
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never exposed to client
- `NEXT_PUBLIC_CAMPGROUND_NAME` / `NEXT_PUBLIC_CAMPGROUND_PHONE` — display strings

## Key Conventions

- `@/*` path alias maps to repo root (e.g. `@/lib/types`, `@/components/admin/BookingQueue`)
- All TypeScript interfaces for DB rows live in `lib/types.ts`
- SVG map uses normalized coordinates: `svg_x`/`svg_y` are 0-1 floats, scaled to 800x600 canvas
- Booking status flow: `pending` → `approved` | `declined` | `cancelled`
- Admin actions go through `PATCH /api/admin/bookings/[id]` with body `{ action, new_site_id? }`
