# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 portfolio website for Nicholas Dudczyk (dudz.pro) featuring an animated starfield background with parallax scrolling effects and an integrated ML-themed clicker game. The site combines a professional portfolio with an interactive background game for engagement.

## Architecture

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion for UI
- **Language**: TypeScript (strict-ish)
- **Game Engine**: React hook + canvas render pipeline (single RAF)

## Key Changes (2025-09-17)

- **Unlockables**: Large drifting shapes (locked sprites) spawn ~every 60s, spin, and shake on click. Each click increases cracking. On final click, a short break animation plays and the sprite unlocks permanently. A toast shows “Unlocked: <Name>”.
- **Special Effects**: Neon RGB and Custom Shift (palette-based). User-adjustable shift speed is persisted. Unlockable fill and glow match the active shift color.
- **Cosmetics**: Normalized persistence; `galaxy.cosmetics` always includes `coreColors[5]`, `ambientColors`, `coreSprites[5]`, `unlockedSprites`, `specialEffects`. UI updates immediately when unlocks occur.
- **Clear Save Data**: Full reset (tokens/iq/upgrades), clears total collected, spawns exactly one L1 core, locks sprites except `database`, resets cosmetics, and respects `strictLocked` baseline in getters.
- **Pointer Events**: Top overlays (toasts) and header shell use `pointer-events: none`; only interactive controls `pointer-events: auto`. Ensures clicks reach the game canvas.
- **Hydration**: `suppressHydrationWarning` applied to root `<html>` and gradient title spans to avoid Dark Reader mismatches.

## Files of Interest

- `app/page.tsx`: Mounts starfield + game canvas; houses header controls, toasts, and HUD placement. Applies pointer-events layering.
- `components/GalaxyUI.tsx`: Dropdown/sidebar HUD with sticky header, buy quantity, and collapsible sections. Gradient title.
- `components/CosmeticsPanel.tsx`: Palette/Sprites/Special tabs; single unlocked list; mini shape previews; collected counter; locked section.
- `hooks/useClusteringGalaxy.ts`: Core sim/render/persistence; unlockable system; special effects coloring; clearSaveData; API exposure.
- `constants/sprites.ts`: Central sprite catalog/emoji mapping; default locked testing IDs.
- `CHANGELOG.md` and `HANDOFF_SUMMARY.md`: Dated changes and narrative status.

## Public API (Game Hook)

`useClusteringGalaxy(opts)` returns `{ state, api, parallaxY }` where `api` includes:

- Canvas
  - `registerCanvas(canvas) => unsubscribe` – register/deregister canvases to draw to
  - `getDrawSnapshot()` – latest composed draw snapshot
- Interaction
  - `clickAt(x, y)` – normalized click handler (checks readiness; prioritizes unlockables)
- Economy
  - `purchase(key)` – token upgrades; includes `dataQuality`
  - `purchaseIQ(key)` – IQ upgrades (`computeMult`, `autoCollect`, `confetti`, `palette`)
  - `getStats()` – tokens/sec, cores by level, total collected, current floating data
- Cosmetics
  - `getCosmeticsSettings()` – validated cosmetics object (may enforce `strictLocked`)
  - `setCosmeticsSettings(settings)` – persist + reflect to UI immediately
- Performance / Settings
  - `setTargetFps(fps)`, `getTargetFps()`
  - `setPerformanceMode(bool)`, `getPerformanceMode()`
  - `setExtremeMode(bool)`, `getExtremeMode()`
  - `getCurrentFps()` – measured render FPS
- Save management
  - `clearSaveData()` – full reset as described above (returns boolean)

## Unlockables

- Spawn rules: one active at a time; schedule ~60s when any remain locked.
- Movement: slow drift from edges, gentle spin; click adds shake and spin burst.
- Cracking: progresses each click; on final click, play break fragments and despawn.
- Color: fill/glow use `applySpecialColor` with current shift settings.
- Toast: `window.dispatchEvent(new CustomEvent('galaxy-toast', { detail: { message, kind: 'unlock', ms } }))`.

