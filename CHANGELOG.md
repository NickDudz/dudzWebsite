# Changelog

## [Unreleased]
- TBD

## [2025-09-17]
### Added
- Unlockable sprites: large drifting shapes now spin, shake on click, crack progressively, and play a brief break animation on unlock. A 3s unlock toast is dispatched and shown in the UI.
- Pulsing glow behind unlockables that matches active special color shift (Custom/Neon).
- Clear Save Data API: resets tokens/IQ/upgrades, clears total pages collected, locks sprites except `database`, resets cosmetics, and respawns exactly one L1 core.

### Changed
- Unlockable cadence set to ~60s; drift speed tuned and size scaled for readability (with adjustable scaling).
- Top bar and toasts use `pointer-events` layering so clicks pass through to the canvas except over interactive controls.
- Hydration warning suppression added on root `<html>` and gradient title spans.
- Cosmetics persistence normalized: always stores full object (`coreColors`, `ambientColors`, `coreSprites[5]`, `specialEffects`, `unlockedSprites`).

### Fixed
- Sprite unlocks immediately reflected in `CosmeticsPanel` without refresh.
- Orbit update crash after clear-save: clustered pages now guard against missing cores and fall back to ambient.
- Clickability restored across top area: non-interactive overlays no longer block canvas clicks.

## [2025-09-16]
### Fixed
- Cosmetics color picker closing automatically. Implemented centralized modal picker:
  - Single overlay rendered via createPortal outside AnimatePresence
  - No document-level outside-click listeners; backdrop handles close
  - Panel-level state prevents child remount from losing open status
  - Explicit close via backdrop, Escape, Close button, or selection
