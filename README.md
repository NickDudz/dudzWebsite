# Nick Dudz Portfolio

A modern portfolio website built with Next.js 15, featuring an animated starfield background, project showcase, and an innovative ML-themed clicker game.

## Features

- **Animated Starfield Background**: Multi-layer parallax scrolling stars with smooth animations
- **Project Showcase**: Grid layout highlighting various projects and experiments
- **ML-Themed Clicker Game**: Interactive background game with clustering mechanics
- **Modern Design**: Dark theme with zinc color palette and glassmorphism effects
- **Responsive Layout**: Mobile-first design that works across all devices
- **Performance Optimized**: Uses Framer Motion and GPU-accelerated animations

## 🚧 Current Status

**Branch**: `feature/clicker-game-rework`  
**Status**: Ready for architectural refactor and UX improvements

The clicker game is currently implemented but needs:
- TypeScript strict mode enabled
- Memory leak fixes
- Architecture refactoring
- UX improvements and tutorial
- Performance optimizations

See [REWORK_PLAN.md](./REWORK_PLAN.md) for detailed refactor plan.

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

## Clustering Galaxy

An optional, feather-light ML-themed idle/clicker background that renders a drifting data field with clusters and rare clickable outliers. It uses a single `<canvas>`, one requestAnimationFrame loop, and persists progress locally.

- Components: `components/ClusteringGalaxyCanvas.tsx`, `components/GalaxyUI.tsx`
- Hook: `hooks/useClusteringGalaxy.ts`
- Styles: `styles/galaxy.css`
- Notes: `example/Page.patch.txt`, `BALANCING.md`, `PERF.md`

Integration is non-invasive — see `example/Page.patch.txt`.

### A11Y Checklist

- Honors `prefers-reduced-motion`: pauses animation/spawns; clicks still work.
- Background pointer-events remain off; only the canvas captures clicks.
- HUD is keyboard-focusable with clear labels; small, readable text on dark background.
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