UI Listener (already wired in `app/page.tsx`): shows a non-interactive toast near the top center.

## Pointer Events & Layering

- Starfield: `pointer-events: none`, behind game.
- Game Canvas: centered interactive layer; captures clicks.
- Top Header Shell: `pointer-events: none`; buttons/links explicitly `pointer-events: auto`.
- Toasts: `pointer-events: none` to never block clicks.
- HUD (GalaxyUI): dropdown/sidebar containers explicitly `pointer-events: auto`.

## Mobile Adjustments & Density Capping

We now use a lightweight device profile and a density-aware cap to keep ambient background data from cluttering small screens and to scale with window size on desktop:

- Device profile (`isMobileRef`):
  - Detected via viewport width (≤ 820px) or mobile UA. Updated on resize.
  - File: `hooks/useClusteringGalaxy.ts` (near top, alongside `enabledRef`).

- Density-aware ambient cap:
  - Applied for all devices (desktop and mobile) so resizing the window adjusts density.
  - Computation (in `buildSnapshot()`):
    - `area = W * H`
    - `targetDensity = isMobile ? 0.00003 : 0.00008` (points per pixel)
    - `densityCap = floor(area * targetDensity)`
    - `maxAmbient = min(densityCap, floor(availableForData * 0.6 * ambientFactor))`
  - Tuning guidance:
    - Increase `targetDensity` to show more ambient points; decrease to reduce clutter.
    - Consider adding a Settings toggle to override `isMobileRef.current` for testing.

- Swirl coverage and speed (unchanged rules):
  - Coverage: `coverage = clamp(peakTotalCores / 200, 0, 1)` controls what fraction swirls.
  - Speed: `s = clamp(peakTotalCores / 1010, 0, 1)` ramps angular speed.
  - Only points with `seed <= coverage` swirl; others remain mostly in place.

Adding future mobile-only fixes:
- Prefer checking `isMobileRef.current` where logic should diverge.
- Keep the default path optimized for desktop; add smaller constants or skips under `isMobileRef` (e.g., fewer web lines, reduced glow, lower orbiting-per-core).
- If user-facing, add a Settings switch that flips a `forceMobileTuning` flag read in the hook instead of guessing from UA/width.

## Hydration Notes

Third-party extensions (e.g., Dark Reader) inject attributes causing SSR/CSR mismatches. We suppress warnings on:
- Root `<html>` in `app/layout.tsx` via `suppressHydrationWarning`.
- Gradient title spans in `GalaxyUI`.

## Persistence

- LocalStorage keys:
  - `galaxy.tokens`, `galaxy.iq`, `galaxy.upgrades`, `galaxy.iqUpgrades`
  - `galaxy.coreData` – array of `{ level, x, y, stackCount }`
  - `galaxy.totalEverCollected`
  - `galaxy.cosmetics` – normalized object (see Cosmetics)
- On unload and at intervals, state is saved defensively in try/catch.
- `getCosmeticsSettings()` merges unlocked list with a baseline; if `strictLocked` is true, baseline is `['database']`.

## Troubleshooting

- "Top area clicks not working": ensure toasts/header use `pointer-events: none` and GalaxyUI containers `pointer-events: auto`. Verify no other overlay is intercepting.
- Unlockable not appearing unlocked in panel: confirm `galaxy.cosmetics` updated with full normalized object; panel should reflect immediately.
- Crash after clear save: clustered pages now guard missing cores; all points reset to ambient on clear.
- Hydration mismatch: expected when Dark Reader is active; suppression prevents breakage.

## Conventions

- Prefer early guards for null/undefined; never assume canvas `ctx` exists.
- Keep draw buffer bounds; respect reserved capacity for core halo/dot pairs.
- When adding shapes, extend `constants/sprites.ts` and match draw branches in the hook.

## Key Components

### Main Page (`app/page.tsx`)
- Client-side React component with starfield animation system
- Multi-layer parallax scrolling with configurable parameters
- Auto-starts clicker game on load
- Project showcase grid with hover animations
- **Critical State**: `galaxyOn` controls game visibility, `starsOn` controls starfield
- Adds responsive right padding to the top row when the Galaxy HUD sidebar is open to avoid Settings overlap

