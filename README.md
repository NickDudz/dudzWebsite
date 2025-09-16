# Nick Dudz Portfolio

A modern portfolio website built with Next.js 15, featuring an animated starfield background, project showcase, and an innovative ML-themed clicker game.

## Features

- **Animated Starfield Background**: Single-canvas, multi-layer parallax starfield with smooth animations
- **Project Showcase**: Grid layout highlighting various projects and experiments
- **ML-Themed Clicker Game**: Interactive background game with clustering mechanics
- **Revamped Galaxy HUD**: Top-right dropdown that expands to a right sidebar with a sticky header showing key stats (Tokens, IQ, Cores by level, totals) and scrollable upgrades
- **Modern Design**: Dark theme with zinc color palette and glassmorphism effects
- **Responsive Layout**: Mobile-first design that works across all devices
- **Performance Optimized**: Uses Framer Motion and GPU-accelerated animations

## ✅ Current Status

**Branch**: `feature/clicker-game-rework`
**Status**: Fully functional with recent stability and UX improvements

Recent improvements completed:`n- ✅ Fixed cosmetics color picker auto-close via centralized modal overlay`n- ✅ Fixed array overflow crashes with render bounds checking`n- ✅ Added 1000 core limit to prevent exponential performance issues`n- ✅ Improved data tracking system (manual clicks + auto-collect)`n- ✅ Polished Galaxy HUD with blue-purple gradient design`n- ✅ Enhanced buy quantity system (1x, 5x, 20x)`n- ✅ Responsive dropdown/sidebar layout improvements`n- ✅ Debug functions for testing and development`n`n- ✅ Fixed array overflow crashes with render bounds checking
- ✅ Added 1000 core limit to prevent exponential performance issues
- ✅ Improved data tracking system (manual clicks + auto-collect)
- ✅ Polished Galaxy HUD with blue-purple gradient design
- ✅ Enhanced buy quantity system (1x, 5x, 20x)
- ✅ Responsive dropdown/sidebar layout improvements
- ✅ Debug functions for testing and development

The game is now stable and production-ready. See [CLAUDE.md](./CLAUDE.md) for technical details.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Language**: TypeScript
- **Icons**: Custom SVG icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nickdudz/dudzWebsite.git
cd dudzWebsite
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:galaxy` - Run lightweight Clustering Galaxy math tests

## Deployment

This project is optimized for deployment on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nickdudz/dudzWebsite)

Or deploy manually:
1. Run `npm run build`
2. Deploy the `out` folder to your hosting provider

## Project Structure

```
├── app/                 # Next.js App Router pages
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main portfolio page
├── public/             # Static assets
├── CLAUDE.md          # Development guidance
└── README.md          # Project documentation
```

## Implementation Guide

This section summarizes the correct way to implement the starfield, game canvas, and settings so the page stays stable and responsive.

- Starfield Canvas: Single `<canvas>` with one RAF, DPR-aware sizing via `ResizeObserver`, no per-prop re-mounts of the loop. Drive parallax via a ref, not by recreating effects. Throttle to target FPS from the game API and pause on `document.hidden`.
- Game Canvas: Renders above the starfield (`z-[1]` vs starfield `z-[-1]`), captures clicks, has `pointer-events: auto`. Starfield must be `pointer-events: none`.
- Settings Dropdown: Pure UI, toggles only state/API calls. Ensure the menu is rendered in the content layer (`z-10+`), and the dropdown panel has a higher z-index (e.g. `z-50`).
- Galaxy HUD: Open via the "Data HUD" button at top-right. Dropdown can expand into a full right sidebar. Galaxy On/Off lives in Settings only; the HUD no longer includes a galaxy toggle. The sticky header remains visible while upgrades scroll.

Checklist (Do/Don't)
- Do keep exactly one RAF per system (starfield, game). Don't include fast-changing values like `parallaxY` in the RAF effect dependency array; store them in refs instead.
- Do size the canvas with DPR (`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`). Don't rebuild stars on every frame; only on resize.
- Do draw tiny rects for stars. Don't use `ctx.arc` thousands of times per frame.
- Do throttle using `getTargetFps()` from the game API. Don't call `setState` in tight loops outside the budget.
- Do set `pointer-events: none` on the starfield canvas. Don't allow it to swallow clicks intended for the game/UI.

Troubleshooting
- Menu not clickable: ensure the content wrapper uses `z-10` and the dropdown panel uses `z-50`. Check that no full-screen overlays cover it.
- Page jank or crash: confirm a single RAF is running. In DevTools Performance, look for multiple RAF callbacks or frequent effect re-mounts. Verify `StarfieldCanvas` effect deps.

See more details in CLAUDE.md and HANDOFF_SUMMARY.md.

## Clustering Galaxy

An optional, feather-light ML-themed idle/clicker background that renders a drifting data field with clusters and rare clickable outliers. It uses a single `<canvas>`, one requestAnimationFrame loop, and persists progress locally.

- Components: `components/ClusteringGalaxyCanvas.tsx`, `components/GalaxyUI.tsx`
- Hook: `hooks/useClusteringGalaxy.ts`
- Styles: `styles/galaxy.css`
- Notes: `example/Page.patch.txt`, `BALANCING.md`, `PERF.md`

Integration is non-invasive - see `example/Page.patch.txt`.

### A11Y Checklist

- Honors `prefers-reduced-motion`: pauses animation/spawns; clicks still work.
- Background pointer-events remain off; only the canvas captures clicks.
- HUD is keyboard-focusable with clear labels; small, readable text on dark background. Sticky header keeps critical information visible.
- No audio; subdued visuals; short animations (≤300ms bursts).

### Effects Hook

Subscribe for site-wide micro-effects:

```
window.addEventListener('galaxy-effect', (e) => {
  const { name } = (e as CustomEvent).detail || {}
  if (name === 'confetti') { /* quick confetti burst */ }
  if (name === 'palette')  { /* rotate bg hue by ~15° for ~6s */ }
})
```


## License

MIT License - feel free to use this code for your own projects!
