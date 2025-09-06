# SkyCalendar – Cosmic Events Explorer

A Next.js app that visualizes upcoming space events with an animated background, interactive event nodes, and a live countdown. Backed by Prisma (SQLite in dev), with API routes for events, next event, SSE heartbeat, and web push subscription storage (UI only for now).

## Current capabilities
- **Full visuals**: Vanta NET background (WebGL/Three.js), event nodes with type-based colors, hover tooltips, and a bottom countdown panel.
- **Dynamic data**: UI fetches from API routes and renders seeded future events.
- **Countdown**: Calculated to the next upcoming event (`startAt`).
- **APIs** (App Router):
  - `GET /api/events?from&to&type`
  - `GET /api/events/next`
  - `GET /api/stream` (SSE ping; marked dynamic)
  - `POST /api/subscriptions` (stores Web Push subscription payload)
- **Database**: Prisma schema with `Event`, `Source`, `User`, `Subscription`, `Notification`. SQLite in dev; seed script inserts future events.

## Project structure
- `web/` — Next.js app (App Router)
  - `src/app/page.tsx` — header, map, countdown panel
  - `src/components/VantaBg.tsx` — Vanta background
  - `src/components/CosmicMap.tsx` — event nodes + tooltips
  - `src/app/api/*` — events, next, stream, subscriptions
  - `prisma/schema.prisma` — data models
  - `prisma/seed.js` — seeds future events
  - `VISUALS.md` — visuals physics, coordinates, and data flow

## Getting started (dev)
```bash
cd web
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
App: http://localhost:3000

## Build & run
```bash
cd web
npm run build
npm start
```

## Environment
- Dev uses SQLite with `DATABASE_URL="file:./dev.db"` in `web/.env`.
- Switch to Postgres for prod by updating `prisma/schema.prisma` and `.env`.

## Notes on visuals
- Event coordinates are center-relative pixel offsets: `(0,0)` is screen center.
- Colors by type: moon (blue), meteor (yellow), eclipse (orange), launch (red).
- See `web/VISUALS.md` for details.

## Roadmap (next steps)
- Web Push: Service Worker registration, permission flow, and sending test notifications.
- Reminders pipeline: Redis + BullMQ jobs scheduled relative to `startAt`.
- Data ingestion: adapters (Launch Library 2, SpaceX, etc.) with normalization and idempotency.
- Realtime: consume SSE on client to auto-refresh events.
- Accessibility: keyboard-triggered tooltips and ARIA roles.

## License
TBD