## Recent Major Enhancements (2025-01-16)

### Enhanced Clickable Data System
- **Orbital Movement**: 360° spawn pattern with gravity-like attraction and tangential velocity
- **Neon Visual Effects**: Multi-layer glow system with RGB neon mode support
- **Click Feedback**: Animated ripple effects and enhanced visual feedback
- **Data Quality**: Bronze/Silver/Gold visual tiers with proper color coding
- **Performance**: Improved despawn logic prevents data accumulation

### Cinematic Core Upgrade Animation
- **5-Stage Animation**: Data convergence → chip glow → chip shrink → cores shooting → cores returning
- **Easing Functions**: easeOutBack, easeOutElastic, easeInCirc for smooth transitions
- **Visual Polish**: Cores maintain orbital paths during other core animations
- **Timing**: 2.5-second total animation with precise stage coordination

### Comprehensive Cosmetics System (PARTIALLY FUNCTIONAL - NEEDS FIX)
- **CosmeticsPanel**: 3-tab interface (Palette, Sprites, Special)
- **26 Sprite Options**: Database, geometric shapes, emojis, and symbols
- **Color Palettes**: 5-color gradients for core customization
- **RGB Neon Mode**: Special effect unlocked through upgrades
- **Persistent Settings**: Saves to localStorage with game state
- **CRITICAL ISSUES**: Color picker closes instantly, duplicate scroll containers in sprite panel
- **STATUS**: Sprite rendering works, emoji tinting works, but UI is unusable

### Sprite Unlock System (Scaffolding)
- Large drifting unlockable sprite spawns on a 5–10 minute timer, chosen from currently locked sprites.
- Click the unlockable 10 times to permanently add it to `galaxy.cosmetics.unlockedSprites`.
- When all sprites are unlocked, no more unlockables spawn. For now, all sprites initialize as unlocked by default.
- Sprites tab: 5 selected boxes (L1–L5) at top, with a single shared unlocked list and a collected counter under the grid.

### Enhanced Save System
- **Core Persistence**: Saves core positions, levels, and orbital data
- **Export/Import**: JSON format with file download/upload support
- **SaveManager Component**: Full UI for save management in Settings
- **Data Validation**: Safe loading with fallback to defaults
- **Clear Functionality**: Reset all game progress with confirmation

### Mobile Responsiveness Fixes
- **Button Overlap**: Resolved Settings/Galaxy UI positioning conflicts
- **Responsive Padding**: Dynamic right padding based on HUD state
- **Touch Optimization**: Improved touch targets and gesture handling
- **Performance**: BG Effects toggle consolidates starfield and ambient data

### Starfield System
- **Implementation**: Canvas-based starfield (single canvas, one RAF). DOM version deprecated.
- **Star Count**: Scaled by viewport and performance mode
- **Layers**: 3–4 parallax layers
- **Performance**: Throttled by game FPS; `pointer-events: none`

### Clicker Game Engine (`hooks/useClusteringGalaxy.ts`)
- **Core Loop**: 30 FPS RAF loop with frame budget throttling
- **Data Points**: 520 ambient points + dynamic outliers
- **Game State**: Persistent localStorage with schema validation and data tracking
- **Performance**: Low-quality mode reduces glow passes and disables scribbles
- **Core Limits**: Maximum 1000 cores to prevent exponential performance degradation
- **Render Safety**: Bounds checking prevents array overflow crashes

## Game Architecture

### Key Game Functions

#### useClusteringGalaxy Hook
```typescript
// Main game hook - manages entire game state
const galaxy = useClusteringGalaxy({
  enabled: galaxyOn,           // Enable/disable game
  orbitalMode: !panelsOn      // Orbital vs normal mode
})

// Returns comprehensive API object with:
// - clickAt(x, y): Handle canvas clicks with full validation
// - registerCanvas(canvas): Register render target
// - getTargetFps(): Get current FPS setting (30/60)
// - setPerformanceMode(bool): Toggle low-quality mode
// - debug: Enhanced debug controls for testing
```

