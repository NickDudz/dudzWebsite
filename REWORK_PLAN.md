# 🚀 Portfolio Clicker Game Rework Plan

## Current State (Pre-Rework)
- **Branch**: `feature/clicker-game-rework`
- **Status**: Ready for architectural refactor
- **Last Commit**: `9c0f241` - ML-themed clicker game implementation

## 🎯 Rework Objectives

### Phase 1: Critical Fixes
- [ ] Enable TypeScript strict mode
- [ ] Add error boundaries and proper error handling
- [ ] Fix memory leaks in useClusteringGalaxy hook
- [ ] Add input validation for clicks and upgrades
- [ ] Handle localStorage errors gracefully

### Phase 2: Architecture Refactor
- [ ] Split monolithic useClusteringGalaxy hook into focused modules
- [ ] Create game engine class for better separation of concerns
- [ ] Centralize constants and configuration
- [ ] Add comprehensive TypeScript type definitions

### Phase 3: UX Improvements
- [ ] Add simple tutorial overlay
- [ ] Improve HUD design and visibility
- [ ] Add progress indicators for upgrades
- [ ] Enhance visual feedback for user actions

### Phase 4: Performance Optimization
- [ ] Implement frame rate limiting (60 FPS cap)
- [ ] Add performance monitoring and metrics
- [ ] Optimize canvas rendering and draw calls
- [ ] Add performance settings for different devices

## 📁 Key Files Structure

```
├── app/
│   ├── page.tsx                 # Main portfolio page (needs tutorial integration)
│   └── globals.css              # Global styles
├── components/
│   ├── ClusteringGalaxyCanvas.tsx  # Canvas renderer (needs error handling)
│   ├── GalaxyUI.tsx             # Game HUD (needs UX improvements)
│   └── ErrorBoundary.tsx        # NEW - Error handling wrapper
├── hooks/
│   ├── useClusteringGalaxy.ts   # MONOLITHIC - needs splitting
│   ├── useGameState.ts          # NEW - State management
│   ├── useGameLogic.ts          # NEW - Game mechanics
│   ├── useRendering.ts          # NEW - Canvas rendering
│   └── usePersistence.ts        # NEW - Save/load functionality
├── engine/
│   └── ClusteringGalaxyEngine.ts # NEW - Main game engine class
├── constants/
│   └── gameConstants.ts         # NEW - Centralized constants
├── types/
│   └── gameTypes.ts             # NEW - TypeScript definitions
└── styles/
    └── galaxy.css               # Game-specific styles
```

## 🐛 Critical Issues to Address

### 1. TypeScript Configuration
**File**: `tsconfig.json`
**Issue**: `"strict": false` defeats TypeScript purpose
**Priority**: HIGH

### 2. Memory Leaks
**File**: `hooks/useClusteringGalaxy.ts:313-333`
**Issue**: Event listeners and RAF not properly cleaned up
**Priority**: HIGH

### 3. Monolithic Architecture
**File**: `hooks/useClusteringGalaxy.ts` (1000+ lines)
**Issue**: Violates single responsibility principle
**Priority**: MEDIUM

### 4. Missing Error Handling
**File**: `components/ClusteringGalaxyCanvas.tsx`
**Issue**: No error boundaries for canvas failures
**Priority**: HIGH

### 5. Poor UX
**File**: `components/GalaxyUI.tsx:36-44`
**Issue**: HUD collapsed by default, no tutorial
**Priority**: MEDIUM

## 🎮 Tutorial Implementation Plan

### Simple Tutorial Design
- **Trigger**: Single glowing data point with "Click here" text
- **Action**: Click opens HUD panel and starts normal game flow
- **Message**: "Click glowing data points to feed cores. Level cores to earn IQ points."
- **Persistence**: One-time only, dismissed after first interaction

### Implementation Steps
1. Create `components/TutorialOverlay.tsx`
2. Add tutorial state to main page component
3. Integrate with existing game initialization
4. Style to match portfolio theme

## 📊 Performance Targets

- **Frame Rate**: Stable 60 FPS on modern devices
- **Memory Usage**: No leaks over 10+ minute sessions
- **Load Time**: Game initializes within 100ms
- **Canvas Performance**: Smooth animations without stuttering

## 🚀 Getting Started

1. **Checkout the rework branch**:
   ```bash
   git checkout feature/clicker-game-rework
   ```

2. **Start with Phase 1** - Fix critical bugs first
3. **Test thoroughly** - Each phase should be fully functional
4. **Maintain portfolio focus** - Game should enhance, not distract
5. **Document changes** - Update this file and code comments

## ✅ Success Criteria

- [ ] All TypeScript errors resolved with strict mode enabled
- [ ] No memory leaks detected in 10+ minute sessions
- [ ] Tutorial successfully introduces new users to the game
- [ ] Performance remains stable at 60 FPS
- [ ] Code is maintainable with clear module separation
- [ ] Portfolio content remains the primary focus

## 📝 Notes

- The clicker game should remain a subtle background element
- Focus on maintaining the portfolio's primary purpose
- Ensure smooth performance across all devices
- Keep the ML theme consistent with the overall design
- Document all architectural decisions for future maintenance

---

**Ready to begin rework!** 🚀
