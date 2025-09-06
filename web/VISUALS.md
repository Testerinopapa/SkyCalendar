# Visual System: Physics, Coordinates, and Data Flow

This document explains how the animated background and event points work today, including the coordinate system, visual behavior, and how UI is wired to backend data.

## 1) Background "physics" (Vanta NET)
We use Vanta NET for the animated background (`src/components/VantaBg.tsx`). It renders a dynamic network of points connected by lines on a WebGL canvas (via Three.js). The key parameters:

- `points`: approximate number of points rendered across the screen
- `maxDistance`: the maximum line connection distance between points
- `spacing`: effective grid spacing that distributes points
- `mouseControls` / `touchControls`: whether the network reacts to user input
- `color` and `backgroundColor`: line/point color and background color

Conceptually, points are distributed over a grid with jitter; edges are drawn if two points are within `maxDistance`. Mouse/touch input biases point positions to create the “attraction” effect.

Snippet:
```ts
// src/components/VantaBg.tsx
NET({
  el: ref.current,
  THREE,
  mouseControls: true,
  touchControls: true,
  color: 0x3b82f6,
  backgroundColor: 0x020617,
  points: 12.0,
  maxDistance: 22.0,
  spacing: 18.0,
})
```

Lifecycle: we create the instance on mount and destroy it on unmount to avoid leaks.

## 2) Event points: coordinate system and visuals
Event nodes are ordinary DOM elements positioned absolutely within a full-screen container (`CosmicMap`). Each event has optional `positionX` and `positionY` integer offsets. The system converts these offsets into pixel positions relative to the center of the container:

- Let `centerX = container.width / 2`, `centerY = container.height / 2`.
- Node pixel position: `left = centerX + positionX`, `top = centerY + positionY`.

Thus, `(0, 0)` is the center of the screen. Positive X moves right; positive Y moves down.

Snippet:
```ts
// src/components/CosmicMap.tsx (simplified)
const rect = el.getBoundingClientRect()
const centerX = rect.width / 2
const centerY = rect.height / 2
const left = centerX + (event.positionX ?? 0)
const top = centerY + (event.positionY ?? 0)
```

### Styling and interactivity
- **Color encodes type**: moon → blue, meteor → yellow, eclipse → orange, launch → red.
- **Hover effects**: `.event-node:hover` scales up and applies a colored glow via `filter: drop-shadow`.
- **Tooltips**: positioned right of the node; currently toggled by hover. Extend to focus/blur for accessibility.
- **Pulse animation**: available to call attention to countdown or key nodes.

CSS utilities live in `src/app/globals.css`.

## 3) Time and countdown logic
The "Upcoming Event" panel computes a live countdown to the next event’s `startAt`:

- Fetch next event via `GET /api/events/next`.
- Compute remaining time in days/hours/minutes; clamp to zero when passed.
- Update on render (can move to a timer if you want per-minute updates).

Snippet:
```ts
// src/app/page.tsx (simplified)
const target = new Date(nextEvent.startAt).getTime()
const diff = Math.max(0, target - Date.now())
const days = Math.floor(diff / 86400000)
const hours = Math.floor((diff % 86400000) / 3600000)
const minutes = Math.floor((diff % 3600000) / 60000)
```

## 4) Data flow and APIs
The UI fetches data from App Router API endpoints:

- `GET /api/events` — list events (filterable by `from`, `to`, `type`).
- `GET /api/events/next` — the next upcoming event by `startAt`.
- `GET /api/stream` — Server-Sent Events (SSE) heartbeat for future realtime updates.
- `POST /api/subscriptions` — accept Web Push subscription payloads (for reminders).

Prisma models (`prisma/schema.prisma`) define `Event`, `Source`, `User`, `Subscription`, `Notification`. The seed script inserts future-dated events for the visuals.

## 5) Current limitations and planned enhancements
- **Resize handling**: node positions are computed once; add a `ResizeObserver` to recalc on viewport changes.
- **Accessibility**: add keyboard-triggered tooltips with ARIA roles; current hover-only is not keyboard-friendly.
- **Real projections**: today’s `positionX/Y` are arbitrary offsets. We can project to world or sky coordinates later.
- **Realtime**: the SSE endpoint is a heartbeat; subscribe in the client to auto-refresh events.
- **Reminders**: “Set Reminder” needs a Service Worker and push subscription flow.

## 6) Key files
- `src/components/VantaBg.tsx` — Vanta NET background.
- `src/components/CosmicMap.tsx` — event node layout and tooltips.
- `src/app/page.tsx` — header, map, countdown panel.
- `src/app/api/*` — events, next, stream, subscriptions.
- `src/app/globals.css` — custom CSS for nodes, tooltips, and animations.
