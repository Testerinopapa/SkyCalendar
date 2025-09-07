# Sub-Issue: Optimize Solar System Presentation for Minimal Lag

## Objective
Ensure the Three.js solar system background renders smoothly (target ~60 FPS on mid-tier laptops) with minimal CPU/GPU overhead and no noticeable jank while interacting or updating time.

## Metrics & Targets
- FPS: ≥ 55 at 1080p on a 2019+ laptop (integrated GPU).
- Main thread frame budget: ≤ 16ms avg, ≤ 24ms p95.
- Memory: steady-state without growth during idle (no leaks).

## Bottleneck Hypotheses
- Overdraw from bloom and opaque fills (sun, orbits, starfield density).
- Too many draw calls (individual meshes) or high segment counts.
- Per-frame allocations (garbage collection stutter).
- High devicePixelRatio without caps on hi-DPI displays.

## Work Plan
- [ ] Frame profiler: add optional on-screen stats (FPS, ms, MB) behind dev flag.
- [ ] Cap DPR: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` (already) and make it configurable; allow 1.5 on low-end.
- [ ] Starfield tuning: reduce point count adaptively based on viewport and DPR.
- [ ] Orbit geometry: lower segments or use thin `LineSegments` with dashed shader; cache geometries.
- [ ] Materials: prefer `MeshBasicMaterial`; avoid depth writes where possible; batch colors.
- [ ] Postprocessing: reduce bloom strength/threshold or disable on low-power; runtime toggle.
- [ ] Animation loop: remove per-frame object allocations; reuse vectors; clamp time step.
- [ ] Visibility: frustum culling on (default); LOD for labels (when added).
- [ ] Resize cost: debounce resize handler; avoid recalculating heavy geometry.
- [ ] Pause when tab not visible: stop RAF on `visibilitychange`.
- [ ] Memory checks: add teardown audits; ensure all geometries/materials are disposed.

## Acceptance Criteria
- Meets FPS/latency targets in Metrics & Targets on test hardware.
- No GC-induced hitching detected during 30s camera idle and time scrub tests.
- Bloom toggle and DPR limit exposed via env/feature flag and reflected in perf.
- Starfield/orbit density scales down on low-power or small viewports.

## Test Plan
- A/B runs with bloom on/off and DPR 1.0 vs 2.0; record FPS.
- Viewport sizes: 1366×768, 1920×1080, 2560×1440.
- Devices: integrated GPU laptop, mid-tier discrete GPU.
- Scenarios: idle, fast time multiplier, window resize, tab hide/show.

## Implementation Notes
- Keep a `perf` config object; read from `process.env.NEXT_PUBLIC_SOLAR_PERF` and URL query for quick toggles.
- Add lightweight FPS meter only in development.
- Guard starfield/orbit creation with current perf preset; recreate if preset changes.
