# FatCats MVP v1

**Point. Expose. Fix.** — The first watchdog network for your city.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

Create a `.env.local` file (or copy from `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### 3. Set up Supabase database

1. Go to your Supabase project → **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql`
3. Paste and click **Run**

This creates all tables, indexes, RLS policies, and the storage bucket.

### 4. Import NYC 311 data (optional but recommended)

```bash
npm run import311
```

This fetches ~500 recent NYC 311 service requests (potholes, streetlights, sidewalks, trash) and loads them into the database. They'll appear on the Map and Feed.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|---|---|
| `/` | Splash screen — branded intro with "Start" button |
| `/report/new` | Camera/photo picker → report creation flow |
| `/feed` | Feed of open issues, sorted by watchers. "Near you" section with geolocation. |
| `/map` | Mapbox map with clustered pins, category + status filters |
| `/expose/[id]` | Exposé detail card — shareable, with "I'm watching this" button |
| `/profile` | Anonymous "Founding Watchdog" profile with your exposés |

## Deploy to Vercel

1. Push this repo to GitHub
2. Import it in Vercel (vercel.com/new)
3. Add the 3 environment variables in Vercel → Settings → Environment Variables
4. Deploy

Framework auto-detected as Next.js. No config needed.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **TailwindCSS** (mobile-first)
- **Supabase** (Postgres + Storage)
- **Mapbox GL JS** (map with clustering)
- **FormSubmit** not used here — Supabase handles persistence directly

## Data Model

- `reports` — Unified table for citizen exposés + NYC 311 data
- `users_anonymous` — Device-hash-based anonymous identity
- `report_supports` — "Watching" / supporter tracking
- `report-photos` — Supabase Storage bucket for uploaded images
