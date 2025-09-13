# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 portfolio website for Nicholas Dudczyk (dudz.pro) featuring an animated starfield background with parallax scrolling effects. The main component creates an interactive stellar animation with multiple parallax layers and debug controls for fine-tuning visual effects.

## Architecture

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom CSS-in-JS animations
- **Animations**: Framer Motion for component animations and transitions
- **Language**: TypeScript with relaxed strict mode settings
- **Main Component**: Single-page application in `app/page.tsx` with embedded `ProjectCard` component

## Key Components

### Main Page (`app/page.tsx`)
- Client-side React component with complex starfield animation system
- Multi-layer parallax scrolling with configurable parameters
- Debug panel for real-time animation tuning
- Project showcase grid with hover animations

### Animation System
- **Stars Generation**: Dynamic star field based on viewport size
- **Parallax Layers**: 4 separate layers with different movement factors
- **Smooth Scrolling**: Custom interpolation using `requestAnimationFrame`
- **Performance**: Uses `will-change-transform` for GPU acceleration

### Special Files
- `dudzpro.jsx`: Appears to be a duplicate/backup of the main page component (may have slight differences)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Styling Architecture

- Uses Tailwind CSS with custom color palette (zinc/blue theme)
- Custom CSS animations defined inline using template literals
- Responsive design with mobile-first approach
- Dark theme with `#07090c` background and zinc color scheme

## Performance Considerations

- Star generation is optimized based on viewport size
- Uses `requestAnimationFrame` for smooth animations
- Implements proper cleanup for event listeners and animation frames
- Lazy loading for project images

## Development Notes

- Debug panel is currently visible in production build
- TypeScript strict mode is disabled (`"strict": false`)
- Project uses placeholder images from picsum.photos
- Email and social links are present but may need actual URLs