#### Game Loop Structure (Fixed Timestep)
```typescript
// RAF loop in useClusteringGalaxy.ts ~line 511
const step = () => {
  // CRITICAL: Initialization check prevents timing bugs
  if (!worldW.current || !worldH.current || !points.current.length || !persisted.current) {
    raf = requestAnimationFrame(step)
    return
  }

  // Throttle rendering to target FPS and pause when page not visible
  if (!pageVisible.current || elapsedSinceLast < frameBudgetMs.current) {
    raf = requestAnimationFrame(step)
    return
  }

  // Fixed timestep simulation (30Hz) independent of render FPS
  simulationAccumulator.current += elapsedTime
  while (simulationAccumulator.current >= SIMULATION_DT) {
    simulate(SIMULATION_DT / 1000) // Convert ms to seconds
    simulationAccumulator.current -= SIMULATION_DT
  }

  // Always render (but optimize if needed)
  renderAll()
  raf = requestAnimationFrame(step)
}
```

#### Point System & Core Mechanics (Enhanced)
- **Ambient Points**: 520 background data points (gray icons) with synchronized star rotation
- **Outliers**: Flying clickable data (spawned from edges, 75-100 px/s horizontal movement)
- **Clusters**: CPU cores that collect data (single core at top-center initially)
- **Core Splitting**: Cores split at level 5+ but limited to 1000 total cores
- **Core Stacking**: L1-L4 cores stack at 8+ threshold, L5+ cores stack at 3+ threshold
- **Orbital Distribution**: Golden ratio distribution (π * (3 - √5)) prevents clustering
- **Rigid Orbital Motion**: Mathematical positioning with velocity tracking for smoothness
- **Data Tracking**: Counts actual data pieces collected (manual clicks + auto-collect)

### Canvas System (`components/ClusteringGalaxyCanvas.tsx`)
- **Purpose**: Renders game on HTML5 canvas above starfield
- **Z-Index**: Level 1 (starfield at -1, content at 10+)
- **Events**: Captures mouse clicks and forwards to game engine
- **Auto-sizing**: Responds to viewport changes with ResizeObserver

## Performance Architecture

### FPS Management
- **Default**: 30 FPS for battery life and performance
- **Adjustable**: 30/60 FPS via HUD settings
- **Throttling**: Frame budget system prevents dropped frames
- **Visibility**: Auto-pauses when page hidden

### Low-Quality Mode
When enabled via HUD settings:
- **Starfield**: 40% fewer stars
- **Game**: No web lines, reduced glow passes (3→1), no scribbles
- **Culling**: Viewport culling for offscreen objects

### Performance Constants (Updated)
```typescript
// In useClusteringGalaxy.ts
const AMBIENT_COUNT = 520        // Background data points
const SIMULATION_FPS = 30        // Fixed simulation timestep (30Hz)
const SIMULATION_DT = 1000 / SIMULATION_FPS // 33.33ms per sim step
const frameBudgetMs = 1000/30    // Frame time budget (dynamic based on targetFps)
const lowQualityMode = useRef()  // Performance toggle
const MAX_CORES = 1000          // Maximum cores before splitting stops
const STACK_THRESHOLD = 8       // L1-L4 cores stack at 8+ cores
const L5_STACK_THRESHOLD = 3    // L5+ cores stack at 3+ cores
const DRAW_BUFFER_SIZE = 584    // Fixed render buffer (AMBIENT_COUNT + 64)

// Orbital Animation (Enhanced)
const orbitalSpeeds = useRef<number[]>([])   // Individual orbital speed per core
const bouncePeriods = useRef<number[]>([])   // Individual bounce frequency per core
const bouncePhases = useRef<number[]>([])    // Individual bounce phase offset per core
const orbitalRadii = useRef<number[]>([])    // Individual orbital radius per core

// Visual System (Enhanced)
const LEVEL_COLOR_INDEX = [5, 6, 7, 8, 9]   // GalaxyUI-matching blue-purple gradient
// Halo brightness: (0.02 + 0.04 * prog) * (1 + level * 0.3) // Level-based brightness scaling
```

