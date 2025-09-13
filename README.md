# Nick Dudz Portfolio

A modern portfolio website built with Next.js 15, featuring an animated starfield background and project showcase.

## Features

- **Animated Starfield Background**: Multi-layer parallax scrolling stars with smooth animations
- **Project Showcase**: Grid layout highlighting various projects and experiments
- **Modern Design**: Dark theme with zinc color palette and glassmorphism effects
- **Responsive Layout**: Mobile-first design that works across all devices
- **Performance Optimized**: Uses Framer Motion and GPU-accelerated animations

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

## License

MIT License - feel free to use this code for your own projects!