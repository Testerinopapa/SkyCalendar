# Issue: Immersive Zoom (Planet Perspective)

“The moment the horizon curves away and the ground gives way to endless stars.”

## Summary
Create an immersive zoom mode that places the camera at a selected planet’s local perspective. The experience should transition smoothly from the solar-system view into a near-surface/near-horizon viewpoint where the planet fills the foreground and the starfield becomes a curved sky above.

## Branch
- feature/immersive-zoom

## Goals
- Smooth transition from system view to planet perspective and back.
- Camera ends at a near-horizon position/orientation around the selected planet.
- Planet occupies foreground with clear curvature; starfield becomes sky.
- Maintain 60 FPS target with graceful degradation on low presets.

## Non-goals (initial)
- High-fidelity planetary terrain/atmosphere rendering.
- Real textures or physically-based sky scattering.
- Accurate surface geodesy or topology.

## User stories
- As a user, I can click a planet and “enter” its perspective with a cinematic zoom.
- As a user, while immersed, I can slightly pan/tilt to admire the curved horizon and stars.
- As a user, I can exit back to the system view without jarring pops or flicker.

## Technical approach (v1)
- Scene model: reuse `SolarSystemBg` but introduce a distinct camera state “immersive”.
- Two-scale strategy:
  - System scale (current): planets small, star shell far.
  - Immersive scale: temporarily scale up the focused planet’s local space or switch to a child group with local units for stability.
- Camera path:
  - Ease camera along a spline from system orbit view to a point slightly above the planet surface (offset along local normal) with a small tilt so the horizon is visible.
  - Lock starfield to camera while immersed; optionally dim stars below the horizon via clip plane.
- Horizon/sky treatment:
  - Use the existing star shell but apply a hemisphere mask aligned to the local “up” to avoid stars below ground.
  - Add a subtle atmospheric rim via a sprite or halo billboard on the planet’s limb (optional in v1).
- Controls:
  - Disable orbit interactions; allow limited look-around (yaw/pitch) and a gentle camera bob.
  - Escape or a UI button exits immersive mode.
- Performance:
  - Keep all meshes instanced; avoid new allocations per frame.
  - Quality preset gates: halo, mask softness, star density.

## Integration points
- Trigger: click on a planet in `SolarSystemBg` (existing focus flow) → enter immersive.
- UI: show an on-screen hint (Exit Immersive) and minimal controls overlay.
- Analytics: log enter/exit events to debug log pipeline.

## Tasks
- [ ] Add immersive camera state and finite-state machine (system ↔ immersive).
- [ ] Compute planet local frame (position, up normal, tangent basis).
- [ ] Implement camera spline/easing from system to near-surface point.
- [ ] Add hemisphere clip/mask for stars below the horizon.
- [ ] Optional: add thin atmospheric rim sprite on limb (preset gated).
- [ ] Add limited look-around controls (small yaw/pitch with damping).
- [ ] Add exit control (Esc and UI button) with reverse transition.
- [ ] Gate features by preset; ensure low preset remains smooth.
- [ ] Telemetry: log immersive enter/exit with planet name and duration.
- [ ] QA across screen sizes; verify no z-fighting or popping.

## Acceptance criteria
- Clicking a planet animates smoothly into a horizon-view near the planet, with the planet visibly curved and stars above only (none below ground).
- Immersive camera allows gentle look-around; Esc or button returns smoothly to system view.
- No visible popping/flickering; FPS within target preset constraints.

## Risks & mitigations
- Depth precision at mixed scales: use local child group for immersive, or temporary scale factor.
- Star clipping artifacts: prefer soft mask via fragment alpha or slight dimming below horizon.
- Motion sickness: keep easing gentle and clamp look-around angles.

## Follow-ups (later)
- Planet textures and day/night shading.
- Atmospheric scattering approximation.
- City lights on night side (Earth only), moon surfaces.

## References
- Three.js camera paths and quaternions.
- Skybox/starfield masking techniques.