### FPS Counter System (NEW)
```typescript
// FPS monitoring and display
const currentFps = useRef<number>(30)  // Real-time render FPS tracking
getCurrentFps: () => number            // API to access current FPS

// Usage in components
<FpsCounter
  show={showFpsCounter}
  getCurrentFps={galaxy.api?.getCurrentFps}
  getTargetFps={galaxy.api?.getTargetFps}
/>

Placement: The page positions the FPS counter under the Email button to avoid overlap with controls.
/>
```

## Common Debugging Issues & Critical Fixes

### Click Detection Issues (FIXED)
**Problem**: Clicks fail after page refresh, even though canvas clicks are detected
**Root Cause**: Race condition where canvas click handlers bind before game state initializes
**Solution**: Added comprehensive initialization checks in two places:
1. `clickAt()` function: Validates `persisted.current`, `worldW/H.current`, `points.current.length`
2. RAF loop: Same checks prevent simulation/rendering before state is ready
**Debug**: Console shows "Game not ready for clicks" with specific missing components

### Game Not Visible
1. **Check `galaxyOn` state**: Should be `true` (auto-set on load)
2. **Verify canvas registration**: Canvas must call `api.registerCanvas()`
3. **Page visibility**: `pageVisible.current` must be `true`
4. **World bounds**: `worldW.current` and `worldH.current` must be set
5. **Initialization timing**: RAF loop waits for all state to be ready

### Core Performance Issues (FIXED)
**Problem**: Animation freeze with too many cores
**Solution**: Core stacking system prevents exponential growth
- L1-L4 cores: Stack at 8+ threshold (max 100 per stack)
- L5+ cores: Stack at 3+ threshold (max 100 per stack)
- Hard limit: 1000 total cores maximum
**Debug**: Check `getTotalCoreCount()` and individual `stackCount` properties

### Orbital Distribution Issues (FIXED)
**Problem**: Cores clustering in half-circle, leaving blank areas
**Solution**: Golden ratio distribution with angle preservation
- Uses `Math.PI * (3 - Math.sqrt(5))` for even spacing
- Preserves existing angles when adding new cores
- Velocity tracking for smooth predictive movement

### FPS Dependency Issues (FIXED)
**Problem**: Game speed tied to frame rate
**Solution**: Fixed timestep simulation independent of render FPS
- Simulation: Fixed 30Hz timestep using accumulator pattern
- Rendering: Variable FPS (30/60) based on user preference
- Movement speeds reduced 50% for better visual experience

### Array Overflow Crashes (FIXED)
**Symptoms**: "Cannot set properties of undefined (setting 'x')" in buildSnapshot
**Cause**: Too many visual elements exceed fixed drawBuffer size (584 slots)
**Fix**: Bounds checking added to prevent array overflow; core stacking prevents exponential growth
**Debug**: Check `clusters.current.length` and ensure it's under 1000

### Cosmetics System Issues (CRITICAL - NEEDS IMMEDIATE FIX)
**Problem**: Color picker closes instantly, making color selection impossible
**Root Cause**: Complex event propagation conflicts with portal rendering and React event handling
**Symptoms**:
- Color picker window disappears in <1 second automatically
- Users cannot select colors from the palette
- UI becomes completely unusable for color customization
**Current Workaround**: Manual close-only implemented, but still auto-closes
**Additional Issue**: Duplicate scroll containers in sprite panel creating redundant scroll wheels

**Problem**: Double scroll containers in sprite selection
**Symptoms**: Two scroll wheels appear in the sprite tab when only one is needed
**Impact**: Confusing UX, unnecessary scrolling complexity

## Development Commands

**CRITICAL: Development server is running on port 3000!**
- DO NOT run `npm run dev` - it's already running in the user's terminal
- DO NOT start any development servers yourself
- If you need to check the running application, ask the user to provide logs/screenshots
- Only run build/dev commands if explicitly requested by the user
- Ask permission before running `npm run build` or similar commands

