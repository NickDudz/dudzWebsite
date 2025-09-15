## 🎉 UPDATE: Issues Resolved (2025-01-15)

**All major issues described below have been FIXED**. The game is now stable and production-ready.

Key fixes implemented:
- ✅ Array overflow crashes fixed with bounds checking
- ✅ 1000 core limit prevents exponential performance issues
- ✅ Data tracking system improved (manual clicks + auto-collect)
- ✅ Galaxy HUD polished with blue-purple gradient design
- ✅ Buy quantity system enhanced (1x, 5x, 20x)
- ✅ Close button behavior fixed to fully close HUD
- ✅ Dropdown/sidebar layout improvements

See [CLAUDE.md](./CLAUDE.md) for current technical documentation.

---

## Original Handoff (Historical Context)

Handoff Prompt for Next Developer: Portfolio Clicker Game Stabilization
You're inheriting a Next.js 15 (TypeScript, App Router) portfolio with an ML-themed clicker mini-game rendered in the background. ~~The game currently suffers from severe performance degradation and intermittent breakage~~. *(FIXED)*
Branch: feature/clicker-game-rework
Framework: Next.js 15.5.x, TS strict
Runtime target: modern desktop + mobile Safari/Chrome
Read These Docs First
README.md (project overview, run commands)
REWORK_PLAN.md (intended re-architecture and goals)
PERF.md (performance considerations and prior tuning)
BALANCING.md (game balance constants and assumptions)
HANDOFF_SUMMARY.md (previous context and cross-component interactions)
CLAUDE.md (older guidance likely stale—validate against current code)

