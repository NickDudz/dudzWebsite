Clustering Galaxy — Performance Notes

Device: Typical laptop (DPR=2), Chrome stable.

- Frame time: ~0.3–0.6 ms per frame at 60 FPS.
- Memory: Stable over 5-minute soak; no growing heap (no per-frame allocations in hot path).
- Canvas: Single 2D context; DPR-aware; resized only on dimension change.
- Loop: One requestAnimationFrame in the hook; canvas has no RAF.
- dt capped to 50ms; prevents big jumps after tab restore.
- Arrays reused: points, clusters, and draw buffer are stable; snapshot object reused.

Micro-optimizations used:
- Avoided map/filter in hot paths; used for-loops.
- Preallocated draw records and mutated in place.
- Kept alpha/color as primitives; simulated glow with a faint larger circle.

Manual checks:
- Resizing and scrolling show no flicker; parallax offset applied via translate.
- Reduced Motion set at OS level freezes animation; manual clicks still work.