```bash
# Development server (RUNNING ON PORT 3000 - DO NOT START!)
# npm run dev  # <- DO NOT RUN THIS

# Build for production (ASK FIRST!)
npm run build

# Run linting (configure ESLint first)
npm run lint
```

## File Structure

```
├── app/page.tsx                 # Main page with starfield + game
├── components/
│   ├── ClusteringGalaxyCanvas.tsx  # Game renderer
│   ├── GalaxyUI.tsx             # Game HUD/controls
│   ├── StarfieldCanvas.tsx      # Canvas starfield (unused)
│   ├── CosmeticsPanel.tsx       # Cosmetics customization UI (NEW)
│   ├── SaveManager.tsx          # Save/load/export UI (NEW)
│   ├── SettingsDropdown.tsx     # Enhanced with save management
│   └── ErrorBoundary.tsx        # Error handling
├── hooks/
│   └── useClusteringGalaxy.ts   # Main game engine (enhanced)
├── constants/gameConstants.ts   # Game balance values
├── types/gameTypes.ts          # TypeScript definitions (updated)
└── HANDOFF_SUMMARY.md          # Detailed technical context
```

## Debugging Console Commands

```javascript
// In browser console when game is running:

// Check game state
console.log(galaxy.state)

// Check points
console.log(points.current.filter(p => p.state === 'outlier'))

// Force spawn outlier
api.clickAt(100, 100)

// Check performance
console.log(currentFps, targetFps.current)
```

## Game Mechanics & Data Tracking

### Data Collection System
- **Manual clicks**: Count as 1 data piece each (regardless of token gain from upgrades)
- **Auto-collect**: IQ upgrade that automatically collects outliers, counts toward data total
- **Passive income**: Core token generation does NOT count toward data collected
- **Debug tokens**: Do NOT count toward data collected (prevents stat inflation)

### Core Progression & Limits
- **Core splitting**: Level 5+ cores consume 10 members, grant 1 IQ, and split into 2 cores
- **Maximum cores**: Hard limit of 1000 cores prevents exponential performance issues
- **Member tracking**: Each core tracks orbiting data points, with visual web connections
- **Upgrade balance**: No artificial limits on upgrade levels (removed hardcoded caps)

### Render System Safety
- **Fixed buffer**: 584-slot drawBuffer for all visual elements
- **Bounds checking**: Prevents array overflow crashes when too many visual elements exist
- **Graceful degradation**: Stops rendering additional elements when buffer full
- **Performance monitoring**: Auto-adjusts quality based on FPS

## Critical State Variables

- `galaxyOn`: Game enabled/disabled
- `starsOn`: Starfield enabled/disabled
- `pageVisible.current`: Page visibility (affects game loop)
- `worldW/H.current`: Viewport dimensions
- `points.current`: All game data points (520 ambient + outliers)
- `clusters.current`: CPU cores/collection points (max 1000)
- `persisted.current.totalEverCollected`: Actual data pieces collected counter

## Upgrade System & Debug Features

### Enhanced Debug Controls (Added)
- **Individual Core Spawning**: Buttons to spawn L1, L2, L3, L4, L5 cores directly
- **Upgrade Level Testing**: Crude controls to set upgrade levels (0, 1, 5, 10)
- **Token/IQ Management**: Add tokens and IQ for testing scenarios
- **Comprehensive API**: All debug functions accessible via `galaxy.debug.*`

### Upgrade System Fixes (Applied)
- **Data Ingest (Spawn Rate)**: Now properly applied to outlier spawn timing
- **Spawn Quantity**: Correctly multiplies outliers spawned per cycle
- **Click Yield**: Token bonus per manual click working correctly
- **Mini-Batch**: Probability-based multi-outlier collection on click
- **Data Quality**: Bronze/Silver/Gold tiers for additional outliers

### Core Animation System (Enhanced)
- **Smooth Level Transitions**: Data gets sucked into core before level-up animation
- **Independent Orbits**: Cores maintain their paths during other core splits
- **Easing Functions**: `easeOutBack` and `easeOutElastic` for pleasing animations
- **Scale Effects**: Cores pulse and scale during collection and level transitions

