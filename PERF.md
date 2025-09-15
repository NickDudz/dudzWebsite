Clustering Galaxy - Performance Notes

## Recent Stability Fixes (2025-01-15)

- **Array overflow protection**: Added bounds checking to prevent crashes when render buffer exceeds 584 slots
- **Core limit**: Maximum 1000 cores prevents exponential performance degradation from core splitting
- **Graceful degradation**: Rendering stops safely when visual element limit reached
- **Memory stability**: Fixed potential memory issues with large core counts

Device: Typical laptop (DPR=2), Chrome stable.

- Frame time: ~0.3–0.6 ms per frame at 60 FPS.
- Memory: Stable over 5-minute soak; no growing heap (no per-frame allocations in hot path).
- Canvas: Single 2D context; DPR-aware; resized only on dimension change.
- Loop: One requestAnimationFrame in the hook; canvas has no RAF.
- dt capped to 50ms; prevents big jumps after tab restore.
- Arrays reused: points, clusters, and draw buffer are stable; snapshot object reused.

Canvas Starfield Best Practices
- One RAF: Start once and avoid effect re-creations. Read `parallaxY` and `getTargetFps` from refs.
- Throttle: Use a frame budget (`1000 / targetFps`) and skip frames below budget.
- Visibility: do zero work when `document.hidden`; refresh budget on `visibilitychange`.
- Resize & DPR: use `ResizeObserver`, set backing store size, and `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
- Draw: prefer `fillRect` for stars (no `arc`); rebuild star list only on resize.

RAF Hygiene (Do/Don't)
- Do: keep one RAF per system (game, starfield).
- Do: store fast-changing inputs in refs to prevent effect churn.
- Don't: include `parallaxY` in starfield effect deps; it recreates the loop and can crash under scroll.

Micro-optimizations used:
- Avoided map/filter in hot paths; used for-loops.
- Preallocated draw records and mutated in place.
- Kept alpha/color as primitives; simulated glow with a faint larger circle.

Manual checks:
- Resizing and scrolling show no flicker; parallax offset applied via translate.
- Reduced Motion set at OS level freezes animation; manual clicks still work.