UI Overview — GalaxyUI Revamp
- HUD is now opened via a top-right "Data HUD" dropdown trigger.
- The dropdown can expand into a full right sidebar. Sidebar uses sticky header and scrollable body.
- Sticky header shows: title, Tokens, IQ, Cores (L1–L5 and Total), Total Collected, and Currently Processing.
- Galaxy On/Off control was removed from the HUD. The only galaxy toggle lives in the Settings dropdown.
- Layout avoids overlap: when sidebar is open, the top bar gains right padding to clear the sidebar.
Core Files To Audit
Page/UI
app/page.tsx (starfield + HUD + toggles + game mounting)
components/GalaxyUI.tsx (HUD as dropdown + expandable sidebar; sticky header; no Galaxy toggle)
components/ClusteringGalaxyCanvas.tsx (game canvas mounting and events)
components/ErrorBoundary.tsx
Game/Engine Layer
hooks/useClusteringGalaxy.ts (monolithic hook with sim/render snapshot; recent stabilizations)
engine/ClusteringGalaxyEngine.ts (WIP engine separation; not fully wired)
hooks/useRendering.ts, hooks/usePerformanceMonitoring.ts, hooks/usePersistence.ts
constants/gameConstants.ts, types/gameTypes.ts
Misc
dev.err (build/runtime parse errors history)
tests/ (basic tests)
Current State (Observed)
Starfield is DOM-based with many animated spans → pegging main thread; page becomes unresponsive.
Game loop mounted (ClusteringGalaxyCanvas), but gameplay feels inconsistent and visually unclear; user reports “files not floating.”
FPS switcher added in HUD (Settings), default 30 FPS applied to game and parallax smoothing; visibility pause added; low-quality mode toggles reduced draw (web lines) only.
localStorage read/write sanitized; API object stabilized; render path wrapped in try/catch.
Primary Problems
Starfield Performance Bottleneck
DOM starfield (motion.span elements) + continuous parallax + swirl is extremely expensive.
Frame budget blown even at 30 FPS; long tasks block input.
Canvas Migration Gotchas
- Recreating the starfield RAF on every `parallaxY` change will crash/lock the page. Keep one RAF and read `parallaxY` from a ref.
- Don’t capture `getTargetFps` directly in the loop dependency; mirror to a ref and read inside.
Visual/Gameplay
“Floating files” background (game points/outliers) sometimes not visible or are drowned by starfield layers.
Z-index and compositing contention between starfield and game canvas.
Game Mechanics Stability
Core leveling/splitting logic works in principle but feels desynced during lag.
Click radius and capture animations feel inconsistent when FPS drops.
Architecture Debt
useClusteringGalaxy.ts still carries sim, snapshot, and render composition. Engine exists but not fully integrated.
Immediate Goals (Phase 1: 1-2 hours)
Replace DOM starfield with a single canvas starfield that:
Renders at target FPS (default 30), pauses on document.hidden.
Scales star count by device performance/low-quality mode.
Avoids per-star path overhead (use tiny rect/dots, precomputed star positions).
Ensure the game canvas sits above starfield and below content:
Starfield z-index: behind game (z-0), Game canvas also z-0 but mounted later. If needed, set starfield z-[-1] or wrap in separate layer to avoid overlap.
Confirm pointer-events on game canvas and not swallowed by starfield.
Disable expensive visual features under low-quality:
Remove web lines and scribbles for outliers; simplify core glow.
Reduce ambient/outlier counts by factor for mobile/low FPS.
Concrete Tasks (Actionable)
Starfield Migration
Remove DOM stars in app/page.tsx.
Add a canvas-based starfield component (e.g., components/StarfieldCanvas.tsx) and mount it conditionally with starsOn.
Implement throttled RAF based on getTargetFps() from game API, plus visibilitychange pause.
Ensure the RAF effect doesn’t depend on `parallaxY` or `getTargetFps`; use refs to read the latest values inside the loop.
Star count heuristic: scale by viewport area and low-quality mode; avoid .arc; draw small rects; batched per layer.
Layering and Hit Testing
Ensure starfield is purely visual: pointer-events: none.
ClusteringGalaxyCanvas must capture clicks; verify it mounts after starfield and has correct z-order.
Confirm the main main content uses z-10+ to float above canvases.
Game Render Simplification (low-quality mode)
In useClusteringGalaxy.ts render path, when lowQualityMode is true:
Skip web line drawing completely.
Reduce glow passes for core icons and outliers.
Optional: sample every other outlier render on low-end devices.
Throttle Everything to 30 FPS by Default
Game loop already throttled: re-verify budget enforcement at 30 FPS.
Starfield uses the same budget from API; re-fetch on FPS change.
Counts and Culling
Reduce AMBIENT_COUNT and outlier cap for mobile.
Add offscreen culling in draw: skip points > viewport margin (small guard band).
Secondary Goals (Phase 2: 2-4 hours)
Fully integrate engine/ClusteringGalaxyEngine.ts:
Move sim out of React hook; hook only orchestrates state and persistence.
Fixed-timestep sim at 30–60 Hz; render decoupled; frame-skipping under load.
Robust UI State
Ensure all UI reads from a single authoritative state; avoid stale closures (use refs carefully).
Make purchase/click paths pure and validated (already partially done).
Persistence
Keep sanitized JSON; add versioning to guard future schema changes.
Provide reset/save export in HUD.
Known Bugs to Reproduce/Fix
Starfield causes main thread blocking: open DevTools Performance, record 10s and examine long tasks around DOM updates and layout thrash from thousands of spans.
“Files not floating”: verify canvas draw layer ordering and that registerCanvas is called; ensure the snapshot has points and that renderAll() is called per frame without exceptions (console).
Leveling events:
Verify custom events galaxy-effect names: l2-reached, first-max fire once.
Confirm split occurs and both clusters draw; reassign of clusterId is working.
Suggested Acceptance Criteria
Background starfield and game run at a stable 30 FPS on mid-tier laptops; responsive input.
No frame-long tasks > 16ms more than 10% of frames on desktop; no dropped input.
Game canvas always visible above starfield; clicking outliers consistently captures and increases tokens.
HUD Settings allow switching to 60 FPS (desktop) and performance mode Low/High; starfield and game honor toggles.
Debugging Checklist
Performance
DevTools Performance: profile with CPU 4x throttle; verify frame budget met.
Memory tab: take heap snapshots after 5 and 15 minutes; no unbounded growth of event handlers, arrays, or canvases.
Rendering
Log once per mount for registerCanvas, per frame for errors in render try/catch.
Toggle starsOn; ensure mount/unmount cleans up all RAFs/listeners.
Gameplay
Click radius near core: outliers are captured and animate inward.
Level to 2, then to 5; verify event dispatch and split.
Persistence
Reload page; tokens/IQ/upgrades persist; schema guards handle invalid localStorage gracefully.
Settings
- Confirm Settings dropdown opens above all layers (`z-50`), toggles starsOn/panelsOn/galaxyOn, and updates FPS and quality via API.
- HUD no longer contains a Galaxy toggle. Ensure users use Settings to toggle the game.
- Verify top bar right padding is applied when the HUD sidebar is open so Settings doesn’t overlap the sidebar.
High-Risk Areas
Conflicting canvases and z-index layering allowing starfield to overdraw game.
Multiple RAF loops running simultaneously; ensure single RAF per system and throttle budgets are respected.
Over-aggressive draw details (glows, lines, scribbles) in low-quality mode.
How to Run
Dev: npm run dev
Build: npm run build
Lint: npm run lint
File/Function Pointers
Starfield replacement target: Remove DOM star block in app/page.tsx (look for map over parallaxFactors) and mount a new StarfieldCanvas.
Game loop throttling: hooks/useClusteringGalaxy.ts → target FPS refs, visibility pause, low-quality mode. Add further draw simplifications under low-quality branches.
Z ordering: Adjust container wrappers in app/page.tsx so starfield is behind game canvas; ensure pointer-events: none on starfield and pointer-events: auto on game canvas.
Event sanity: useClusteringGalaxy.ts → dispatch of galaxy-effect for l2-reached and first-max.
Final Suggestions
Feature-flag the starfield off by default on mobile until the canvas version ships.
After starfield canvas and low-quality passes are in, revisit counts (ambient/outliers) and sizes for mobile separately.
If performance remains poor, consider:
Dropping scribbles entirely and switching all icons to circles when low-quality is on.
Pre-baking simple shadows instead of layered glow strokes.
Coalescing getStats() computations to amortized counters rather than per-frame reductions.
If you need to triage fast:
Comment out starfield entirely.
Keep game canvas only; confirm baseline FPS and responsiveness.
Re-introduce starfield canvas with progressively more stars until the budget holds.
Good luck.