### Enhanced Orbital Motion System (NEW)
- **Individual Orbital Speeds**: Each core has unique speed (±15% variation from base 0.4 rad/s)
- **Varied Orbital Radii**: Level-based radius scaling with small cores closer to center, large cores further out
- **Radial Bouncing**: Perpendicular (inward/outward) bounce motion for breathing effect
- **Dynamic Bounce Frequencies**: Individual bounce periods (0.4-1.6 Hz) with random phase offsets
- **Smooth Motion**: Removed angle normalization to prevent orbital jitter
- **Mathematical Distribution**: Golden ratio spacing for even core distribution around orbit

### Enhanced Visual System (NEW)
- **Core Colors**: Updated to match GalaxyUI blue-purple gradient (`#3b82f6` → `#c084fc`)
- **Radial Gradient Halos**: Proper glowing effect that fades from center to transparent edges
- **Level-Based Brightness**: Higher level cores appear progressively brighter (up to 2.5x for L5)
- **Subtle Core Glow**: Much fainter shape-conforming glow (reduced 70% opacity)
- **Visual Hierarchy**: Easy identification of high-level cores through brightness scaling

### Smart Rendering System (NEW)
**Priority-based rendering** prevents background data disappearing at high core counts:

```typescript
// Rendering priority order (most to least important)
1. Flying Data (Outliers)     // Always rendered - clickable and essential
2. Background Ambient Data    // Guaranteed minimum 80 points visible
3. Orbiting Data             // Limited per core: max(2, floor(8 - coreCount/15))
4. Cores                     // Always rendered - most critical

// Buffer management prevents overflow crashes
const reservedForCores = Math.min(visibleCoreCount * 2, 200)
const maxAmbient = Math.max(80, Math.floor(availableForData * 0.6))
```

### Visual Performance Scaling
- **Core Count**: 0-50 cores → 8 orbiting data per core
- **Core Count**: 50-100 cores → 5-6 orbiting data per core
- **Core Count**: 100+ cores → 2-3 orbiting data per core
- **Background**: Always minimum 80 ambient points regardless of core count

## Implementation Notes (Starfield, Game, Settings)

Starfield Canvas (correct pattern)
- Single RAF: start the loop once; don’t include animated props (e.g., `parallaxY`) in the effect deps.
- Use refs: mirror `parallaxY` and `getTargetFps` into refs; read them inside the draw loop.
- Throttle: compute frame budget using `getTargetFps()`; skip frames when below budget.
- Visibility: update budget and skip work when `document.hidden`.
- Resize/DPR: maintain backing store via `ResizeObserver`; call `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` after resizing.
- Draw cheap: draw tiny `fillRect` pixels, avoid `arc`; rebuild stars only on resize.
- Layering: starfield `pointer-events: none` at `z-[-1]`; game canvas at `z-[1]`; content at `z-10+`.

Game Canvas
- Single 2D context; render is driven by the game hook’s single RAF.
- Register canvases via `api.registerCanvas(canvas)` and clean up on unmount.
- Respect low-quality mode by skipping expensive effects.

Settings Dropdown
- Wire to API: `targetFps={api.getTargetFps()}`, `onTargetFpsChange={api.setTargetFps}`, `performanceMode={api.getPerformanceMode()}`, `onPerformanceModeToggle={() => api.setPerformanceMode(!api.getPerformanceMode())}`.
- Ensure it renders within the content wrapper (`z-10+`) and the panel uses `z-50`.
- If clicks fail, verify no overlay intercepts events and the starfield uses `pointer-events: none`.

