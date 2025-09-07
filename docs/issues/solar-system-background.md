# Issue: Transform Animated Background into a Solar System Simulation

## Summary
Replace the current Vanta NET background with a real-time, interactive solar system scene that visualizes planetary orbits and positions, and ties UI events to celestial context.

## Goals
- Physically-plausible orbits for Sun and major planets (low-precision ephemerides OK initially).
- Interactive scene: pan/zoom, time controls (now, +/-), and object focus.
- Event context: highlight relevant objects during an event (e.g., lunar eclipse).
- Performance: smooth 60 FPS on typical laptops; responsive across devices.

## Non-goals (initial phase)
- High-precision ephemerides (to-the-arcsecond accuracy).
- N-body simulation with gravitational integration.
- Full stellar background or deep sky catalogs.

## User stories
- As a user, I can see the solar system and scrub time to watch orbits evolve.
- As a user, I can click a planet to focus and see basic info (distance from Sun, next oppositions/conjunctions).
- As a user, when viewing an event, I can see relevant bodies highlighted and understand geometry.

## Technical approach (v1)
- Renderer: Three.js in a custom background layer (replaces `VantaBg`).
- Coordinate frame: Heliocentric ecliptic J2000 (simplified), units in AU, scaled to pixels.
- Orbit model: Keplerian elements with low-precision series (VSOP87-Lite / approximate elements) evaluated per frame time.
- Time system: app time `t` derived from real time with a multiplier; pause/play + scrub bar.
- Scaling: non-linear screen scale for distances; visual radii are billboarded sprites (not to scale).
- Camera: orthographic top-down (ecliptic plane) with optional tilt; mouse wheel zoom + drag pan.
- UI: overlay controls (time, focus selector), object labels with occlusion fade.
- Event overlay: when the app knows an event, highlight bodies involved and draw helper lines (e.g., Sun–Earth–Moon alignment for eclipses).
- Performance: requestAnimationFrame loop, instance buffers for orbits, LOD for labels, pause rendering when tab hidden.

## Data sources
- VSOP87 (lite) or precomputed low-precision orbital elements for Sun-relative positions.
- NASA/JPL Horizons (optional future, server-side fetch/cache).
- For moons (later), simplified circular/elliptical approximations (e.g., Moon via ELP2000/82B lite).

## Tasks
- [ ] Create `SolarSystemBg` component to replace `VantaBg` (feature flag to toggle).
- [ ] Add Three.js scene/camera/renderer lifecycle with resize handling.
- [ ] Implement time controller (play/pause, speed, scrub) and context provider.
- [ ] Add ephemeris module returning ecliptic positions for planets at time `t`.
- [ ] Render orbits (line instancing) and planet sprites with type-based colors.
- [ ] Interaction: hover/click, focus target, labels, and info panel.
- [ ] Event integration: map UI events to relevant bodies; highlight and draw alignment helpers.
- [ ] Performance pass: frustum culling, LOD labels, reduce allocations in frame loop.
- [ ] Accessibility: keyboard navigation for focus selection, high-contrast mode.
- [ ] QA: cross-device testing; ensure 60 FPS on mid-tier laptops; fallback to static starfield if WebGL fails.

## Acceptance criteria
- Solar system renders Sun + 8 planets with visible orbits.
- Time controls work (0.25x–32x), and positions update when scrubbing.
- Click/keyboard navigation focuses a planet; label and basic stats shown.
- Event overlay: at least one event type visualized (e.g., Earth–Moon–Sun alignment demo).
- No significant main-thread jank; FPS >= ~55 on a 2019+ laptop at 1080p.
- Fallback path shows the existing visuals if WebGL/Three.js initialization fails.

## Risks & mitigations
- Ephemeris accuracy: use low-precision series first; validate visually; add server-side Horizons cache later.
- Performance on low-end devices: provide quality presets and reduce orbit segments dynamically.
- Complexity creep: phase scope; keep moons/stars for later milestones.

## Milestones
- M1: Scene + orbits + time (2–3 days)
- M2: Interaction + labels + focus (2 days)
- M3: Event overlay + perf pass (2–3 days)
- M4: QA + fallback + docs (1–2 days)

## References
- VSOP87 (lite): `https://neoprogrammics.com/vsop87-multilang/`
- JPL Horizons: `https://ssd.jpl.nasa.gov/horizons/`
- Three.js: `https://threejs.org/`

## Implementation notes
- Keep a runtime flag to switch between `VantaBg` and `SolarSystemBg` during rollout.
- Isolate math in a pure module for unit testing; avoid allocating in the frame loop.
