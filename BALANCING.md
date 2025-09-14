Clustering Galaxy — Initial Balancing

Targets (vibe: 80% calm / 20% ML flavor):

- Outlier spawn: ~3–7s at level 0; gently faster with Data Ingest.
- Pulses: 5–9s randomized per cluster; glow ~200ms.
- First upgrade: reachable in ~20–40s with casual clicks.
- Batch Collect: cap chance at 25%; feels like a nice surprise.

Key constants (tune here):

- CLICK_BASE = 3
- PASSIVE_BASE = 1
- BASE_SPAWN = 5.0s → cooldown = BASE_SPAWN / (1 + 0.15 × level)
- Attraction α: 0.04 + 0.008 × level
- Pulse reward: PASSIVE_BASE × (1 + 0.3 × level) × (1 + 0.02 × members)
- Mini-batch chance: min(0.06 × level, 0.25); converts up to ~3 neighbors for +1 each

Upgrade costs: cost = base × 1.6^level

- Data Ingest: 25
- Label Quality: 50
- Model Capacity: 60
- Attraction Coeff (α): 30
- Mini-Batch: 120

Offline trickle: small fraction (~12%) of expected passive income, capped at 30 minutes.

Tweaking tips:

- Calmer: raise BASE_SPAWN, lower α and passive multiplier.
- Livelier: add one more cluster anchor, slightly raise α and passive multiplier.
- Faster early game: increase CLICK_BASE or reduce first-tier costs by ~10–15%.