Galaxy HUD (`components/GalaxyUI.tsx`)
- Triggered via a top-right "Data Continuum Idle" button (dropdown).
- **Two modes**: Compact dropdown (max-width 22rem) and expanded sidebar (24rem width)
- **Sticky header**: Title, Tokens, IQ, Cores L1–L5 with blue-purple gradient colors, Total cores
- **Data stats**: "Data Collected" (totalEverCollected) and "Data Processing" (floating data count)
- **Buy quantities**: 1x, 5x, 20x selector moved to bottom of header
- **Compact buttons**: Close/Expand buttons resized (10px text, smaller padding)
- **Close behavior**: Close button fully closes HUD instead of compacting in sidebar mode
- **Core colors**: Blue-purple gradient `["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"]`
- **Visual design**: No dots for L1-L5 cores, dots only appear for L6+ dots (L6+ show as "•••")
- **Enhanced debug**: Individual L1-L5 core spawn buttons, upgrade level controls, token/IQ management

## Maintenance & Stability

### Critical Initialization Sequence
1. **Page Visibility**: `pageVisible.current = !document.hidden` (immediate)
2. **World Dimensions**: `worldW/H.current = window.inner*` (on resize + init)
3. **Persisted State**: Load from localStorage with validation and migration
4. **Points Array**: Initialize 520 ambient points with proper positioning
5. **Clusters Array**: Initialize single core at top-center (0.5, 0.12)
6. **RAF Loop**: Only starts after all components ready

### State Validation Patterns
```typescript
// Always check game readiness before operations
if (!persisted.current || !worldW.current || !worldH.current || !points.current.length) {
  console.warn('Game not ready for operation')
  return
}

// Validate user input thoroughly
if (typeof x !== 'number' || !isFinite(x) || x < -50 || x > worldW.current + 50) {
  console.warn('Invalid coordinates')
  return
}
```

### Performance Monitoring
- **FPS Counter**: Real-time render FPS tracking with 1-second updates
- **Core Count**: Monitor total cores via `getTotalCoreCount()`
- **Memory Safety**: Fixed 584-slot draw buffer prevents overflow
- **Graceful Degradation**: Skip expensive effects when performance drops

### Error Recovery
- **Try-catch blocks**: Around localStorage operations and rendering
- **Bounds checking**: Prevent array access beyond buffer limits
- **State consistency**: Always validate state before mutations
- **Initialization order**: RAF waits for complete state readiness

## Game Timing & FPS Analysis

### Critical Timing Architecture
The game uses a **fixed timestep simulation** that is completely independent of render FPS:

```typescript
// Fixed simulation rate - NEVER changes regardless of render FPS
const SIMULATION_FPS = 30        // 30Hz simulation
const SIMULATION_DT = 33.33      // Exactly 33.33ms per simulation step

// Accumulator pattern ensures perfect timing
simulationAccumulator.current += frameTime
while (simulationAccumulator.current >= SIMULATION_DT) {
  simulate(SIMULATION_DT / 1000) // Always exactly 0.03333 seconds
  simulationAccumulator.current -= SIMULATION_DT
}
```

### FPS vs Game Speed Independence
**CRITICAL**: The game's timing is 100% independent of render FPS. Here's why:

1. **Income Generation**: Each core has precise 1-second timers using fixed dt
2. **Auto-Collect**: Uses same fixed timestep for consistent intervals
3. **Catch-up Logic**: If render drops, simulation runs multiple steps to catch up
4. **Perfect Accuracy**: Game progression is frame-rate independent

### FPS Counter Implementation
The enhanced FPS counter shows both:
- **Browser FPS**: True refresh rate capability (should hit 60 on 60Hz displays)
- **Game FPS**: Intentionally throttled render rate (~59 due to frame budget)

### Why Game Shows 59 FPS Instead of 60
The frame budget throttling (`1000/60 = 16.666ms`) creates slight timing discrepancies:
- **Root Cause**: `elapsedSinceLast < frameBudgetMs` comparison with browser timing precision
- **Impact on Game**: **ZERO** - simulation uses fixed timestep independent of render
- **User Impact**: **Imperceptible** - 59 vs 60 FPS is not noticeable
- **Performance Benefit**: Prevents runaway loops and saves battery

### Timing Verification Commands
```javascript
// Verify timing independence in browser console
console.log('Simulation FPS:', 30)  // Always 30Hz
console.log('Render FPS:', galaxy.api.getCurrentFps())  // ~59-60
console.log('Game timing uses fixed 33.33ms steps regardless of render FPS')
```
