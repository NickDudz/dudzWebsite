# Changelog

## [Unreleased]
- TBD

## [2025-09-16]
### Fixed
- Cosmetics color picker closing automatically. Implemented centralized modal picker:
  - Single overlay rendered via createPortal outside AnimatePresence
  - No document-level outside-click listeners; backdrop handles close
  - Panel-level state prevents child remount from losing open status
  - Explicit close via backdrop, Escape, Close button, or selection
