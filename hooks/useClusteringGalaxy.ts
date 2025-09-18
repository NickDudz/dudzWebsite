"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { GAME_CONFIG } from "../constants/gameConstants"
import { SPRITE_EMOJI, ALL_SPRITE_IDS, DEFAULT_LOCKED_SPRITES, ALL_SPRITES } from "../constants/sprites"

// Public types and API
/**
 * DrawSnapshot: Pure projection for the canvas renderer.
 * - width, height: target logical size (CSS pixels, before DPR scale)
 * - parallaxY: host-provided or internally smoothed scroll offset
 * - points: flat list of draw records in render order
 *   { x, y, radius, alpha, color }
 */
export type DrawRecord = { x: number; y: number; radius: number; alpha: number; color: number; shape?: 'icon' | 'halo' | 'core'; variant?: number; glow?: number }
export type DrawSnapshot = { width: number; height: number; parallaxY: number; points: DrawRecord[] }

export type Upgrades = {
  spawnRate: number
  spawnQty: number
  clickYield: number
  batchCollect: number
  dataQuality?: number
}

type PointState = "ambient" | "outlier" | "capturing" | "clustered"
export type Point = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  state: PointState
  clusterId?: number
  age: number
  alpha: number
  orbitR?: number
  orbitPhase?: number
  targetCluster?: number
  captureT?: number
  rotationOffset?: number // For star rotation sync
  fadeState?: 'fadeIn' | 'visible' | 'fadeOut' | 'hidden' // For smooth ambient culling
  fadeProgress?: number // 0-1 fade progress
  // New animation properties for enhanced click feedback
  clickAnimT?: number // Click animation timer (0-1)
  clickRot?: number // Click rotation effect
  clickOffsetX?: number // Click position offset X
  clickOffsetY?: number // Click position offset Y
  // Drag and drop properties
  isDragging?: boolean // Whether point is being dragged
  dragOffsetX?: number // Mouse offset from point center during drag
  dragOffsetY?: number // Mouse offset from point center during drag
  // Visual physics effects
  rotation?: number // Current rotation angle for visual effects
  rotationSpeed?: number // Rotation speed
  wobbleT?: number // Wobble animation timer (0-1)
  wobbleStrength?: number // How much wobble effect
  // Velocity-based physics for spiral capture
  initialVx?: number // Initial velocity from mouse movement
  initialVy?: number // Initial velocity from mouse movement
  velocityCooldownT?: number // Cooldown timer before orbital pull starts
}

export type Cluster = {
  id: number
  x: number
  y: number
  vx?: number // velocity for predictive orbital positioning
  vy?: number // velocity for predictive orbital positioning
  members: number
  radius: number
  emitTimer: number
  flashT: number
  webIndices: number[]
  level: number
  progress: number
  colorIndex: number
  stackCount?: number // How many identical cores are stacked here
  isVisible?: boolean // Whether this core should be rendered (for stacking)
  // Animation states
  levelUpAnimT?: number // Level up animation timer
  collectAnimT?: number // Data collection animation timer
  scaleMultiplier?: number // Scale animation multiplier
}

export type GalaxyState = {
  tokens: number
  iq: number
  upgrades: Upgrades
  iqUpgrades: { computeMult: number; autoCollect: number; confettiUnlocked: boolean; paletteUnlocked: boolean }
  dragAndDropEnabled: boolean
}

export type GalaxyAPI = {
  getDrawSnapshot(): DrawSnapshot
  registerCanvas: (canvas: HTMLCanvasElement | null) => () => void
  clickAt: (x: number, y: number) => void
  purchase: (key: keyof Upgrades) => void
  purchaseIQ: (key: 'computeMult' | 'autoCollect' | 'confetti' | 'palette') => void
  triggerEffect: (name: "confetti" | "palette") => void
  getStats: () => { tokensPerSec: number; coresByLevel: number[]; totalEverCollected: number; currentFloatingData: number }
  getCosmeticsSettings?: () => { coreColors: string[]; ambientColors: string[]; coreSprites: string[]; unlockedSprites: string[]; specialEffects?: { rgbNeon?: boolean; customShift?: boolean; shiftSpeed?: number } }
  setCosmeticsSettings?: (settings: { coreColors: string[]; ambientColors: string[]; coreSprites: string[]; unlockedSprites: string[]; specialEffects?: { rgbNeon?: boolean; customShift?: boolean; shiftSpeed?: number } }) => void
  clearSaveData?: () => boolean
  setTargetFps: (fps: number) => void
  getTargetFps: () => number
  setPerformanceMode: (lowQuality: boolean) => void
  getPerformanceMode: () => boolean
  getCurrentFps: () => number
  getRenderStats: () => { outliers: { rendered: number; total: number; limit: number }; ambient: { rendered: number; total: number; limit: number }; clustered: { rendered: number; total: number; limit: number }; cores: { rendered: number; total: number; limit: number }; unlockables: { rendered: number; total: number; limit: number }; buffer: { used: number; total: number; available: number } }
  setExtremeMode: (v: boolean) => void
  getExtremeMode: () => boolean
  // Drag and drop methods
  startDrag: (x: number, y: number) => boolean
  updateDrag: (x: number, y: number) => void
  endDrag: (velocityX: number, velocityY: number) => void
  setDragAndDropEnabled: (enabled: boolean) => void
  getDragAndDropEnabled: () => boolean
  debug: {
    addTokens: (amount: number) => void
    addIQ: (amount: number) => void
    addCores: (levels: number[]) => void
    setUpgradeLevel: (upgradeKey: keyof Upgrades, level: number) => void
    setIQUpgradeLevel: (upgradeKey: keyof NonNullable<GalaxyState['iqUpgrades']>, level: number) => void
    setExtremeMode?: (v: boolean) => void
  }
}

export type UseClusteringGalaxyOptions = {
  enabled?: boolean
  orbitalMode?: boolean
}

export function useClusteringGalaxy(opts: UseClusteringGalaxyOptions = {}) {
  const enabled = opts.enabled ?? true
  const orbitalMode = opts.orbitalMode ?? false
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // Device profile (simple heuristic for mobile tuning)
  const isMobileRef = useRef<boolean>(false)

  // Drag state for outlier drag and drop
  const dragStateRef = useRef<{worldX: number, worldY: number, isActive: boolean, draggedPoint?: number} | null>(null)
  function updateDeviceProfile() {
    try {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200
      const h = typeof window !== 'undefined' ? window.innerHeight : 800
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
      // Treat narrow viewports or mobile UA as mobile
      isMobileRef.current = (w <= 820 || /Mobile|Android|iP(ad|hone|od)|IEMobile|BlackBerry/i.test(ua))
    } catch { isMobileRef.current = false }
  }
  useEffect(() => {
    updateDeviceProfile()
    const onResize = () => updateDeviceProfile()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize, { passive: true })
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('resize', onResize)
    }
  }, [])

  // Virtual world scaling
  const WORLD_VU = 1000 // canonical virtual units across the shortest screen axis
  const zoomRef = useRef<number>(1)
  
  // Render statistics tracking
  const renderStatsRef = useRef<{ outliers: { rendered: number; total: number; limit: number }; ambient: { rendered: number; total: number; limit: number }; clustered: { rendered: number; total: number; limit: number }; cores: { rendered: number; total: number; limit: number }; unlockables: { rendered: number; total: number; limit: number }; buffer: { used: number; total: number; available: number } }>({
    outliers: { rendered: 0, total: 0, limit: 0 },
    ambient: { rendered: 0, total: 0, limit: 0 },
    clustered: { rendered: 0, total: 0, limit: 0 },
    cores: { rendered: 0, total: 0, limit: 0 },
    unlockables: { rendered: 0, total: 0, limit: 0 },
    buffer: { used: 0, total: 0, available: 0 }
  })

  // Two-canvas clustered data system
  type ClusteredCanvas = {
    coreId: number
    angle1: number
    angle2: number
    speed1: number
    speed2: number
    distance1: number
    distance2: number
    dataCount1: number
    dataCount2: number
    maxDataPerCanvas: number
  }
  
  const clusteredCanvases = useRef<Map<number, ClusteredCanvas>>(new Map())
  
  // Clustered canvas management functions
  function getClusteredCanvas(coreId: number): ClusteredCanvas {
    if (!clusteredCanvases.current.has(coreId)) {
      // Initialize new canvas with different speeds and distances
      const speed1 = 0.3 + Math.random() * 0.2 // 0.3-0.5 rad/s
      const speed2 = 0.4 + Math.random() * 0.2 // 0.4-0.6 rad/s (different speed)
      const distance1 = 25 + Math.random() * 10 // 25-35px from core
      const distance2 = 30 + Math.random() * 10 // 30-40px from core (slightly different distance)
      
      clusteredCanvases.current.set(coreId, {
        coreId,
        angle1: Math.random() * Math.PI * 2,
        angle2: Math.random() * Math.PI * 2,
        speed1,
        speed2,
        distance1,
        distance2,
        dataCount1: 0,
        dataCount2: 0,
        maxDataPerCanvas: 5
      })
    }
    return clusteredCanvases.current.get(coreId)!
  }
  
  function updateClusteredCanvases(dt: number) {
    for (const [coreId, canvas] of clusteredCanvases.current) {
      // Update rotation angles
      canvas.angle1 += canvas.speed1 * dt
      canvas.angle2 += canvas.speed2 * dt
      
      // Find the core to get member count
      const core = clusters.current.find(c => c.id === coreId)
      if (core) {
        const totalData = core.members || 0
        // Split data between two canvases
        canvas.dataCount1 = Math.min(Math.ceil(totalData / 2), canvas.maxDataPerCanvas)
        canvas.dataCount2 = Math.min(Math.floor(totalData / 2), canvas.maxDataPerCanvas)
      } else {
        // Core no longer exists, remove canvas
        clusteredCanvases.current.delete(coreId)
      }
    }
  }
  
  function updateZoom() {
    const w = worldW.current || (typeof window !== 'undefined' ? window.innerWidth : 1200)
    const h = worldH.current || (typeof window !== 'undefined' ? window.innerHeight : 800)
    const shortest = Math.max(1, Math.min(w, h))
    zoomRef.current = shortest / WORLD_VU
  }
  function screenToWorld(x: number, y: number): { x: number; y: number } {
    const w = worldW.current || 0
    const h = worldH.current || 0
    const z = zoomRef.current || 1
    const cx = w * 0.5, cy = h * 0.5
    return { x: (x - cx) / z + WORLD_VU * 0.5, y: (y - cy) / z + WORLD_VU * 0.5 }
  }
  function worldToScreen(x: number, y: number): { x: number; y: number } {
    const w = worldW.current || 0
    const h = worldH.current || 0
    const z = zoomRef.current || 1
    const cx = w * 0.5, cy = h * 0.5
    return { x: cx + (x - WORLD_VU * 0.5) * z, y: cy + (y - WORLD_VU * 0.5) * z }
  }
  useEffect(() => {
    updateZoom()
    const onResize = () => updateZoom()
    if (typeof window !== 'undefined') window.addEventListener('resize', onResize, { passive: true })
    return () => { if (typeof window !== 'undefined') window.removeEventListener('resize', onResize) }
  }, [])

  // Consistent central clear zone radius (as fraction of min viewport dimension)
  function getClearRadius(): number {
    const w = worldW.current || (typeof window !== 'undefined' ? window.innerWidth : 1200)
    const h = worldH.current || (typeof window !== 'undefined' ? window.innerHeight : 800)
    const frac = 0.2 // 20% gives a more noticeable center hole across devices
    return Math.min(w, h) * frac
  }

  // Constants (initial balancing in BALANCING.md)
  const {
    PASSIVE_BASE,
    CLICK_BASE,
    BASE_SPAWN,
    OUTLIER_MAX_BASE,
    OUTLIER_MAX_PER_LEVEL,
    PULSE_MIN,
    PULSE_MAX,
    GLOW_MS,
    AMBIENT_COUNT,
    CLICK_RADIUS,
    WRAP_PAD,
    MAX_DT,
    SPAWN_MARGIN,
    TOP_EXCLUDE,
    EDGE_SPAWN_PAD,
    MAX_CORES,
    STACK_THRESHOLD,
    L5_STACK_THRESHOLD,
    STACK_THRESHOLDS,
    STACK_THRESHOLDS_HIGH,
    DRAW_BUFFER_EXTRA,
    ORBIT_LIMIT_BASE,
  } = GAME_CONFIG

  function getColors() {
    // Base slots 0..4 are used by non-core elements; keep them stable
    const base = [
      "#93c5fd",
      "#a78bfa",
      "#818cf8",
      "#60a5fa",
      "#e5e7eb",
    ]
    // Pull palette from cosmetics if available
    const cos = (snapshot as any)?.currentCosmetics
    const palette: string[] = Array.isArray(cos?.coreColors) && cos.coreColors.length >= 5
      ? cos.coreColors
      : ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"]
    
    // Use custom data glow color if available, otherwise use default
    const dataGlowColor = cos?.dataGlowColor || "#00ff88"
    
    // Return base colors + core colors + data glow color at index 10
    return [...base, ...palette.slice(0,5), dataGlowColor]
  }

  // --- Special Effects Color Helpers ---
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (!hex) return null
    let h = hex.startsWith('#') ? hex.slice(1) : hex
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    if (h.length !== 6) return null
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return { r, g, b }
  }
  function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
    const to2 = (v: number) => clamp(v).toString(16).padStart(2, '0')
    return `#${to2(r)}${to2(g)}${to2(b)}`
  }
  function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
  function lerpHex(aHex: string, bHex: string, t: number): string {
    const a = hexToRgb(aHex); const b = hexToRgb(bHex)
    if (!a || !b) return aHex || bHex || '#ffffff'
    return rgbToHex(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t))
  }
  function sampleStops(stops: string[], phase01: number): string {
    if (!stops || stops.length === 0) return '#ffffff'
    if (stops.length === 1) return stops[0]
    const p = ((phase01 % 1) + 1) % 1
    const seg = 1 / stops.length
    const idx = Math.floor(p / seg)
    const t = (p - idx * seg) / seg
    const a = stops[idx]
    const b = stops[(idx + 1) % stops.length]
    return lerpHex(a, b, t)
  }
  function rainbowStops(): string[] {
    // 6-color rainbow approximately
    return ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#00a4ff', '#8b00ff']
  }
  function computeLevelFromColorIndex(idx: number): number {
    for (let i = 0; i < GAME_CONFIG.LEVEL_COLOR_INDEX.length; i++) {
      if (GAME_CONFIG.LEVEL_COLOR_INDEX[i] === idx) return i + 1
    }
    return 1
  }
  function applySpecialColor(level: number, baseHex: string, nowSec: number): string {
    const cos = (snapshot as any).currentCosmetics || null
    const special = cos?.specialEffects || {}
    const userSpeed = typeof special?.shiftSpeed === 'number' && isFinite(special.shiftSpeed) ? Math.max(0.25, Math.min(3, special.shiftSpeed)) : 1.0
    if (special?.customShift) {
      const pal: string[] = Array.isArray(cos?.coreColors) && cos.coreColors.length > 0
        ? cos.coreColors.slice(0, Math.max(1, Math.min(5, level)))
        : ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"].slice(0, Math.max(1, Math.min(5, level)))
      const speed = 0.15 * userSpeed
      const phase = (nowSec * speed + level * 0.07) % 1
      if (pal.length === 1) {
        // Single color: gently pulse toward white then back
        const t = 0.5 + 0.5 * Math.sin(nowSec * 1.2 * userSpeed + level)
        return lerpHex(pal[0], '#ffffff', 0.08 * t)
      }
      return sampleStops(pal, phase)
    }
    if (special?.rgbNeon) {
      const stops = rainbowStops()
      const speed = 0.2 * userSpeed
      const phase = (nowSec * speed + level * 0.1) % 1
      return sampleStops(stops, phase)
    }
    return baseHex
  }
  const LEVEL_COLOR_INDEX = GAME_CONFIG.LEVEL_COLOR_INDEX
  const LEVEL_RATE = GAME_CONFIG.LEVEL_RATE

  // Persisted bits
  type Persisted = { tokens: number; iq: number; upgrades: Upgrades; iqUpgrades: { computeMult: number; autoCollect: number; confettiUnlocked: boolean; paletteUnlocked: boolean }; lastSeen: number; totalEverCollected: number; dragAndDropEnabled: boolean }
  const persisted = useRef<Persisted | null>(null)
  const [uiState, setUiState] = useState<GalaxyState>(() => ({
    tokens: 0,
    iq: 0,
    upgrades: { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 },
    iqUpgrades: { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false },
    dragAndDropEnabled: true, // Default enabled
  }))
  const [targetFpsState, setTargetFpsState] = useState(30)
  const [performanceModeState, setPerformanceModeState] = useState(false)

  // Simulation model
  const points = useRef<Point[]>([])
  const clusters = useRef<Cluster[]>([])
  const spawnCooldown = useRef<number>(1)
  const lastTick = useRef<number>(0)
  const reducedMotion = useRef<boolean>(false)
  const autoAcc = useRef<number>(0)
  // Unlockable large drifting sprites (click 10x to unlock)
  type Unlockable = { id: string; x: number; y: number; vx: number; vy: number; size: number; clicks: number; clicksRequired: number; angle: number; av: number; shakeT: number; spinBoostT: number; seed: number; crackP: number; breaking: boolean; breakT: number; breakTotal: number }
  const unlockables = useRef<Unlockable[]>([])
  const nextUnlockSpawnAt = useRef<number>(0)
  const firstL2Notified = useRef<boolean>(false)
  const firstMaxNotified = useRef<boolean>(false)
  // Round-robin tracker for stacking target per level to distribute stacks
  const stackRoundRobin = useRef<Record<number, number>>({})
  
  // Orbital movement
  const orbitalAngles = useRef<number[]>([])
  const orbitalRadii = useRef<number[]>([]) // Individual radius per core
  const orbitalSpeeds = useRef<number[]>([]) // Individual orbital speed per core
  const bouncePeriods = useRef<number[]>([]) // Individual bounce period per core
  const bouncePhases = useRef<number[]>([]) // Individual bounce phase offset per core
  const orbitalCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const orbitalRadius = useRef<number>(0)

  // Star rotation sync for lightweight floating data rotation
  const starRotationTime = useRef<number>(0)
  // Track the peak total number of cores ever reached (sum of stack counts)
  const maxTotalCores = useRef<number>(0)

  // Draw snapshot (stable reference)
  const snapshot = useRef<DrawSnapshot>({ width: 0, height: 0, parallaxY: 0, points: [] })
  // Size draw buffer to support the largest mode (extreme) so we don't reallocate on mode changes
  const MAX_CORE_RESERVE = Math.max(GAME_CONFIG.CORE_RESERVE_CAP_LOW, GAME_CONFIG.CORE_RESERVE_CAP_HIGH, GAME_CONFIG.CORE_RESERVE_CAP_EXTREME)
  const BUFFER_SIZE = AMBIENT_COUNT + MAX_CORE_RESERVE + GAME_CONFIG.OUTLIER_RESERVE + GAME_CONFIG.DRAW_BUFFER_EXTRA
  const drawBuffer: DrawRecord[] = useRef<DrawRecord[]>(new Array(BUFFER_SIZE).fill(0).map(() => ({ x: 0, y: 0, radius: 0, alpha: 0, color: 0, shape: 'icon', variant: 0, glow: 0 }))).current

  // Registered canvases
  const canvases = useRef<Set<HTMLCanvasElement>>(new Set())

  // Stable state ref for API closures to avoid stale captures
  const uiStateRef = useRef<GalaxyState>(uiState)
  useEffect(() => { uiStateRef.current = uiState }, [uiState])

  // Performance controls
  const targetFps = useRef<number>(targetFpsState)
  const frameBudgetMs = useRef<number>(1000 / targetFps.current)
  const lastFrameMs = useRef<number>(performance.now())
  const currentFps = useRef<number>(30)
  const lowQualityMode = useRef<boolean>(performanceModeState)
  const pageVisible = useRef<boolean>(true)
  // Extreme mode (debug): raise caps and optionally disable stacking
  const [extremeModeState, setExtremeModeState] = useState<boolean>(false)
  const extremeMode = useRef<boolean>(false)
  useEffect(() => { extremeMode.current = extremeModeState }, [extremeModeState])

  // Enforce stacking thresholds when quality mode changes (e.g., from Extreme -> Low/High)
  useEffect(() => {
    lowQualityMode.current = performanceModeState
    if (!extremeModeState) {
      try { enforceStackingThresholds() } catch {}
    }
  }, [performanceModeState])

  useEffect(() => {
    if (!extremeModeState) {
      try { enforceStackingThresholds() } catch {}
    }
  }, [extremeModeState])

  // Fixed timestep simulation - separate from render FPS
  const SIMULATION_FPS = 30 // Fixed simulation rate
  const SIMULATION_DT = 1000 / SIMULATION_FPS // 33.33ms per simulation step
  const simulationAccumulator = useRef<number>(0)
  const lastSimulationTime = useRef<number>(performance.now())
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => { pageVisible.current = !document.hidden }
    document.addEventListener('visibilitychange', onVis)
    onVis() // Initialize immediately
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Internal helpers
  function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
  function rand(min: number, max: number) { return min + Math.random() * (max - min) }
  function choice<T>(arr: T[]): T { return arr[(Math.random() * arr.length) | 0] }

  // Easing functions for smooth animations
  function easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }
  function easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  }

  function upgradeCost(key: keyof Upgrades, level: number) {
    const base: Record<keyof Upgrades, number> = {
      spawnRate: 25,
      spawnQty: 180,
      clickYield: 50,
      batchCollect: 120,
      dataQuality: 200,
    }
    return Math.round(base[key] * Math.pow(1.6, level))
  }

  // Persistence sanitizers to prevent localStorage corruption from crashing
  function toSafeInt(value: unknown, fallback = 0): number {
    const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
  }
  function sanitizeUpgrades(raw: any): Upgrades {
    const safe: Upgrades = {
      spawnRate: toSafeInt(raw?.spawnRate, 0),
      spawnQty: toSafeInt(raw?.spawnQty, 0),
      clickYield: toSafeInt(raw?.clickYield, 0),
      batchCollect: toSafeInt(raw?.batchCollect, 0),
    }
    const dq = raw?.dataQuality
    if (dq != null) safe.dataQuality = Math.max(0, Math.min(2, toSafeInt(dq, 0)))
    return safe
  }
  function sanitizeIQUpgrades(raw: any): GalaxyState['iqUpgrades'] {
    return {
      computeMult: toSafeInt(raw?.computeMult, 0),
      autoCollect: toSafeInt(raw?.autoCollect, 0),
      confettiUnlocked: Boolean(raw?.confettiUnlocked),
      paletteUnlocked: Boolean(raw?.paletteUnlocked),
    }
  }

  function computeOfflineTrickle(minutes: number) {
    const m = clamp(minutes, 0, 30)
    // Approximate using level-1 rate and current compute multiplier
    const computeMult = Math.pow(2, (persisted.current?.iqUpgrades.computeMult ?? 0))
    const perSec = 1 * computeMult * Math.max(1, clusters.current.length)
    const approx = perSec * 60 * m * 0.12
    return Math.floor(approx)
  }

  function updateOrbitalMovement(dt: number) {
    const W = worldW.current
    const H = worldH.current

    // Update orbital center and base radius
    orbitalCenter.current = { x: W * 0.5, y: H * 0.5 }
    // Base radius in virtual units, scaled by zoom to pixels
    const z = zoomRef.current || 1
    const baseOrbitalRadiusVU = 260 // consistent orbit distance in VU
    orbitalRadius.current = baseOrbitalRadiusVU * z

    // Initialize orbital angles and radii for new cores only (preserve existing)
    while (orbitalAngles.current.length < clusters.current.length) {
      const newIndex = orbitalAngles.current.length
      // Distribute evenly around the full circle with some randomization
      const totalCores = clusters.current.length
      const baseAngle = (newIndex / Math.max(1, totalCores)) * Math.PI * 2

      // Add variety: use golden ratio distribution for better spread + some randomness
      const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // ~137.5 degrees
      const distributedAngle = (newIndex * goldenAngle) % (Math.PI * 2)
      const blendedAngle = baseAngle * 0.7 + distributedAngle * 0.3

      const randomOffset = (Math.random() - 0.5) * Math.PI * 0.2 // Reduced randomness
      orbitalAngles.current.push(blendedAngle + randomOffset)
    }

    // Initialize varied orbital radii for new cores based on level
    while (orbitalRadii.current.length < clusters.current.length) {
      const coreIndex = orbitalRadii.current.length
      const core = clusters.current[coreIndex]
      const baseRadius = orbitalRadius.current

      // Level-based radius: smaller cores closer to center, larger cores further out
      const levelFactor = (core.level - 1) * 0.08 // Each level adds 8% to radius
      const stackFactor = (core.stackCount || 1) > 1 ? 0.05 : 0 // Stacked cores slightly further out
      const randomVariation = (Math.random() - 0.5) * 0.1 // Small random variation (±5%)

      const radiusMultiplier = 0.95 + levelFactor + stackFactor + randomVariation
      const individualRadius = baseRadius * radiusMultiplier
      orbitalRadii.current.push(individualRadius)
    }

    // Initialize bounce parameters for new cores
    while (bouncePeriods.current.length < clusters.current.length) {
      // Varied bounce periods with light randomness for visual stimuli
      const bounceFrequency = 0.4 + Math.random() * 1.2 // 0.4 to 1.6 Hz (light expansion)
      bouncePeriods.current.push(bounceFrequency)
    }

    while (bouncePhases.current.length < clusters.current.length) {
      // Random phase offset so cores don't all bounce in sync
      const phaseOffset = Math.random() * Math.PI * 2
      bouncePhases.current.push(phaseOffset)
    }

    // Initialize varied orbital speeds for new cores
    while (orbitalSpeeds.current.length < clusters.current.length) {
      // Light randomness: base 0.4 ± 15% variation (0.34 to 0.46 rad/s)
      const baseSpeed = 0.4
      const speedVariation = (Math.random() - 0.5) * 0.12 // ±15% variation (0.12/2 = 0.06 = 15% of 0.4)
      const individualSpeed = baseSpeed * (1 + speedVariation)
      orbitalSpeeds.current.push(individualSpeed)
    }

    clusters.current.forEach((cluster, i) => {
      // Safety check - shouldn't be needed but just in case
      if (i >= orbitalAngles.current.length) {
        const goldenAngle = Math.PI * (3 - Math.sqrt(5))
        const distributedAngle = (i * goldenAngle) % (Math.PI * 2)
        orbitalAngles.current.push(distributedAngle + (Math.random() - 0.5) * Math.PI * 0.1)
      }
      if (i >= orbitalRadii.current.length) {
        const core = clusters.current[i]
        const baseRadius = orbitalRadius.current
        const levelFactor = (core.level - 1) * 0.08
        const stackFactor = (core.stackCount || 1) > 1 ? 0.05 : 0
        const randomVariation = (Math.random() - 0.5) * 0.1
        const radiusMultiplier = 0.95 + levelFactor + stackFactor + randomVariation
        orbitalRadii.current.push(baseRadius * radiusMultiplier)
      }
      if (i >= bouncePeriods.current.length) {
        const bounceFrequency = 0.45 + Math.random() * 1.0
        bouncePeriods.current.push(bounceFrequency)
      }
      if (i >= bouncePhases.current.length) {
        const phaseOffset = Math.random() * Math.PI * 2
        bouncePhases.current.push(phaseOffset)
      }

      // Track previous position for velocity calculation
      const prevX = cluster.x
      const prevY = cluster.y

      // Update angle - ensure continuous motion WITHOUT normalization to prevent jitter
      const individualSpeed = orbitalSpeeds.current[i] || 0.4 // Fallback to base speed
      orbitalAngles.current[i] += individualSpeed * dt

      // Use stored radius if available, otherwise calculate new one
      let coreRadius = orbitalRadii.current[i]
      if (coreRadius === undefined) {
        const baseRadius = orbitalRadius.current
        const levelFactor = (cluster.level - 1) * 0.08
        const stackFactor = (cluster.stackCount || 1) > 1 ? 0.05 : 0
        const randomVariation = (Math.random() - 0.5) * 0.1
        const radiusMultiplier = 0.95 + levelFactor + stackFactor + randomVariation
        coreRadius = baseRadius * radiusMultiplier
        orbitalRadii.current[i] = coreRadius
      }

      // Calculate base orbital position using individual radius
      const angle = orbitalAngles.current[i]
      const baseX = orbitalCenter.current.x + Math.cos(angle) * coreRadius
      const baseY = orbitalCenter.current.y + Math.sin(angle) * coreRadius

      // Add bouncy motion tangent to the orbital path
      const timeMs = performance.now()
      const bounceFreq = bouncePeriods.current[i]
      const bouncePhase = bouncePhases.current[i]
      const bounceTime = timeMs * 0.001 * bounceFreq + bouncePhase

      // Bounce amplitude expressed in VU for consistency across devices
      const z2 = zoomRef.current || 1
      const levelBasedAmplitudeVU = 10 + (cluster.level - 1) * 8 // VU
      const levelBasedAmplitudePX = levelBasedAmplitudeVU * z2
      const bounceOffset = Math.sin(bounceTime) * levelBasedAmplitudePX

      // Calculate radial direction for perpendicular (inward/outward) bounce
      const bounceX = Math.cos(angle) * bounceOffset
      const bounceY = Math.sin(angle) * bounceOffset

      cluster.x = baseX + bounceX
      cluster.y = baseY + bounceY

      // Calculate velocity for predictive positioning
      cluster.vx = (cluster.x - prevX) / dt
      cluster.vy = (cluster.y - prevY) / dt
    })
  }

  // Window size for world bounds (CSS pixels)
  const worldW = useRef<number>(0)
  const worldH = useRef<number>(0)

  // Parallax convenience (smoothed scroll)
  const [parallaxY] = useState(0)
  useEffect(() => {
    const onResize = () => {
      const oldW = worldW.current || window.innerWidth
      const oldH = worldH.current || window.innerHeight
      worldW.current = window.innerWidth
      worldH.current = window.innerHeight
      const sx = worldW.current / (oldW || 1)
      const sy = worldH.current / (oldH || 1)
      if (sx !== 1 || sy !== 1) {
        for (let i = 0; i < clusters.current.length; i++) {
          clusters.current[i].x *= sx
          clusters.current[i].y *= sy
        }
        for (let i = 0; i < points.current.length; i++) {
          points.current[i].x *= sx
          points.current[i].y *= sy
        }
      }
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => { window.removeEventListener("resize", onResize) }
  }, [])

  // Init model
  useEffect(() => {
    if (!enabled) return
    // Ensure world bounds are initialized before placing clusters/points
    if (!worldW.current || !worldH.current) {
      worldW.current = window.innerWidth
      worldH.current = window.innerHeight
    }
    // Reduced motion detection + live updates
    let mq: MediaQueryList | null = null
    let onChange: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null
    if (typeof window !== "undefined" && window.matchMedia) {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      reducedMotion.current = mq.matches
      onChange = () => { reducedMotion.current = mq!.matches }
      try { mq.addEventListener("change", onChange) } catch { mq.addListener(onChange as any) }
    }

    // Clusters: single core at top middle
    const anchors = [
      { x: 0.50, y: 0.12 }, // Single core at top center
    ]
    clusters.current = anchors.map((a, i) => ({
      id: i,
      x: a.x * worldW.current,
      y: a.y * worldH.current,
      vx: 0,
      vy: 0,
      members: 0,
      radius: 10,
      emitTimer: rand(PULSE_MIN, PULSE_MAX),
      flashT: 0,
      webIndices: [],
      level: 1,
      progress: 0,
      colorIndex: LEVEL_COLOR_INDEX[0],
      stackCount: 1,
      isVisible: true,
      scaleMultiplier: 1.0,
    }))

    // Ambient points
    const arr: Point[] = new Array(AMBIENT_COUNT)
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      arr[i] = {
        id: i,
        x: SPAWN_MARGIN + Math.random() * Math.max(0, worldW.current - SPAWN_MARGIN * 2),
        y: Math.max(TOP_EXCLUDE, SPAWN_MARGIN + Math.random() * Math.max(0, worldH.current - SPAWN_MARGIN * 2 - TOP_EXCLUDE)),
        // velocities in px/sec (gentle drift)
        vx: rand(-12, 12),
        vy: rand(-12, 12),
        state: "ambient",
        age: 0,
        alpha: rand(0.18, 0.48),
        rotationOffset: Math.random() * Math.PI * 2, // Random offset for star rotation sync
        fadeState: 'visible', // Start visible
        fadeProgress: 1.0, // Fully visible
      }
    }
    points.current = arr

    // Load persistence (validated)
    try {
      const tokensRaw = localStorage.getItem("galaxy.tokens")
      const iqRaw = localStorage.getItem("galaxy.iq")
      const upgradesRaw = localStorage.getItem("galaxy.upgrades")
      const iqUpRaw = localStorage.getItem("galaxy.iqUpgrades")
      const lastSeenRaw = localStorage.getItem("galaxy.lastSeen")
      const dragDropRaw = localStorage.getItem("galaxy.dragAndDropEnabled")
      const tokens = tokensRaw ? (parseInt(tokensRaw, 10) || 0) : 0
      const iq = iqRaw ? (parseInt(iqRaw, 10) || 0) : 0
      const upgrades = sanitizeUpgrades(upgradesRaw ? JSON.parse(upgradesRaw) : {})
      const iqUpgrades = sanitizeIQUpgrades(iqUpRaw ? JSON.parse(iqUpRaw) : {})
      const lastSeen = lastSeenRaw ? (parseInt(lastSeenRaw, 10) || Date.now()) : Date.now()
      const tecRaw = localStorage.getItem('galaxy.totalEverCollected')
      const totalEverCollected = tecRaw ? (parseInt(tecRaw, 10) || 0) : 0
      const dragAndDropEnabled = dragDropRaw ? (dragDropRaw === 'true') : true
      persisted.current = { tokens, iq, upgrades, iqUpgrades, lastSeen, totalEverCollected, dragAndDropEnabled }
      setUiState({ tokens, iq, upgrades, iqUpgrades, dragAndDropEnabled })
      // Restore cores
      const coreDataRaw = localStorage.getItem('galaxy.coreData')
      if (coreDataRaw) {
        try {
          const arr = JSON.parse(coreDataRaw)
          if (Array.isArray(arr)) {
            clusters.current = []
            for (const item of arr) {
              const level = Math.max(1, Math.min(5, parseInt(item.level, 10) || 1))
              const stackCount = Math.max(1, parseInt(item.stackCount, 10) || 1)
              const x = SPAWN_MARGIN + Math.random() * Math.max(0, worldW.current - SPAWN_MARGIN * 2)
              const y = Math.max(TOP_EXCLUDE, SPAWN_MARGIN + Math.random() * Math.max(0, worldH.current - SPAWN_MARGIN * 2 - TOP_EXCLUDE))
              clusters.current.push({
                id: clusters.current.length,
                x, y,
                level,
                progress: 0,
                members: 0,
                radius: 5 + level * 2,
                emitTimer: 0,
                flashT: 0,
                webIndices: [],
                colorIndex: LEVEL_COLOR_INDEX[level - 1] || LEVEL_COLOR_INDEX[0],
                stackCount,
                isVisible: true,
                scaleMultiplier: 1.0,
              })
            }
          }
        } catch {}
      }
      // Offline trickle
      const minutes = (Date.now() - lastSeen) / 60000
      const add = computeOfflineTrickle(minutes)
      if (add > 0) {
        persisted.current.tokens += add
        setUiState(s => ({ ...s, tokens: persisted.current!.tokens }))
      }
    } catch (error) {
      console.warn('Failed to load game state from localStorage:', error)
      // Initialize with default values if localStorage fails
      persisted.current = {
        tokens: 0,
        iq: 0,
        upgrades: { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 },
        iqUpgrades: { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false },
        lastSeen: Date.now(),
        totalEverCollected: 0,
        dragAndDropEnabled: true
      }
      setUiState({
        tokens: 0,
        iq: 0,
        upgrades: { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 },
        iqUpgrades: { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false },
        dragAndDropEnabled: true
      })
    }

    // Initial spawn cooldown - reduced for immediate gameplay
    spawnCooldown.current = 1.0

    return () => {
      if (mq && onChange) {
        try { mq.removeEventListener("change", onChange) } catch { try { mq.removeListener(onChange as any) } catch {} }
      }
    }
  }, [enabled])

  // Persist periodically
  useEffect(() => {
    if (!enabled) return
    let t: number | undefined
    const write = () => {
      if (!persisted.current) return
      try {
        localStorage.setItem("galaxy.tokens", String(persisted.current.tokens))
        localStorage.setItem("galaxy.upgrades", JSON.stringify(persisted.current.upgrades))
        localStorage.setItem("galaxy.iqUpgrades", JSON.stringify(persisted.current.iqUpgrades))
        localStorage.setItem("galaxy.iq", String(persisted.current.iq))
        localStorage.setItem("galaxy.lastSeen", String(Date.now()))
        localStorage.setItem("galaxy.totalEverCollected", String(persisted.current.totalEverCollected || 0))
        // Save coreData for restore-on-load
        const coreData = clusters.current.map(c => ({ level: c.level, x: c.x, y: c.y, stackCount: c.stackCount || 1 }))
        localStorage.setItem("galaxy.coreData", JSON.stringify(coreData))
      } catch (error) {
        console.warn('Failed to save game state to localStorage:', error)
      }
      t = window.setTimeout(write, 1500)
    }
    t = window.setTimeout(write, 1500)
    const onUnload = () => {
      try {
        if (persisted.current) {
          localStorage.setItem("galaxy.tokens", String(persisted.current.tokens))
          localStorage.setItem("galaxy.upgrades", JSON.stringify(persisted.current.upgrades))
          localStorage.setItem("galaxy.iqUpgrades", JSON.stringify(persisted.current.iqUpgrades))
          localStorage.setItem("galaxy.iq", String(persisted.current.iq))
          localStorage.setItem("galaxy.lastSeen", String(Date.now()))
          localStorage.setItem("galaxy.totalEverCollected", String(persisted.current.totalEverCollected || 0))
          const coreData = clusters.current.map(c => ({ level: c.level, x: c.x, y: c.y, stackCount: c.stackCount || 1 }))
          localStorage.setItem("galaxy.coreData", JSON.stringify(coreData))
        }
      } catch (error) {
        console.warn('Failed to save game state on unload:', error)
      }
    }
    window.addEventListener("beforeunload", onUnload)
    return () => {
      if (t) window.clearTimeout(t)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [enabled])

  // Fixed timestep game loop - simulation independent of render FPS
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let frameCount = 0
    let lastFpsUpdate = performance.now()

    lastTick.current = performance.now()
    lastSimulationTime.current = performance.now()

    const step = () => {
      const now = performance.now()

      // Ensure game is initialized before any simulation/rendering
      if (!worldW.current || !worldH.current || !points.current.length || !persisted.current) {
        raf = requestAnimationFrame(step)
        return
      }

      // Throttle rendering to target FPS and pause when page not visible
      const elapsedSinceLast = now - lastFrameMs.current
      if (!pageVisible.current || elapsedSinceLast < frameBudgetMs.current) {
        raf = requestAnimationFrame(step)
        return
      }
      lastFrameMs.current = now

      // Performance monitoring (render FPS)
      frameCount++
      if (now - lastFpsUpdate >= 1000) {
        currentFps.current = frameCount
        frameCount = 0
        lastFpsUpdate = now

        // Auto-adjust for performance if render FPS drops too low
        if (currentFps.current < 20 && !reducedMotion.current) {
          reducedMotion.current = true
          console.log('Performance: Auto-enabled reduced motion due to low render FPS:', currentFps.current)
        } else if (currentFps.current > 40 && reducedMotion.current) {
          reducedMotion.current = false
          console.log('Performance: Auto-disabled reduced motion, render FPS:', currentFps.current)
        }
      }

      // Fixed timestep simulation - independent of render rate
      const frameTime = now - lastSimulationTime.current
      lastSimulationTime.current = now
      simulationAccumulator.current += Math.min(frameTime, 100) // Cap max frame time to prevent spiral

      // Run simulation steps at fixed rate (30Hz)
      while (simulationAccumulator.current >= SIMULATION_DT) {
        simulate(SIMULATION_DT / 1000) // Convert ms to seconds
        simulationAccumulator.current -= SIMULATION_DT
      }

      // Always render (but optimize if needed)
      try {
        renderAll()
      } catch (err) {
        console.warn('Render error, skipping frame:', err)
      }
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  function simulate(dt: number) {
    // Unlockable spawn/update system
    try {
      // derive cosmetics unlocked list from snapshot cache
      const cos = (snapshot as any).currentCosmetics || null
      const unlocked: string[] = Array.isArray(cos?.unlockedSprites) ? cos.unlockedSprites : ALL_SPRITE_IDS
      const lockedPool = ALL_SPRITE_IDS.filter(id => !unlocked.includes(id))

      // Update active unlockables
      if (unlockables.current.length > 0) {
        const margin = 96
        for (let i = unlockables.current.length - 1; i >= 0; i--) {
          const u = unlockables.current[i]
          // Drift speed (slowed to 1.2x)
          u.x += u.vx * dt * 1.2
          u.y += u.vy * dt * 1.2
          // advance rotation
          let rotMul = 1
          if (u.spinBoostT > 0) { rotMul += 2; u.spinBoostT = Math.max(0, u.spinBoostT - dt) }
          u.angle += u.av * dt * rotMul
          if (u.shakeT > 0) { u.shakeT = Math.max(0, u.shakeT - dt * 2) }
          // advance break anim timers
          if (u.breaking) {
            u.breakT += dt
            if (u.breakT >= u.breakTotal) {
              // remove after break finishes
              unlockables.current.splice(i, 1)
              continue
            }
          }
          if (u.x < -margin || u.x > worldW.current + margin || u.y < -margin || u.y > worldH.current + margin) {
            unlockables.current.splice(i, 1)
          }
        }
      }

      // Schedule and spawn new unlockable if none active and some remain locked
      const nowMs = performance.now()
      if (unlockables.current.length === 0 && lockedPool.length > 0) {
        if (nextUnlockSpawnAt.current === 0) {
          // reduce spawn cadence: every ~1 minute
          const minMs = 60 * 1000
          const maxMs = 60 * 1000
          nextUnlockSpawnAt.current = nowMs + (minMs + Math.random() * (maxMs - minMs))
        } else if (nowMs >= nextUnlockSpawnAt.current) {
          const spriteId = lockedPool[(Math.random() * lockedPool.length) | 0]
          const edge = (Math.random() * 4) | 0 // 0=left,1=top,2=right,3=bottom
          const speed = 40
          let x = 0, y = 0, vx = 0, vy = 0
          if (edge === 0) { x = -60; y = Math.random() * worldH.current; vx = speed; vy = (Math.random() - 0.5) * 10 }
          else if (edge === 2) { x = worldW.current + 60; y = Math.random() * worldH.current; vx = -speed; vy = (Math.random() - 0.5) * 10 }
          else if (edge === 1) { y = -60; x = Math.random() * worldW.current; vy = speed; vx = (Math.random() - 0.5) * 10 }
          else { y = worldH.current + 60; x = Math.random() * worldW.current; vy = -speed; vx = (Math.random() - 0.5) * 10 }
          const l5DotRadius = (5 + 5 * 2)
          const size = l5DotRadius * 8
          // random angular velocity in radians/sec; keep gentle spin
          const av = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1)
          const seed = Math.random()
          unlockables.current.push({ id: spriteId, x, y, vx, vy, size, clicks: 0, clicksRequired: 10, angle: 0, av, shakeT: 0, spinBoostT: 0, seed, crackP: 0, breaking: false, breakT: 0, breakTotal: 0.3 })
          // schedule next spawn ~1 minute
          const minMs = 60 * 1000
          const maxMs = 60 * 1000
          nextUnlockSpawnAt.current = nowMs + (minMs + Math.random() * (maxMs - minMs))
        }
      }
    } catch {}
    // Drift and wrap
    const W = worldW.current
    const H = worldH.current

    // Update star rotation time for ambient point sync (lightweight)
    starRotationTime.current += dt * 0.1 // Slow rotation sync with stars

    // Update orbital movement if enabled
    if (orbitalMode) {
      updateOrbitalMovement(dt)
    }

    // Update core animations
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]

      // Update level up animation
      if (c.levelUpAnimT !== undefined) {
        c.levelUpAnimT -= dt
        if (c.levelUpAnimT <= 0) {
          c.levelUpAnimT = undefined
          c.scaleMultiplier = 1.0
        } else {
          const progress = 1 - (c.levelUpAnimT / 0.8) // 0.8s animation
          c.scaleMultiplier = 1.0 + easeOutBack(progress) * 0.5
        }
      }

      // Update data collection animation
      if (c.collectAnimT !== undefined) {
        c.collectAnimT -= dt
        if (c.collectAnimT <= 0) {
          c.collectAnimT = undefined
        }
      }

      // Ensure scale multiplier exists
      if (c.scaleMultiplier === undefined) {
        c.scaleMultiplier = 1.0
      }
    }

    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      p.age += dt

      // Safety check: Clean up stuck drag states
      if (p.isDragging && !dragStateRef.current) {
        console.warn('🔧 Cleaning up stuck drag state for point', i)
        p.isDragging = false
        p.dragOffsetX = undefined
        p.dragOffsetY = undefined
        p.wobbleT = undefined
        p.wobbleStrength = undefined
        // Also reset any capture state that might be stuck
        p.captureT = undefined
        p.targetCluster = undefined
      }
      // gentle drift for ambient and outliers (velocities are px/sec)
      if (p.state === "ambient" || p.state === "outlier") {
        p.x += p.vx * dt
        p.y += p.vy * dt

        // Lightweight star rotation sync for ambient points only (not performance critical)
        if (p.state === "ambient" && p.rotationOffset !== undefined && !lowQualityMode.current) {
          const rotationRadius = 1.0 // Slightly increased for more visible effect
          const rotationAngle = starRotationTime.current + p.rotationOffset
          p.x += Math.cos(rotationAngle) * rotationRadius * dt
          p.y += Math.sin(rotationAngle) * rotationRadius * dt
        }

        // Black hole swirl for ambient points based on peak total core count (clockwise)
        // Coverage: gradually increase the fraction of ambient points affected from 0 at 10 cores
        // to 100% at 200 peak cores. Speed still ramps from 10 -> 1010 and remains 10x slower overall.
        if (p.state === "ambient" && !reducedMotion.current) {
          // Maintain a consistent central clear zone across devices
          {
            // Compute clear radius in virtual units and apply using screen coordinates
            const w = worldW.current, h = worldH.current
            const z = zoomRef.current || 1
            const cx = w * 0.5
            const cy = h * 0.5
            const dx = p.x - cx
            const dy = p.y - cy
            const r = Math.sqrt(dx * dx + dy * dy) + 1e-6
            const clearR_vu = 180 // fixed hole radius in virtual units
            const clearR_px = clearR_vu * z
            if (r < clearR_px) {
              const push = Math.max(60, (clearR_px - r) * 1.3)
              const ux = dx / r, uy = dy / r
              p.x += ux * push * dt
              p.y += uy * push * dt
            }
          }
          const peak = maxTotalCores.current
          // Fraction of ambient affected by swirl: 0 -> 200 cores maps to 0 -> 1
          const coverage = Math.max(0, Math.min(1, peak / 200))
          // Speed ramp based on peak: 0 -> 1010 cores maps to 0 -> 1
          const s = Math.max(0, Math.min(1, peak / 1010))
          if (coverage > 0 && s > 0) {
            // Deterministic eligibility per point using rotationOffset (or id fallback)
            const twoPi = Math.PI * 2
            const seed = (p.rotationOffset !== undefined)
              ? Math.max(0, Math.min(1, (p.rotationOffset % twoPi) / twoPi))
              : ((p.id & 1023) / 1023)
            if (seed <= coverage) {
              const cx = worldW.current * 0.5
              const cy = worldH.current * 0.5
              const dx = p.x - cx
              const dy = p.y - cy
              const r = Math.sqrt(dx*dx + dy*dy) + 1e-3
              // Tangent vector for clockwise rotation in screen space
              const tx = -dy / r
              const ty =  dx / r
              // Angular speed: ramp to 125% of nominal core orbit speed
              const baseAngular = 0.6 // rad/sec nominal
              const maxAngular = baseAngular * 1.25
              const ang = baseAngular + (maxAngular - baseAngular) * s
              // Make ambient swirl 10x slower for a calmer effect
              const tangentialSpeed = ang * r * 0.1 // px/sec
              p.x += tx * tangentialSpeed * dt
              p.y += ty * tangentialSpeed * dt
            }
          }
        }
      }
      if (p.state === "ambient" || p.state === "clustered") {
        // clustered moves with rigid orbit around moving core
        if (p.state === "clustered" && p.clusterId != null) {
          const c = clusters.current[p.clusterId]
          if (!c) {
            // Core no longer exists; fallback to ambient to avoid crashes
            p.state = 'ambient'
            p.clusterId = undefined
            p.alpha = Math.random() * 0.3 + 0.18
            continue
          }

          // Use rigid orbital mathematics instead of physics-based movement
          const z = zoomRef.current || 1
          const rvu = (p as any).orbitRvu
          const targetR = (rvu != null ? rvu * z : (p.orbitR ?? 34))
          p.orbitPhase = (p.orbitPhase ?? 0) + dt * (0.6 + (p.id % 3) * 0.1) // Slower orbit

          // Calculate ideal orbital position relative to core
          const orbitAngle = p.orbitPhase
          const idealX = c.x + Math.cos(orbitAngle) * targetR
          const idealY = c.y + Math.sin(orbitAngle) * targetR

          // Move directly to ideal position with slight smoothing
          const smoothing = 0.85 // Higher = more rigid following
          p.x = p.x * (1 - smoothing) + idealX * smoothing
          p.y = p.y * (1 - smoothing) + idealY * smoothing

          p.alpha = clamp(p.alpha + 0.2 * dt, 0.18, 0.9)
        }
        // wrap with padding for non-outliers
        if (p.state !== ('outlier' as PointState)) {
          if (p.x < -WRAP_PAD) p.x = W + WRAP_PAD
          else if (p.x > W + WRAP_PAD) p.x = -WRAP_PAD
        }
        if (p.y < -WRAP_PAD) p.y = H + WRAP_PAD
        else if (p.y > H + WRAP_PAD) p.y = -WRAP_PAD
      }
    }

    // Outliers: despawn off-screen; Capturing: animate toward core then finalize
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === 'outlier') {
        if (p.x < -EDGE_SPAWN_PAD - 4 || p.x > W + EDGE_SPAWN_PAD + 4) {
          p.state = 'ambient'
          p.alpha = Math.random() * 0.3 + 0.18
          p.vx = rand(-0.05, 0.05)
          p.vy = rand(-0.05, 0.05)
          p.x = SPAWN_MARGIN + Math.random() * Math.max(0, W - SPAWN_MARGIN * 2)
          p.y = Math.max(TOP_EXCLUDE, SPAWN_MARGIN + Math.random() * Math.max(0, H - SPAWN_MARGIN * 2 - TOP_EXCLUDE))
          p.rotationOffset = Math.random() * Math.PI * 2 // Reset rotation offset
        }
      } else if (p.state === 'capturing' && p.targetCluster != null) {
        // Handle drag state - if being dragged, follow mouse instead of moving to core
        if (p.isDragging && dragStateRef.current) {
          // dragOffsetX/Y stores: mouse_world - point_world
          // So: point_world = mouse_world - offset
          // dragStateRef.current.worldX/Y now store actual world coordinates
          const oldX = p.x
          const oldY = p.y
          p.x = dragStateRef.current.worldX - (p.dragOffsetX || 0)
          p.y = dragStateRef.current.worldY - (p.dragOffsetY || 0)
          console.log('🎯 DRAG UPDATE: Mouse world (', dragStateRef.current.worldX.toFixed(1), dragStateRef.current.worldY.toFixed(1), ') point moved from (', oldX.toFixed(1), oldY.toFixed(1), ') to (', p.x.toFixed(1), p.y.toFixed(1), ')')
        } else {
          // Enhanced capture animation with orbit pull effect
        const c = clusters.current[p.targetCluster]
        const dx = c.x - p.x
        const dy = c.y - p.y
        const dist = Math.hypot(dx, dy)

          // Smooth speed based on distance - faster when far, slower when close
          const speedFactor = Math.min(1, dist / 50) // Max speed when far, slow down when close
          
          // Enhanced capture speed: 25% faster base, scaling to 75% faster at 1000+ cores
          const coreCount = clusters.current.length
          const coreSpeedMultiplier = 1.25 + (Math.min(coreCount, 1000) / 1000) * 0.5 // 1.25x to 1.75x based on cores
          const spd = (200 + (dist * 2)) * coreSpeedMultiplier // Base speed + distance-based acceleration + core scaling
        const nx = dx / (dist || 1)
        const ny = dy / (dist || 1)

          // Enhanced orbit pull effect - stronger clockwise spiral toward center
          let orbitVx = 0, orbitVy = 0
          if (dist > 10) { // Apply orbital effect from farther away
            // Calculate tangential velocity for clockwise orbital motion around the core
            const tangentX = -ny // Perpendicular to direction to core (clockwise)
            const tangentY = nx

            // Stronger orbital speed that increases with distance for dramatic arcs
            const orbitSpeed = Math.min(120, dist * 1.2 + 30) * coreSpeedMultiplier // Much stronger orbital pull + core scaling
            const orbitFactor = Math.max(0.3, Math.min(1, dist / 150)) // Full strength at medium distances

            orbitVx = tangentX * orbitSpeed * orbitFactor * speedFactor
            orbitVy = tangentY * orbitSpeed * orbitFactor * speedFactor

            // Add slight inward spiral component for more dramatic effect
            const spiralStrength = Math.min(40, dist * 0.3) * coreSpeedMultiplier
            orbitVx += nx * spiralStrength * orbitFactor
            orbitVy += ny * spiralStrength * orbitFactor
          }

          // Enhanced velocity-based physics with slower decay
          if (p.initialVx !== undefined && p.initialVy !== undefined) {
            // Combine initial momentum with orbital pull
            const momentumFactor = Math.max(0, 1 - (dist / 200)) // Momentum fades more slowly over longer distance
            const momentumScale = Math.max(0.2, momentumFactor) // Minimum momentum retention

            orbitVx += p.initialVx * momentumScale
            orbitVy += p.initialVy * momentumScale

            // Much slower velocity decay (2-3 seconds instead of 0.5)
            const decayRate = dt * 0.5 // Half the previous decay rate
            p.initialVx *= (1 - decayRate)
            p.initialVy *= (1 - decayRate)

            // Clear when velocity becomes negligible
            if (Math.abs(p.initialVx) < 5) p.initialVx = undefined
            if (Math.abs(p.initialVy) < 5) p.initialVy = undefined
          }

          // Enhanced distance-based speed for more dramatic pull
          const distanceMultiplier = 1 + (dist / 100) * 0.5 // Points farther away move faster
          const finalSpeedFactor = speedFactor * distanceMultiplier

          p.x += (nx * spd + orbitVx) * finalSpeedFactor * dt
          p.y += (ny * spd + orbitVy) * finalSpeedFactor * dt
        }

        // Update rotation for visual effects
        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
          p.rotation += p.rotationSpeed * dt
        }

        // Enhanced wobble effect during drag
        if (p.isDragging && p.wobbleT !== undefined) {
          p.wobbleT += dt * 6 // Faster wobble frequency for more noticeable effect
          if (p.wobbleT > Math.PI * 2) p.wobbleT -= Math.PI * 2 // Keep it cycling
        }

        // Velocity cooldown system - apply momentum physics before orbital pull
        if (p.velocityCooldownT && p.velocityCooldownT > 0) {
          p.velocityCooldownT -= dt
          
          // Apply momentum physics during cooldown
          if (p.initialVx !== undefined && p.initialVy !== undefined) {
            // Apply velocity with gradual decay
            p.x += p.initialVx * dt
            p.y += p.initialVy * dt
            
            // Add orbital pull toward target core during velocity cooldown for faster absorption
            if (p.targetCluster !== null && p.targetCluster !== undefined) {
              const c = clusters.current[p.targetCluster]
              if (c) {
                const dx = c.x - p.x
                const dy = c.y - p.y
                const dist = Math.hypot(dx, dy)
                
                if (dist > 5) { // Only apply if not too close
                  // Calculate orbital pull with core count scaling
                  const coreCount = clusters.current.length
                  const coreSpeedMultiplier = 1.25 + (Math.min(coreCount, 1000) / 1000) * 0.5
                  
                  // Apply gentle pull toward core (weaker than full capture)
                  const pullStrength = 50 * coreSpeedMultiplier * dt // Gentle but noticeable pull
                  const nx = dx / (dist || 1)
                  const ny = dy / (dist || 1)
                  
                  p.x += nx * pullStrength
                  p.y += ny * pullStrength
                  
                  // Add slight orbital motion for more dynamic movement
                  const tangentX = -ny * 20 * coreSpeedMultiplier * dt
                  const tangentY = nx * 20 * coreSpeedMultiplier * dt
                  
                  p.x += tangentX
                  p.y += tangentY
                }
              }
            }
            
            // Decay velocity over time (slower decay for floatier feel)
            p.initialVx *= (1 - dt * 0.3) // Slower decay than before
            p.initialVy *= (1 - dt * 0.3)
            
            // Clear very small velocities to prevent infinite tiny movement
            if (Math.abs(p.initialVx) < 0.5) p.initialVx = 0
            if (Math.abs(p.initialVy) < 0.5) p.initialVy = 0
            
            // If velocity is essentially zero, end cooldown early
            if (Math.abs(p.initialVx) < 0.1 && Math.abs(p.initialVy) < 0.1) {
              p.velocityCooldownT = 0
              p.initialVx = 0
              p.initialVy = 0
            }
          } else {
            // If cooldown exists but no velocity, clear it immediately
            p.velocityCooldownT = 0
          }
          
          // Continue to next point - don't return early, just skip capture logic
        } else {
          // Only count down capture timer if not being dragged and cooldown has ended
          if (!p.isDragging) {
            p.captureT = (p.captureT || 0.4) - dt
          }
        }

        // Only attempt capture if velocity cooldown has ended
        if ((!p.velocityCooldownT || p.velocityCooldownT <= 0) && ((p.captureT && p.captureT <= 0) || (!p.isDragging && p.targetCluster != null && Math.hypot(clusters.current[p.targetCluster].x - p.x, clusters.current[p.targetCluster].y - p.y) < 8))) {
          p.state = 'clustered'
          p.clusterId = p.targetCluster
          p.alpha = 0.6
          // Assign orbit radius in virtual units based on target core level
          try {
            const tc = (p.targetCluster != null) ? clusters.current[p.targetCluster] : undefined
            const lvl = tc ? Math.max(1, Math.min(5, tc.level)) : 1
            const base = [22, 26, 30, 34, 38][lvl - 1]
            const span = [8, 8, 8, 8, 10][lvl - 1]
            ;(p as any).orbitRvu = base + Math.random() * span
          } catch { (p as any).orbitRvu = 28 + Math.random() * 10 }
          p.orbitPhase = Math.random() * Math.PI * 2
          const c2 = clusters.current[p.targetCluster]
          c2.members += 1
          c2.progress += 1
          if (persisted.current) {
            persisted.current.totalEverCollected = (persisted.current.totalEverCollected || 0) + 1
          }

          // Trigger collection animation
          c2.collectAnimT = 0.3 // Short collection pulse
          const web = c2.webIndices
          const idx = p.id
          if (web.length < 12) web.push(idx)
          else if (Math.random() < 0.35) web[(Math.random() * web.length) | 0] = idx
          if (c2.progress >= 10) {
            c2.progress -= 10
            if (c2.level < 5) {
              // Trigger level up animation before changing level
              c2.levelUpAnimT = 0.8 // 0.8 second animation
              c2.scaleMultiplier = 1.0

              consumeMembers(p.targetCluster, 10)
              c2.level += 1
              c2.colorIndex = LEVEL_COLOR_INDEX[c2.level - 1]
              c2.flashT = GLOW_MS / 1000

              // first time any core reaches level 2: notify to hide panels
              if (c2.level >= 2 && !firstL2Notified.current) {
                firstL2Notified.current = true
                try { window.dispatchEvent(new CustomEvent("galaxy-effect", { detail: { name: "l2-reached", t: Date.now() } })) } catch {}
              }
              // first time any core reaches level 5: notify
              if (c2.level >= 5 && !firstMaxNotified.current) {
                firstMaxNotified.current = true
                try { window.dispatchEvent(new CustomEvent("galaxy-effect", { detail: { name: "first-max", t: Date.now() } })) } catch {}
              }
            } else {
              // Trigger split animation before splitting
              c2.levelUpAnimT = 1.0 // Longer animation for splitting
              c2.scaleMultiplier = 1.0

              consumeMembers(p.targetCluster, 10)
              if (persisted.current) {
                persisted.current.iq = (persisted.current.iq || 0) + 1
                setUiState(s => ({ ...s, iq: persisted.current!.iq }))
              }
              splitCore(p.targetCluster)
            }
          }
          p.targetCluster = undefined
          p.captureT = undefined
          p.isDragging = false
          p.dragOffsetX = undefined
          p.dragOffsetY = undefined
        }
      }

      // Update click animation
      if (p.clickAnimT && p.clickAnimT > 0) {
        p.clickAnimT -= dt * 4 // Animation lasts ~0.25 seconds
        if (p.clickAnimT <= 0) {
          p.clickAnimT = undefined
          p.clickRot = undefined
          p.clickOffsetX = undefined
          p.clickOffsetY = undefined
        }
      }
    }

    // Update clustered canvases (two-canvas system)
    updateClusteredCanvases(dt)

    // Update ambient fade states for smooth culling
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === 'ambient') {
        // Initialize fade state if not set
        if (!p.fadeState) {
          p.fadeState = 'visible'
          p.fadeProgress = 1.0
        }
        
        // Update fade progress
        if (p.fadeState === 'fadeOut') {
          p.fadeProgress = Math.max(0, p.fadeProgress! - dt * 2) // Fade out over 0.5 seconds
          if (p.fadeProgress <= 0) {
            p.fadeState = 'hidden'
          }
        } else if (p.fadeState === 'fadeIn') {
          p.fadeProgress = Math.min(1, p.fadeProgress! + dt * 2) // Fade in over 0.5 seconds
          if (p.fadeProgress >= 1) {
            p.fadeState = 'visible'
          }
        }
      }
    }

    // Outlier spawn: rate + quantity
    const currentOutliers = points.current.reduce((n, p) => n + (p.state === "outlier" ? 1 : 0), 0)
    spawnCooldown.current -= dt
    if (spawnCooldown.current <= 0) {
      // Use persisted upgrades for consistent values
      const upgrades = persisted.current?.upgrades || { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 }
      const spawnRateBoost = 1 + (upgrades.spawnRate || 0) * 0.2
      const baseInterval = Math.max(2.5, BASE_SPAWN / spawnRateBoost)
      const qty = Math.min(5, 1 + (upgrades.spawnQty || 0))
      const toSpawn = Math.min(qty, Math.max(0, 10 - currentOutliers))
      for (let s = 0; s < toSpawn; s++) {
        let p: any = null
        const idx = findAmbientIndex()
        if (idx !== -1) {
          p = points.current[idx]
          } else {
          // Fallback: create a new point to ensure outliers always spawn
          const newId = points.current.length
          p = {
            id: newId,
            x: 0, y: 0, vx: 0, vy: 0,
            alpha: 1,
            state: 'outlier' as const,
            age: 0,
            rotationOffset: Math.random() * Math.PI * 2,
            clusterId: undefined,
            targetCluster: undefined,
            captureT: undefined,
          }
          points.current.push(p)
        }
        // Initialize as outlier at screen edge
        p.state = 'outlier'
        p.alpha = 1.0
        const fromLeft = Math.random() < 0.5
        p.x = fromLeft ? -EDGE_SPAWN_PAD : W + EDGE_SPAWN_PAD
        p.y = Math.max(TOP_EXCLUDE + 10, SPAWN_MARGIN + Math.random() * Math.max(0, H - SPAWN_MARGIN * 2 - TOP_EXCLUDE))
        const baseV = 75 + Math.random() * 25
        p.vx = fromLeft ? baseV : -baseV
            p.vy = rand(-15, 15)
      }
      spawnCooldown.current = rand(baseInterval * 0.6, baseInterval * 1.4)
    }

    // Core passive income per second (account for stacked cores)
    let tokenDelta = 0
    const computeMult = Math.pow(2, (persisted.current?.iqUpgrades.computeMult ?? 0))
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]
      c.emitTimer += dt
      while (c.emitTimer >= 1.0) {
        c.emitTimer -= 1.0
        const lvlIdx = Math.min(4, Math.max(0, c.level - 1))
        const stackMultiplier = c.stackCount || 1
        tokenDelta += LEVEL_RATE[lvlIdx] * computeMult * stackMultiplier
      }
    }

    // Auto-collect IQ upgrade
    const autoLvl = persisted.current?.iqUpgrades.autoCollect ?? 0
    if (autoLvl > 0) {
      autoAcc.current += dt
      const interval = 5 / Math.pow(2, autoLvl) // 5s halved per level
      if (autoAcc.current >= interval) {
        autoAcc.current -= interval
        // Collect one outlier if any
        for (let i = 0; i < points.current.length; i++) {
          if (points.current[i].state === 'outlier') {
            convertOutlier(i)
            const upgrades = persisted.current?.upgrades || { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 }
            tokenDelta += CLICK_BASE + (upgrades.clickYield || 0)
            break
          }
        }
      }
    }
    if (tokenDelta && persisted.current) {
      persisted.current.tokens += tokenDelta
      setUiState(s => ({ ...s, tokens: persisted.current!.tokens }))
    }
  }

  function findAmbientIndex(): number {
    for (let tries = 0; tries < 8; tries++) {
      const idx = (Math.random() * points.current.length) | 0
      if (points.current[idx].state === "ambient") return idx
    }
    for (let i = 0; i < points.current.length; i++) if (points.current[i].state === "ambient") return i
    return -1
  }

  function nearestCluster(x: number, y: number) {
    let best = 0
    let bd = Infinity
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]
      const dx = c.x - x
      const dy = c.y - y
      const d2 = dx * dx + dy * dy
      if (d2 < bd) { bd = d2; best = i }
    }
    return best
  }

  function nearestOutlierWithin(x: number, y: number, r: number): number {
    const r2 = r * r
    let best = -1
    let bd = r2
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state !== "outlier") continue
      const dx = p.x - x
      const dy = p.y - y
      const d2 = dx * dx + dy * dy
      if (d2 <= bd) { bd = d2; best = i }
    }
    return best
  }

  function convertOutlier(idx: number, skipAnimation: boolean = false) {
    const p = points.current[idx]
    const cIdx = nearestCluster(p.x, p.y)
    // mark as capturing to animate into core before being counted
    p.state = 'capturing'
    p.targetCluster = cIdx
    p.captureT = skipAnimation ? 0.1 : 0.4 // Shorter capture time for dragged points
    p.vx = 0
    p.vy = 0

    // Trigger click animation if not skipping (for drag drops)
    if (!skipAnimation) {
      p.clickAnimT = 1.0 // Start click animation
      p.clickRot = (Math.random() - 0.5) * 1.2 // Enhanced diagonal rotation
      p.clickOffsetX = (Math.random() - 0.5) * 8 // Enhanced position shift
      p.clickOffsetY = (Math.random() - 0.5) * 8

      // Initialize enhanced rotation for visual feedback
      if (p.rotation === undefined) {
        p.rotation = Math.random() * Math.PI * 2 // Random starting rotation
      }
      if (p.rotationSpeed === undefined) {
        p.rotationSpeed = (Math.random() - 0.5) * 6 // Stronger rotation speed ±6 rad/s
      }
    }

    // Clear drag state if it exists
    p.isDragging = false
    p.dragOffsetX = undefined
    p.dragOffsetY = undefined
    p.wobbleT = undefined
    p.wobbleStrength = undefined
  }

  function consumeMembers(cIdx: number, count: number) {
    const c = clusters.current[cIdx]
    const candidates: { i: number; d2: number }[] = []
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === "clustered" && p.clusterId === cIdx) {
        const dx = p.x - c.x
        const dy = p.y - c.y
        candidates.push({ i, d2: dx * dx + dy * dy })
      }
    }
    candidates.sort((a, b) => a.d2 - b.d2)
    const W = worldW.current, H = worldH.current
    const n = Math.min(count, candidates.length)
    for (let k = 0; k < n; k++) {
      const idx = candidates[k].i
      const p = points.current[idx]
      p.state = "ambient"
      p.clusterId = undefined
      p.alpha = Math.random() * 0.3 + 0.18
      p.vx = rand(-0.05, 0.05)
      p.vy = rand(-0.05, 0.05)
      p.x = SPAWN_MARGIN + Math.random() * Math.max(0, W - SPAWN_MARGIN * 2)
      p.y = SPAWN_MARGIN + Math.random() * Math.max(0, H - SPAWN_MARGIN * 2)
      p.rotationOffset = Math.random() * Math.PI * 2 // Reset rotation offset
      c.members = Math.max(0, c.members - 1)
    }
    if (c.webIndices.length) {
      const consumedSet = new Set<number>(candidates.slice(0, n).map(v => v.i))
      c.webIndices = c.webIndices.filter(i => !consumedSet.has(i))
    }
  }

  // Core stacking system to prevent performance issues
  function getTotalCoreCount(): number {
    return clusters.current.reduce((total, c) => total + (c.stackCount || 1), 0)
  }

  function canCreateNewCore(): boolean {
    return getTotalCoreCount() < MAX_CORES
  }

  function tryStackCore(level: number): boolean {
    // Disable stacking only in Extreme mode; otherwise use thresholds
    if (extremeMode.current) return false
    const arr = (lowQualityMode.current ? STACK_THRESHOLDS : STACK_THRESHOLDS_HIGH) || STACK_THRESHOLDS
    const perLevel = (arr && arr[Math.max(0, Math.min(4, level - 1))]) || undefined
    const threshold = perLevel ?? (level === 5 ? L5_STACK_THRESHOLD : STACK_THRESHOLD)
    const sameLevelCores = clusters.current.filter(c => c.level === level && c.isVisible !== false)
    if (sameLevelCores.length >= threshold) {
      // Prefer cores that don't have a stack yet (stackCount===1)
      const eligibleNoStack = sameLevelCores.filter(c => (c.stackCount || 1) === 1)
      const levelKey = level | 0
      if (eligibleNoStack.length > 0) {
        const idx = (stackRoundRobin.current[levelKey] || 0) % eligibleNoStack.length
        const target = eligibleNoStack[idx]
        target.stackCount = (target.stackCount || 1) + 1
        stackRoundRobin.current[levelKey] = (stackRoundRobin.current[levelKey] || 0) + 1
        return true
      }
      // Otherwise pick among the least-stacked cores (<100), round-robin ties
      const eligible = sameLevelCores.filter(c => (c.stackCount || 1) < 100)
      if (eligible.length > 0) {
        const minStack = eligible.reduce((m, c) => Math.min(m, c.stackCount || 1), Infinity)
        const least = eligible.filter(c => (c.stackCount || 1) === minStack)
        const idx = (stackRoundRobin.current[levelKey] || 0) % least.length
        const target = least[idx]
        target.stackCount = (target.stackCount || 1) + 1
        stackRoundRobin.current[levelKey] = (stackRoundRobin.current[levelKey] || 0) + 1
        return true
      }
    }
    return false
  }

  // Consolidate visible cores into stacks based on active thresholds
  function enforceStackingThresholds() {
    const arrThresholds = (lowQualityMode.current ? STACK_THRESHOLDS : STACK_THRESHOLDS_HIGH) || STACK_THRESHOLDS
    if (!arrThresholds || arrThresholds.length < 5) return

    const centerX = worldW.current * 0.5
    const centerY = worldH.current * 0.5
    const baseR = orbitalRadius.current || Math.min(worldW.current, worldH.current) * 0.3

    // For each level, compute total stacks and redistribute evenly across threshold count
    for (let level = 1; level <= 5; level++) {
      // Gather all cores of this level
      const indices: number[] = []
      let totalStacks = 0
      for (let i = 0; i < clusters.current.length; i++) {
        const c = clusters.current[i]
        if (c.level === level) {
          indices.push(i)
          totalStacks += (c.stackCount || 1)
        }
      }
      if (indices.length === 0 || totalStacks === 0) continue

      const threshold = arrThresholds[Math.max(0, Math.min(4, level - 1))] || Infinity
      const visibleCount = Math.min(threshold, totalStacks) || 1

      // Ensure we have at least visibleCount cores to show: use first N indices as targets
      const targets = indices.slice(0, Math.min(visibleCount, indices.length))
      // If not enough existing, reuse last target multiple times (rare path)
      while (targets.length < visibleCount) targets.push(indices[indices.length - 1])

      // Distribute stackCounts evenly among targets
      const baseEach = Math.floor(totalStacks / visibleCount)
      let remainder = totalStacks - baseEach * visibleCount

      // Compute even placement on ring for this level
      const levelFactor = (level - 1) * 0.08
      const radius = baseR * (0.95 + levelFactor)

      for (let t = 0; t < targets.length; t++) {
        const id = targets[t]
        const c = clusters.current[id]
        c.isVisible = true
        c.stackCount = baseEach + (remainder > 0 ? 1 : 0)
        if (remainder > 0) remainder--
        // Even angle placement
        const angle = (Math.PI * 2 * t) / visibleCount
        c.x = centerX + Math.cos(angle) * radius
        c.y = centerY + Math.sin(angle) * radius
      }

      // Hide all non-target cores of this level and zero their stacks
      const targetSet = new Set(targets)
      for (let i = 0; i < indices.length; i++) {
        const id = indices[i]
        if (!targetSet.has(id)) {
          const c = clusters.current[id]
          c.isVisible = false
          c.members = 0
          c.stackCount = 0
        }
      }

      // Reassign clustered pages to nearest target core of same level
      for (let pidx = 0; pidx < points.current.length; pidx++) {
        const p = points.current[pidx]
        if (p.state === 'clustered' && p.clusterId != null) {
          const cur = clusters.current[p.clusterId]
          if (!cur || cur.level !== level || cur.isVisible === false) {
            // find nearest target
            let bestId: number | null = null
            let bestD = Infinity
            for (let t = 0; t < targets.length; t++) {
              const id = targets[t]
              const c = clusters.current[id]
              const dx = c.x - p.x
              const dy = c.y - p.y
              const d = dx * dx + dy * dy
              if (d < bestD) { bestD = d; bestId = id }
            }
            if (bestId != null) p.clusterId = bestId
          }
        }
      }
    }

    // Recompute members based on reassigned points
    for (let i = 0; i < clusters.current.length; i++) clusters.current[i].members = 0
    for (let pidx = 0; pidx < points.current.length; pidx++) {
      const p = points.current[pidx]
      if (p.state === 'clustered' && p.clusterId != null) {
        const cid = p.clusterId
        const c = clusters.current[cid]
        if (c && c.isVisible !== false) c.members += 1
      }
    }
  }

  function splitCore(cIdx: number) {
    const c = clusters.current[cIdx]

    // Check if we can create new cores
    if (!canCreateNewCore()) {
      // Try to stack instead
      if (tryStackCore(1)) {
        return // Successfully stacked
      }
      // If can't stack either, just give IQ and don't split
      return
    }

    const nx = Math.min(Math.max(c.x + 28, SPAWN_MARGIN), worldW.current - SPAWN_MARGIN)
    const ny = c.y
    const newCluster: Cluster = {
      id: clusters.current.length,
      x: nx,
      y: ny,
      vx: 0,
      vy: 0,
      members: 0,
      radius: 10,
      emitTimer: rand(PULSE_MIN, PULSE_MAX),
      flashT: 0,
      webIndices: [],
      level: 1,
      progress: 0,
      colorIndex: LEVEL_COLOR_INDEX[0],
      stackCount: 1,
      isVisible: true,
      scaleMultiplier: 1.0,
    }
    // Reset existing core to level 1 and shift left a bit
    c.level = 1
    c.progress = 0
    c.colorIndex = LEVEL_COLOR_INDEX[0]
    c.stackCount = 1
    c.isVisible = true
    c.x = Math.max(SPAWN_MARGIN, Math.min(worldW.current - SPAWN_MARGIN, c.x - 28))
    // Reassign members to nearest of the two
    c.members = 0
    newCluster.members = 0
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === "clustered" && p.clusterId === cIdx) {
        const dL = (p.x - c.x) ** 2 + (p.y - c.y) ** 2
        const dR = (p.x - newCluster.x) ** 2 + (p.y - newCluster.y) ** 2
        if (dR < dL) {
          p.clusterId = newCluster.id
          newCluster.members += 1
        } else {
          c.members += 1
        }
      }
    }
    clusters.current.push(newCluster)
  }

  // Drawing: compose snapshot and draw to canvases
  function buildSnapshot() {
    const W = worldW.current
    const H = worldH.current
    snapshot.current.width = W
    snapshot.current.height = H
    snapshot.current.parallaxY = 0
    // Update max core total based on current clusters (counts stacked cores)
    const curTotalCores = clusters.current.reduce((total, c) => total + (c.stackCount || 1), 0)
    if (curTotalCores > maxTotalCores.current) maxTotalCores.current = curTotalCores
    let n = 0

    // Smart buffer management: Reserve space for critical elements
    const visibleCoreCount = clusters.current.filter(c => c.isVisible !== false).length
    const coreReserveCap = extremeMode.current ? GAME_CONFIG.CORE_RESERVE_CAP_EXTREME : (lowQualityMode.current ? GAME_CONFIG.CORE_RESERVE_CAP_LOW : GAME_CONFIG.CORE_RESERVE_CAP_HIGH)
    const reservedForCores = Math.min(visibleCoreCount * 2, coreReserveCap) // 2 draws per core (halo + dot)
    const reservedForOutliers = 300 // Increased from 120 for all settings
    const availableForData = Math.max(50, drawBuffer.length - reservedForCores - reservedForOutliers - 10)

    // Initialize rendering stats
    const renderStats = {
      outliers: { rendered: 0, total: 0, limit: reservedForOutliers },
      ambient: { rendered: 0, total: 0, limit: 0 },
      clustered: { rendered: 0, total: 0, limit: 0 },
      cores: { rendered: 0, total: visibleCoreCount, limit: Math.floor(reservedForCores / 2) }, // cores, not draw records
      unlockables: { rendered: 0, total: unlockables.current.length, limit: 10 },
      buffer: { used: 0, total: drawBuffer.length, available: availableForData }
    }

    const cullMargin = 50 // Extra margin for viewport culling

    // 1. PRIORITY: Unlockables (special collectible sprites)
    if (unlockables.current.length > 0) {
      for (let i = 0; i < unlockables.current.length; i++) {
        if (n >= drawBuffer.length - 6) break
        const u = unlockables.current[i]
        const rec = drawBuffer[n++]
        rec.x = u.x
        rec.y = u.y
        // Shrink to 80% visual scale
        rec.radius = Math.max(24, u.size * 0.5 * 0.8)
        rec.alpha = 0.95
        rec.color = GAME_CONFIG.LEVEL_COLOR_INDEX[4] || 9
        rec.shape = 'unlock' as any
        ;(rec as any).spriteId = u.id
        ;(rec as any).angle = u.angle
        ;(rec as any).shake = u.shakeT
        ;(rec as any).seed = u.seed
        ;(rec as any).crackP = u.crackP
        ;(rec as any).breaking = u.breaking
        ;(rec as any).breakT = u.breakT
        ;(rec as any).breakTotal = u.breakTotal
        rec.glow = 1.0
        renderStats.unlockables.rendered++
      }
    }

    // 2. PRIORITY: Outliers (flying data - highest priority for gameplay!)
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === "outlier" || p.state === 'capturing') {
        renderStats.outliers.total++
        if (n >= drawBuffer.length - reservedForCores - 5) break

        const rec = drawBuffer[n++]
        rec.x = p.x
        rec.y = p.y
        // Apply visual effects: click animation, rotation, wobble
        let renderX = p.x
        let renderY = p.y
        let renderRot = (p.rotation || 0) + (p.rotationOffset || 0)
        let renderRadius = p.state === 'capturing' ? 2.6 * 0.75 : 2.6 // 75% size when capturing

        // Apply click animation effects (read-only, animation updated in simulation)
        if (p.clickAnimT && p.clickAnimT > 0) {
          // Apply click animation - enhanced diagonal rotation and position shift
          const animProgress = 1 - p.clickAnimT // 0 to 1
          const easeOut = 1 - Math.pow(1 - animProgress, 3) // Cubic ease-out

          renderRot += (p.clickRot || 0) * easeOut * 1.5 // Enhanced rotation
          renderX += (p.clickOffsetX || 0) * easeOut
          renderY += (p.clickOffsetY || 0) * easeOut
          renderRadius *= (1 + easeOut * 0.3) // More size increase during click
        }

        // Apply drag visual effects
        if (p.isDragging) {
          renderRadius *= 1.15 // Larger when dragging

          // Apply enhanced wobble effect to show user control
          if (p.wobbleT !== undefined && p.wobbleStrength !== undefined) {
            const wobbleX = Math.sin(p.wobbleT) * p.wobbleStrength
            const wobbleY = Math.cos(p.wobbleT * 1.3) * p.wobbleStrength * 0.7 // Slightly different frequency for more organic motion
            renderX += wobbleX
            renderY += wobbleY
          }

          console.log('🎯 RENDERING dragged point at:', renderX.toFixed(1), renderY.toFixed(1), 'world coords, radius:', renderRadius.toFixed(1))
        }

        rec.x = renderX
        rec.y = renderY
        rec.radius = renderRadius
        rec.alpha = Math.max(0.9, p.alpha)
        rec.color = p.state === 'capturing' ? 10 : 4 // Custom data glow color for capturing points
        rec.shape = 'icon'
        rec.variant = p.id & 3
        // Enhanced glow for capturing points with vibrant neon green
        rec.glow = p.state === 'capturing' ? 2.0 : (1 + (p.isDragging ? 0.5 : 0.2))
        renderStats.outliers.rendered++
      }
    }

    // 3. PRIORITY: Cores (main gameplay elements)
    let coreBaseRecordsDrawn = 0 // count only halo+dot pairs against reserved core budget
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]
      if (c.isVisible === false) continue // Skip stacked/hidden cores

      // Respect reserved core budget in addition to raw buffer size
      if (coreBaseRecordsDrawn + 2 > reservedForCores) break
      if (n >= drawBuffer.length - 2) break

      const halo = drawBuffer[n++]
      halo.x = c.x
      halo.y = c.y
      const prog = Math.max(0, Math.min(10, c.progress)) / 10
      const scaleMultiplier = c.scaleMultiplier || 1.0
      // Slightly enlarge halo when core is stacked to hint at multiplicity
      const stackBoost = (c.stackCount && c.stackCount > 1) ? 1.12 : 1.0
      // Scale radius by zoom so visual sizes remain consistent across devices
      halo.radius = (16 + c.level * 4 + Math.min(12, c.members * 0.2) + (c.flashT > 0 ? 5 : 0)) * (zoomRef.current || 1) * scaleMultiplier * stackBoost
      halo.alpha = (0.02 + 0.04 * prog) * (1 + c.level * 0.3) // Brighter for higher levels
      halo.color = c.colorIndex
      halo.shape = 'halo'

      const dot = drawBuffer[n++]
      dot.x = c.x
      dot.y = c.y
      dot.radius = (5 + c.level * 2) * (zoomRef.current || 1) * scaleMultiplier
      dot.alpha = 0.98
      dot.color = c.colorIndex
      dot.shape = 'core'
      // Use variant to carry the core level (1..5) for drawing the database cylinder stacks
      dot.variant = Math.max(1, Math.min(5, c.level))
      dot.glow = prog + (scaleMultiplier - 1.0) * 0.5 // Extra glow during animation

      // Count base pair against core budget
      coreBaseRecordsDrawn += 2
      renderStats.cores.rendered += 2

      // Visualize stacked cores with multiple small offset dots arranged in up to 3 rings
      const extraStacks = Math.max(0, (c.stackCount || 1) - 1)
      if (extraStacks > 0) {
        // Cap the number of visual dots to avoid buffer pressure
        const maxVisualDots = 12
        const toDraw = Math.min(extraStacks, maxVisualDots)
        const ring1Cap = 4
        const ring2Cap = 8
        const ring3Cap = maxVisualDots
        let remaining = toDraw

        const baseRadius = dot.radius
        const ringDefs: { count: number; r: number; alpha: number }[] = []
        if (remaining > 0) {
          const c1 = Math.min(remaining, ring1Cap)
          ringDefs.push({ count: c1, r: baseRadius * 0.6, alpha: 0.4 })
          remaining -= c1
        }
        if (remaining > 0) {
          const c2 = Math.min(remaining, ring2Cap - ring1Cap)
          ringDefs.push({ count: c2, r: baseRadius * 0.8, alpha: 0.3 })
          remaining -= c2
        }
        if (remaining > 0) {
          const c3 = Math.min(remaining, ring3Cap - ring2Cap)
          ringDefs.push({ count: c3, r: baseRadius * 1.0, alpha: 0.2 })
        }

        let angleSeed = Math.random() * Math.PI * 2
        for (const ring of ringDefs) {
          for (let k = 0; k < ring.count && n < drawBuffer.length - 1; k++) {
            const angle = angleSeed + (k / ring.count) * Math.PI * 2
            const offsetX = Math.cos(angle) * ring.r
            const offsetY = Math.sin(angle) * ring.r

            const stackDot = drawBuffer[n++]
            stackDot.x = c.x + offsetX
            stackDot.y = c.y + offsetY
            stackDot.radius = baseRadius * 0.4
            stackDot.alpha = ring.alpha
            stackDot.color = c.colorIndex
            stackDot.shape = 'core'
            stackDot.variant = Math.max(1, Math.min(5, c.level))
            stackDot.glow = 0
          }
          angleSeed += 0.42 // small rotation between rings
        }
      }
    }

    // 4. PRIORITY: Clustered data (two-canvas system)
    // Always 2 canvases per core, no orbit max needed
    renderStats.clustered.limit = visibleCoreCount * 2

    // Render clustered canvases for each core
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]
      if (c.isVisible === false) continue // Skip stacked/hidden cores
      
      const canvas = getClusteredCanvas(c.id)
      
      // Canvas 1
      if (canvas.dataCount1 > 0 && n < drawBuffer.length - reservedForCores - 5) {
        // Calculate canvas center position (orbiting around core)
        const canvasX = c.x + Math.cos(canvas.angle1) * canvas.distance1
        const canvasY = c.y + Math.sin(canvas.angle1) * canvas.distance1
        
        // Viewport culling
        if (lowQualityMode.current &&
            (canvasX < -cullMargin || canvasX > W + cullMargin ||
             canvasY < -cullMargin || canvasY > H + cullMargin)) {
          // Skip this canvas
        } else {
          // Render data field centered on the core (not canvas center)
          for (let j = 0; j < canvas.dataCount1 && n < drawBuffer.length - reservedForCores - 5; j++) {
            // Create a more spread out, natural-looking field around the CORE with drag effect
            const angle = (j / canvas.dataCount1) * Math.PI * 2 + (canvas.coreId * 0.3) + canvas.angle1 * 0.5 // Rotate with orbit
            const baseRadius = 45 + Math.sin(j * 0.8) * 12 // Slightly larger base radius for more spread
            // Add drag/bounce effect - points lag behind the core's movement
            const dragOffset = Math.sin(canvas.angle1 * 2 + j * 0.5) * 8 // Dynamic bounce based on orbit position
            const orbitRadius = baseRadius + dragOffset // Combine base radius with drag effect
            const offsetX = Math.cos(angle) * orbitRadius
            const offsetY = Math.sin(angle) * orbitRadius
            
            const rec = drawBuffer[n++]
            rec.x = c.x + offsetX // Center on CORE position
            rec.y = c.y + offsetY
            rec.radius = 1.6 // Same as ambient data
            rec.alpha = 0.5 + Math.sin(j * 0.3) * 0.2 // Vary alpha for depth
            rec.color = 2 // Same as old clustered data
            rec.shape = 'icon'
            rec.variant = -1 // Mark as clustered canvas
            rec.glow = 0
            renderStats.clustered.rendered++
          }
        }
      }
      
      // Canvas 2
      if (canvas.dataCount2 > 0 && n < drawBuffer.length - reservedForCores - 5) {
        // Calculate canvas center position (orbiting around core)
        const canvasX2 = c.x + Math.cos(canvas.angle2) * canvas.distance2
        const canvasY2 = c.y + Math.sin(canvas.angle2) * canvas.distance2
        
        // Viewport culling
        if (lowQualityMode.current &&
            (canvasX2 < -cullMargin || canvasX2 > W + cullMargin ||
             canvasY2 < -cullMargin || canvasY2 > H + cullMargin)) {
          // Skip this canvas
        } else {
          // Render data field centered on the core (not canvas center)
          for (let j = 0; j < canvas.dataCount2 && n < drawBuffer.length - reservedForCores - 5; j++) {
            // Create a more spread out, natural-looking field around the CORE with drag effect
            const angle = (j / canvas.dataCount2) * Math.PI * 2 + (canvas.coreId * 0.3) + canvas.angle2 * 0.5 // Rotate with orbit
            const baseRadius = 45 + Math.sin(j * 0.8) * 12 // Slightly larger base radius for more spread
            // Add drag/bounce effect - points lag behind the core's movement
            const dragOffset = Math.sin(canvas.angle2 * 2 + j * 0.5) * 8 // Dynamic bounce based on orbit position
            const orbitRadius = baseRadius + dragOffset // Combine base radius with drag effect
            const offsetX = Math.cos(angle) * orbitRadius
            const offsetY = Math.sin(angle) * orbitRadius
            
            const rec = drawBuffer[n++]
            rec.x = c.x + offsetX // Center on CORE position
            rec.y = c.y + offsetY
            rec.radius = 1.6 // Same as ambient data
            rec.alpha = 0.5 + Math.sin(j * 0.3) * 0.2 // Vary alpha for depth
            rec.color = 2 // Same as old clustered data
            rec.shape = 'icon'
            rec.variant = -1 // Mark as clustered canvas
            rec.glow = 0
            renderStats.clustered.rendered++
          }
        }
      }
    }

    // 5. PRIORITY: Background ambient data (throttled as core total grows)
    let ambientCount = 0
      // Use the peak core total reached to determine ambient quota
      // Smooth decrease from 0 to 1000 cores (removed 200-core speedup)
      const peakAmbient = maxTotalCores.current
      const t = Math.min(peakAmbient / 1000, 1)
      const ambientFactor = 1 - (0.8 * t) // Linear decrease from 1.0 to 0.2
    // Density-aware cap: clamp ambient by viewport area to avoid clutter on mobile
    // Choose a target density (points per pixel) based on performance mode
    const area = Math.max(1, W * H)
    let targetDensity: number
    if (isMobileRef.current) {
      targetDensity = 0.00002 // Lowest setting for mobile
    } else if (extremeMode.current) {
      targetDensity = 0.00012 // Highest setting for extreme mode
    } else if (lowQualityMode.current) {
      targetDensity = 0.00002 // Lowest setting for low quality
    } else {
      targetDensity = 0.00008 // High setting for normal quality (same as current)
    }
    const densityCap = Math.floor(area * targetDensity)
    const maxAmbient = Math.max(0, Math.min(densityCap, Math.floor(availableForData * 0.6 * ambientFactor)))
    renderStats.ambient.limit = maxAmbient
    
    // First pass: determine which ambient points should be visible
    const ambientPointsToRender: Point[] = []
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === "ambient") {
        renderStats.ambient.total++
        
        // Initialize fade state if not set
        if (!p.fadeState) {
          p.fadeState = 'visible'
          p.fadeProgress = 1.0
        }
        
        // Determine if this point should be visible based on limits
        const shouldBeVisible = ambientCount < maxAmbient && 
          (!lowQualityMode.current || 
           (p.x >= -cullMargin && p.x <= W + cullMargin &&
            p.y >= -cullMargin && p.y <= H + cullMargin))
        
        // Trigger fade transitions
        if (shouldBeVisible && p.fadeState === 'hidden') {
          p.fadeState = 'fadeIn'
          p.fadeProgress = 0.0
        } else if (!shouldBeVisible && (p.fadeState === 'visible' || p.fadeState === 'fadeIn')) {
          p.fadeState = 'fadeOut'
        }
        
        // Only render if not completely hidden
        if (p.fadeState !== 'hidden') {
          ambientPointsToRender.push(p)
          if (shouldBeVisible) ambientCount++
        }
      }
    }
    
    // Second pass: render ambient points with fade alpha
    for (const p of ambientPointsToRender) {
      if (n >= drawBuffer.length - reservedForCores - 5) break

      const rec = drawBuffer[n++]
      rec.x = p.x
      rec.y = p.y
      rec.radius = 1.6
      rec.alpha = p.alpha * (p.fadeProgress || 1.0) // Apply fade progress
      rec.color = 1
      rec.shape = 'icon'
      rec.variant = -1 // Mark as ambient
      rec.glow = 0
      renderStats.ambient.rendered++
    }

    // 3. PRIORITY: Two-canvas clustered data system (max 2 renders per core)
    // Always 2 canvases per core, no orbit max needed
    renderStats.clustered.limit = visibleCoreCount * 2

    // Render clustered canvases for each core
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]
      if (c.isVisible === false) continue // Skip stacked/hidden cores
      
      const canvas = getClusteredCanvas(c.id)
      
      // Canvas 1
      if (canvas.dataCount1 > 0 && n < drawBuffer.length - reservedForCores - 5) {
        // Calculate canvas center position (orbiting around core)
        const canvasX = c.x + Math.cos(canvas.angle1) * canvas.distance1
        const canvasY = c.y + Math.sin(canvas.angle1) * canvas.distance1
        
        // Viewport culling
        if (lowQualityMode.current &&
            (canvasX < -cullMargin || canvasX > W + cullMargin ||
             canvasY < -cullMargin || canvasY > H + cullMargin)) {
          // Skip this canvas
        } else {
          // Render data field centered on the core (not canvas center)
          for (let j = 0; j < canvas.dataCount1 && n < drawBuffer.length - reservedForCores - 5; j++) {
            // Create a more spread out, natural-looking field around the CORE with drag effect
            const angle = (j / canvas.dataCount1) * Math.PI * 2 + (canvas.coreId * 0.3) + canvas.angle1 * 0.5 // Rotate with orbit
            const baseRadius = 45 + Math.sin(j * 0.8) * 12 // Slightly larger base radius for more spread
            // Add drag/bounce effect - points lag behind the core's movement
            const dragOffset = Math.sin(canvas.angle1 * 2 + j * 0.5) * 8 // Dynamic bounce based on orbit position
            const orbitRadius = baseRadius + dragOffset // Combine base radius with drag effect
            const offsetX = Math.cos(angle) * orbitRadius
            const offsetY = Math.sin(angle) * orbitRadius
            
            const rec = drawBuffer[n++]
            rec.x = c.x + offsetX // Center on CORE position
            rec.y = c.y + offsetY
            rec.radius = 1.6 // Same as ambient data
            rec.alpha = 0.5 + Math.sin(j * 0.3) * 0.2 // Vary alpha for depth
            rec.color = 2 // Same as old clustered data
            rec.shape = 'icon'
            rec.variant = -1 // Mark as clustered canvas
            rec.glow = 0
            renderStats.clustered.rendered++
          }
        }
      }
      
      // Canvas 2
      if (canvas.dataCount2 > 0 && n < drawBuffer.length - reservedForCores - 5) {
        // Calculate canvas center position (orbiting around core)
        const canvasX2 = c.x + Math.cos(canvas.angle2) * canvas.distance2
        const canvasY2 = c.y + Math.sin(canvas.angle2) * canvas.distance2
        
        // Viewport culling
        if (lowQualityMode.current &&
            (canvasX2 < -cullMargin || canvasX2 > W + cullMargin ||
             canvasY2 < -cullMargin || canvasY2 > H + cullMargin)) {
          // Skip this canvas
        } else {
          // Render data field centered on the core (not canvas center)
          for (let j = 0; j < canvas.dataCount2 && n < drawBuffer.length - reservedForCores - 5; j++) {
            // Create a more spread out, natural-looking field around the CORE with drag effect
            const angle = (j / canvas.dataCount2) * Math.PI * 2 + (canvas.coreId * 0.3) + canvas.angle2 * 0.5 // Rotate with orbit
            const baseRadius = 45 + Math.sin(j * 0.8) * 12 // Slightly larger base radius for more spread
            // Add drag/bounce effect - points lag behind the core's movement
            const dragOffset = Math.sin(canvas.angle2 * 2 + j * 0.5) * 8 // Dynamic bounce based on orbit position
            const orbitRadius = baseRadius + dragOffset // Combine base radius with drag effect
            const offsetX = Math.cos(angle) * orbitRadius
            const offsetY = Math.sin(angle) * orbitRadius
            
            const rec = drawBuffer[n++]
            rec.x = c.x + offsetX // Center on CORE position
            rec.y = c.y + offsetY
            rec.radius = 1.6 // Same as ambient data
            rec.alpha = 0.5 + Math.sin(j * 0.3) * 0.2 // Vary alpha for depth
            rec.color = 2 // Same as old clustered data
            rec.shape = 'icon'
            rec.variant = -1 // Mark as clustered canvas
            rec.glow = 0
            renderStats.clustered.rendered++
          }
        }
      }
    }

    // Core stacking system - stack same-level cores when approaching reserve cap
    if (reservedForCores >= coreReserveCap - 50) {
      const coresByLevel = new Map<number, typeof clusters.current>()
      for (const core of clusters.current) {
        if (core.isVisible !== false) {
          if (!coresByLevel.has(core.level)) {
            coresByLevel.set(core.level, [])
          }
          coresByLevel.get(core.level)!.push(core)
        }
      }
      
      // Stack cores of the same level (keep first, stack rest)
      for (const [level, cores] of coresByLevel) {
        if (cores.length > 1) {
          const primaryCore = cores[0]
          const coresToStack = cores.slice(1)
          
          for (const core of coresToStack) {
            // Stack the core
            core.isVisible = false
            primaryCore.stackCount = (primaryCore.stackCount || 1) + 1
            // Transfer members to primary core
            primaryCore.members = (primaryCore.members || 0) + (core.members || 0)
          }
        }
      }
    }


    snapshot.current.points.length = n
    // Assign references without reallocating
    for (let i = 0; i < n; i++) snapshot.current.points[i] = drawBuffer[i]

    // Update final buffer usage stats
    renderStats.buffer.used = n
    
    // Store stats in ref for API access
    renderStatsRef.current = renderStats

    // Debug logging for buffer usage (remove in production)
    if (n > drawBuffer.length * 0.9) {
      console.warn(`Render buffer nearly full: ${n}/${drawBuffer.length} (${Math.round(n/drawBuffer.length*100)}%)`)
    }
  }

  function renderAll() {
    buildSnapshot()
    // Refresh cosmetics for color mapping on each frame
    try {
      const raw = localStorage.getItem('galaxy.cosmetics')
      ;(snapshot as any).currentCosmetics = raw ? JSON.parse(raw) : null
    } catch { (snapshot as any).currentCosmetics = null }
    if (canvases.current.size === 0) return
    const snap = snapshot.current
    // Render into each registered canvas context
    canvases.current.forEach((canvas) => {
      try {
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        const cssW = canvas.clientWidth
        const cssH = canvas.clientHeight
        const needResize = canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)
        if (needResize) {
          canvas.width = Math.floor(cssW * dpr)
          canvas.height = Math.floor(cssH * dpr)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        // Clear
        ctx.clearRect(0, 0, cssW, cssH)

        // Performance optimization: Configure rendering settings
        ctx.imageSmoothingEnabled = true
        ;(ctx as any).imageSmoothingQuality = 'medium'
        ctx.globalCompositeOperation = 'source-over'

        // Web connections: faint lines from centroid to a few members (skip in low quality)
        if (!lowQualityMode.current || extremeMode.current) {
          ctx.save()
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.08
          for (let i = 0; i < clusters.current.length; i++) {
            const c = clusters.current[i]
            if (c.isVisible === false) continue
            const COLORS = getColors()
            ctx.strokeStyle = COLORS[c.colorIndex] || COLORS[0]
            const web = c.webIndices
            const maxLines = extremeMode.current ? 4 : (lowQualityMode.current ? GAME_CONFIG.WEB_MAX_LINES_LOW : GAME_CONFIG.WEB_MAX_LINES_HIGH)
            let drawn = 0
            for (let k = 0; k < web.length && drawn < maxLines; k++) {
              const p = points.current[web[k]]
              if (!p || p.state !== "clustered" || p.clusterId !== i) continue
              ctx.beginPath()
              ctx.moveTo(c.x, c.y)
              ctx.lineTo(p.x, p.y)
              ctx.stroke()
              drawn++
            }
          }
          ctx.restore()
        }
        // Draw in order; halos as circles, unlockables, cores as sprites, others as page icons
        for (let i = 0; i < snap.points.length; i++) {
          const r = snap.points[i]
          const COLORS = getColors()
          let color = COLORS[r.color] || COLORS[0]
          // Unlockables (render before halos/cores/pages)
          if ((r as any).shape === 'unlock') {
            const cx = r.x, cy = r.y
            const size = r.radius * 1.7
            const spriteId = (r as any).spriteId as string
            // draw as big tinted glyph or shape
            ctx.save()
            ctx.globalAlpha = r.alpha
            // dynamic color via special effects (prefer current special settings)
            const tSec = performance.now() * 0.001
            const shifted = applySpecialColor(5, color, tSec)
            ctx.fillStyle = shifted
            ctx.strokeStyle = shifted
            // apply rotation about center
            const ang = (r as any).angle || 0
            const shake = (r as any).shake || 0
            const seed = (r as any).seed || 0
            // position jitter on click
            if (shake > 0) {
              const t = performance.now() * 0.02
              const jx = (Math.sin(t + seed * 13.3) * 2 + Math.sin(t * 1.7 + seed * 7.9) * 1.5) * (shake * 6)
              const jy = (Math.cos(t * 1.3 + seed * 3.1) * 2 + Math.cos(t * 1.9 + seed * 11.1) * 1.2) * (shake * 6)
              ctx.translate(jx, jy)
            }
            if (ang !== 0) { ctx.translate(cx, cy); ctx.rotate(ang); ctx.translate(-cx, -cy) }
            // soft pulsing glow behind the unlockable
            {
              const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.004 + seed * 6.28)
              const glowR = size * 1.5
              const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
              grad.addColorStop(0, shifted)
              grad.addColorStop(1, shifted + '00')
              ctx.save()
              ctx.globalAlpha = 0.25 + 0.25 * pulse
              ctx.fillStyle = grad
              ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill()
              ctx.restore()
            }
            // reuse small shape render logic inline with crack overlay
            if (spriteId === 'circle' || spriteId === 'ring') {
              const radius = size * 0.5
              ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2)
              if (spriteId === 'ring') ctx.stroke(); else ctx.fill()
            } else if (spriteId === 'square') {
              const s = size * 0.9
              ctx.fillRect(cx - s/2, cy - s/2, s, s)
            } else if (spriteId === 'star') {
              const spikes = 5
              const outerR = size * 0.5
              const innerR = outerR * 0.5
              let rot = Math.PI / 2 * 3
              let x = cx, y = cy
              ctx.beginPath(); ctx.moveTo(cx, cy - outerR)
              for (let j = 0; j < spikes; j++) {
                x = cx + Math.cos(rot) * outerR; y = cy + Math.sin(rot) * outerR; ctx.lineTo(x, y); rot += Math.PI / spikes
                x = cx + Math.cos(rot) * innerR; y = cy + Math.sin(rot) * innerR; ctx.lineTo(x, y); rot += Math.PI / spikes
              }
              ctx.closePath(); ctx.fill()
            } else if (spriteId === 'triangle') {
              const r2 = size * 0.55
              ctx.beginPath(); ctx.moveTo(cx, cy - r2); ctx.lineTo(cx - r2 * 0.87, cy + r2 * 0.5); ctx.lineTo(cx + r2 * 0.87, cy + r2 * 0.5); ctx.closePath(); ctx.fill()
            } else if (spriteId === 'diamond_shape') {
              const r2 = size * 0.6
              ctx.beginPath(); ctx.moveTo(cx, cy - r2); ctx.lineTo(cx + r2, cy); ctx.lineTo(cx, cy + r2); ctx.lineTo(cx - r2, cy); ctx.closePath(); ctx.fill()
            } else if (spriteId === 'hexagon') {
              const r2 = size * 0.5
              ctx.beginPath(); for (let j = 0; j < 6; j++) { const a = (Math.PI/3)*j - Math.PI/6; const x = cx + Math.cos(a)*r2; const y = cy + Math.sin(a)*r2; if (j===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) } ctx.closePath(); ctx.fill()
            } else if (spriteId === 'plus') {
              const w = size * 0.18; const l = size * 0.5
              ctx.fillRect(cx - w/2, cy - l, w, l * 2); ctx.fillRect(cx - l, cy - w/2, l * 2, w)
            } else if (spriteId === 'pentagon') {
              const r2 = size * 0.5
              ctx.beginPath();
              for (let k = 0; k < 5; k++) { const a = (Math.PI*2*k)/5 - Math.PI/2; const x = cx + Math.cos(a)*r2; const y = cy + Math.sin(a)*r2; if (k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) }
              ctx.closePath(); ctx.fill()
            } else if (spriteId === 'octagon') {
              const r2 = size * 0.5
              ctx.beginPath();
              for (let k = 0; k < 8; k++) { const a = (Math.PI*2*k)/8 - Math.PI/8; const x = cx + Math.cos(a)*r2; const y = cy + Math.sin(a)*r2; if (k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) }
              ctx.closePath(); ctx.fill()
            } else if (spriteId === 'chevron') {
              const w = size * 0.9; const h = size * 0.6; const t = Math.max(2, size * 0.12)
              const x0 = cx - w/2; const y0 = cy - h/2
              ctx.beginPath()
              ctx.moveTo(x0, y0)
              ctx.lineTo(x0 + w*0.6, y0 + h/2)
              ctx.lineTo(x0, y0 + h)
              ctx.lineTo(x0 + t, y0 + h)
              ctx.lineTo(x0 + w*0.6 + t, y0 + h/2)
              ctx.lineTo(x0 + t, y0)
              ctx.closePath(); ctx.fill()
            } else {
              // emoji fallback
          const glyph = (SPRITE_EMOJI as any)[spriteId] || '✨'
              ctx.save()
              ctx.globalAlpha = 1
              ctx.fillStyle = '#ffffff'
              ctx.font = `${Math.max(10, size)}px serif`
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
              ctx.fillText(glyph, cx, cy)
              ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.45; ctx.fillStyle = color
              ctx.beginPath(); ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2); ctx.fill()
              ctx.restore()
            }
            // draw crack overlay proportional to crackP
            {
              const crackP = (r as any).crackP || 0
              const breaking = !!(r as any).breaking
              const breakT = (r as any).breakT || 0
              const breakTotal = (r as any).breakTotal || 0.3
              if (crackP > 0) {
                ctx.save()
                ctx.globalAlpha = Math.min(0.75, 0.25 + crackP * 0.6)
                ctx.strokeStyle = '#ffffff'
                ctx.lineWidth = Math.max(1, size * 0.03)
                // simple starburst cracks
                const rays = 6
                const baseR = size * 0.5
                for (let k = 0; k < rays; k++) {
                  const a = (Math.PI * 2 * k) / rays + (seed * 10)
                  const len = baseR * (0.3 + crackP * 0.7) * (0.6 + Math.sin(k * 1.3 + seed * 5) * 0.15)
                  ctx.beginPath()
                  ctx.moveTo(cx, cy)
                  ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
                  ctx.stroke()
                }
                ctx.restore()
              }
              if (breaking && breakT > 0) {
                // shatter fragments scaling out during break
                const t = Math.min(1, breakT / breakTotal)
                const frag = 5
                ctx.save()
                ctx.globalAlpha = 0.8 * (1 - t)
                for (let k = 0; k < frag; k++) {
                  const a = (Math.PI * 2 * k) / frag + seed * 8
                  const d = size * (0.4 + t * 1.2)
                  const fx = cx + Math.cos(a) * d
                  const fy = cy + Math.sin(a) * d
                  ctx.beginPath(); ctx.arc(fx, fy, Math.max(1.5, size * 0.08 * (1 - t)), 0, Math.PI * 2); ctx.fill()
                }
                ctx.restore()
              }
            }
            ctx.restore()
            continue
          }
          if (r.shape === 'halo') {
            // Create radial gradient for proper glowing halo effect
            const gradient = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius)
            gradient.addColorStop(0, color) // Full color at center
            gradient.addColorStop(0.3, color) // Full color for inner 30%
            gradient.addColorStop(1, color + '00') // Fully transparent at edge

            ctx.globalAlpha = r.alpha
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
            ctx.fill()
            continue
          }
          if (r.shape === 'core') {
            // Apply special effects color override per level
            const level = Math.max(1, Math.min(5, (r.variant ?? 1)))
            color = applySpecialColor(level, color, performance.now() * 0.001)
            // Determine sprite selection from cosmetics per level (segments = level)
            const cos = (snapshot as any).currentCosmetics || null
            const spriteId = (cos && Array.isArray(cos.coreSprites) && cos.coreSprites[level - 1]) ? cos.coreSprites[level - 1] : 'database'

            // If a non-database sprite is selected, render shape/emoji
            if (spriteId && spriteId !== 'database') {
            const sizeBase = r.radius * 2.6
              const sizeScale = level === 1 ? 1.18 : level === 2 ? 1.12 : level === 3 ? 1.06 : 1.0
            const size = sizeBase * sizeScale
              const cx = r.x, cy = r.y

              ctx.save()
              ctx.globalAlpha = Math.min(1, r.alpha + 0.05)
              ctx.fillStyle = color
              ctx.strokeStyle = color
              ctx.lineWidth = 2
              if (spriteId === 'circle' || spriteId === 'ring') {
                const radius = size * 0.5
                ctx.beginPath()
                ctx.arc(cx, cy, radius, 0, Math.PI * 2)
                if (spriteId === 'ring') {
                  ctx.stroke()
                } else {
                  ctx.fill()
                }
              } else if (spriteId === 'square') {
                const s = size * 0.9
                ctx.fillRect(cx - s/2, cy - s/2, s, s)
              } else if (spriteId === 'star') {
                const spikes = 5
                const outerR = size * 0.5
                const innerR = outerR * 0.5
                let rot = Math.PI / 2 * 3
                let x = cx
                let y = cy
                ctx.beginPath()
                ctx.moveTo(cx, cy - outerR)
                for (let i = 0; i < spikes; i++) {
                  x = cx + Math.cos(rot) * outerR
                  y = cy + Math.sin(rot) * outerR
                  ctx.lineTo(x, y)
                  rot += Math.PI / spikes
                  x = cx + Math.cos(rot) * innerR
                  y = cy + Math.sin(rot) * innerR
                  ctx.lineTo(x, y)
                  rot += Math.PI / spikes
                }
                ctx.lineTo(cx, cy - outerR)
                ctx.closePath()
                ctx.fill()
              } else if (spriteId === 'triangle') {
                const r2 = size * 0.55
                ctx.beginPath()
                ctx.moveTo(cx, cy - r2)
                ctx.lineTo(cx - r2 * 0.87, cy + r2 * 0.5)
                ctx.lineTo(cx + r2 * 0.87, cy + r2 * 0.5)
                ctx.closePath()
                ctx.fill()
              } else if (spriteId === 'diamond_shape') {
                const r2 = size * 0.6
                ctx.beginPath()
                ctx.moveTo(cx, cy - r2)
                ctx.lineTo(cx + r2, cy)
                ctx.lineTo(cx, cy + r2)
                ctx.lineTo(cx - r2, cy)
                ctx.closePath()
                ctx.fill()
              } else if (spriteId === 'hexagon') {
                const r2 = size * 0.5
                ctx.beginPath()
                for (let i = 0; i < 6; i++) {
                  const a = (Math.PI / 3) * i - Math.PI / 6
                  const x = cx + Math.cos(a) * r2
                  const y = cy + Math.sin(a) * r2
                  if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
                }
                ctx.closePath()
                ctx.fill()
              } else if (spriteId === 'plus') {
                const w = size * 0.2
                const l = size * 0.5
                ctx.fillRect(cx - w/2, cy - l, w, l * 2)
                ctx.fillRect(cx - l, cy - w/2, l * 2, w)
              } else if (spriteId === 'pentagon') {
                const r2 = size * 0.5
                ctx.beginPath()
                for (let i = 0; i < 5; i++) { const a = (Math.PI*2*i)/5 - Math.PI/2; const x = cx + Math.cos(a)*r2; const y = cy + Math.sin(a)*r2; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) }
                ctx.closePath(); ctx.fill()
              } else if (spriteId === 'octagon') {
                const r2 = size * 0.5
                ctx.beginPath()
                for (let i = 0; i < 8; i++) { const a = (Math.PI*2*i)/8 - Math.PI/8; const x = cx + Math.cos(a)*r2; const y = cy + Math.sin(a)*r2; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) }
                ctx.closePath(); ctx.fill()
              } else if (spriteId === 'chevron') {
                const w = size * 0.9; const h = size * 0.6; const t = Math.max(2, size * 0.12)
                const x0 = cx - w/2; const y0 = cy - h/2
                ctx.beginPath()
                ctx.moveTo(x0, y0)
                ctx.lineTo(x0 + w*0.6, y0 + h/2)
                ctx.lineTo(x0, y0 + h)
                ctx.lineTo(x0 + t, y0 + h)
                ctx.lineTo(x0 + w*0.6 + t, y0 + h/2)
                ctx.lineTo(x0 + t, y0)
                ctx.closePath(); ctx.fill()
              } else {
                // Fallback to emoji glyphs (tinted)
                const glyph = (SPRITE_EMOJI as any)[spriteId] || '✨'
                ctx.font = `${Math.max(10, size)}px serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.save()
                ctx.globalAlpha = 1
                ctx.fillStyle = '#ffffff'
                ctx.fillText(glyph, cx, cy)
                ctx.globalCompositeOperation = 'source-atop'
                ctx.globalAlpha = 0.45
                ctx.fillStyle = color
                ctx.beginPath(); ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2); ctx.fill()
                ctx.restore()
              }
              ctx.restore()
              continue
            }

              // Database cylinder icon with 1..5 segments based on variant (core level)
            // Simplified lines with curved separators; cylinder height grows with level.
            const glowFrac = Math.max(0, Math.min(1, r.glow || 0))
            const segments = Math.max(1, Math.min(5, (r.variant ?? 1)))
            // Slightly upscale early levels so L1-L3 read better; L4-5 unchanged
            const sizeBase = r.radius * 2.6
            const sizeScale = segments === 1 ? 1.18 : segments === 2 ? 1.12 : segments === 3 ? 1.06 : 1.0
            const size = sizeBase * sizeScale // base size adjusted by level
              const halfW = size * 0.55
              const segH = Math.max(2, size * 0.28) // constant per-segment height → total height scales with level
              const totalH = segH * segments
              const ellH = Math.max(2, segH * 0.8) // more pronounced curvature on caps

            // Prep transform for wobble (slight left-right rotation)
            const cx = r.x, cy = r.y
            const tnow = performance.now() * 0.001
            // Deterministic per-core phase from position
            const phase = Math.sin((cx * 0.017 + cy * 0.013) % Math.PI)
            const speed = 0.7 + (segments - 1) * 0.08
            const maxAngle = 0.07 // radians (~4 degrees)
            const angle = Math.sin(tnow * speed + phase) * maxAngle
            ctx.save()
            ctx.translate(cx, cy)
            ctx.rotate(angle)

            const left = -halfW
            const right = halfW
            const topY = -totalH / 2
            const bottomY = topY + totalH

            // Helpers for subtle banding (lighten/darken base color)
            const shade = (hex: string, p: number) => {
              // p in [-1, 1]; positive -> mix toward white, negative -> toward black
              let h = hex.startsWith('#') ? hex.slice(1) : hex
              if (h.length === 3) h = h.split('').map(c => c + c).join('')
              const r0 = parseInt(h.slice(0,2), 16)
              const g0 = parseInt(h.slice(2,4), 16)
              const b0 = parseInt(h.slice(4,6), 16)
              const mix = (c: number) => p >= 0 ? c + (255 - c) * p : c * (1 + p)
              const r1 = Math.max(0, Math.min(255, Math.round(mix(r0))))
              const g1 = Math.max(0, Math.min(255, Math.round(mix(g0))))
              const b1 = Math.max(0, Math.min(255, Math.round(mix(b0))))
              return `rgb(${r1},${g1},${b1})`
            }

            // Subtle glow halo
            if (glowFrac > 0) {
              const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, Math.max(halfW, totalH))
              grad.addColorStop(0, color)
              grad.addColorStop(1, color + '00')
              ctx.globalAlpha = 0.06 * glowFrac
              ctx.fillStyle = grad
              ctx.beginPath()
              ctx.ellipse(0, 0, halfW + 3, totalH / 2 + ellH * 0.5, 0, 0, Math.PI * 2)
              ctx.fill()
              ctx.globalAlpha = 1
            }

            // Body fill (single rect spanning all segments) with very light vertical gradient
            const bodyGrad = ctx.createLinearGradient(0, topY, 0, bottomY)
              bodyGrad.addColorStop(0, shade(color, 0.06))
              bodyGrad.addColorStop(1, shade(color, -0.06))
            ctx.fillStyle = bodyGrad
            ctx.globalAlpha = Math.min(1, r.alpha + 0.05)
            ctx.fillRect(left, topY, halfW * 2, totalH)

            // Top cap (ellipse)
            ctx.globalAlpha = Math.min(1, r.alpha + 0.1)
            ctx.beginPath()
            ctx.ellipse(0, topY, halfW, ellH * 0.6, 0, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()

            // Internal curved separators (elliptical strokes)
            ctx.globalAlpha = 0.28
            ctx.strokeStyle = 'rgba(0,0,0,0.55)'
            ctx.lineWidth = 1
            for (let s = 1; s < segments; s++) {
              const y = topY + s * segH
              ctx.beginPath()
              // Draw only the front half of the ellipse to avoid showing the back edge
              ctx.ellipse(0, y, halfW, ellH * 0.65, 0, 0, Math.PI, false)
              ctx.stroke()
            }

            // Bottom cap (ellipse)
            ctx.globalAlpha = Math.min(1, r.alpha + 0.1)
            ctx.beginPath()
            ctx.ellipse(0, bottomY, halfW, ellH * 0.6, 0, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()

            // Per-segment subtle banding and tinting based on segment index
            for (let s = 0; s < segments; s++) {
              const y0 = topY + s * segH
              const y1 = y0 + segH
              // Tint intensity: higher segments slightly lighter
              const p = 0.05 - (segments > 1 ? (s / (segments - 1)) * 0.1 : 0)
              const grad = ctx.createLinearGradient(0, y0, 0, y1)
                grad.addColorStop(0, shade(color, p + 0.03))
                grad.addColorStop(1, shade(color, p - 0.03))
              ctx.globalAlpha = 0.4
              ctx.fillStyle = grad
              ctx.fillRect(left + 1, y0 + 1, halfW * 2 - 2, segH - 2)

              // Small glowing LED on left side of each band
              const ledR = Math.max(1, Math.floor(segH * 0.18))
              const ledX = left + ledR + Math.max(1, Math.floor(size * 0.02))
              const ledY = y0 + segH * 0.5
              // Muted blue LED color for all bands (no color change)
              const ledColor = 'rgb(80,120,195)'
              // Outer glow (very subtle)
              ctx.globalAlpha = 0.14
              ctx.fillStyle = ledColor
              ctx.beginPath(); ctx.arc(ledX, ledY, ledR * 1.7, 0, Math.PI * 2); ctx.fill()
              // Inner LED
              ctx.globalAlpha = 0.6
              ctx.fillStyle = ledColor
              ctx.beginPath(); ctx.arc(ledX, ledY, Math.max(1, ledR * 0.7), 0, Math.PI * 2); ctx.fill()
              ctx.globalAlpha = 1
            }

              // Right-side subtle highlight
              ctx.globalAlpha = 0.16
              ctx.fillStyle = '#ffffff'
              const hiW = Math.max(1, Math.floor(size * 0.05))
              ctx.fillRect(right - hiW, topY + 2, Math.max(1, Math.floor(size * 0.035)), totalH - 4)
              ctx.globalAlpha = 1
              ctx.restore()
            continue
          }
          // Page icon with sharp corners + diagonal fold line + scribbles
          const dq = uiStateRef.current.upgrades.dataQuality ?? 1
          const GLOW_COLORS = { 1: "#f59e0b", 2: "#d1d5db", 3: "#facc15" }
          const GLOW = GLOW_COLORS[Math.min(3, Math.max(1, dq)) as 1|2|3]
          const w = r.radius * 5.8
          const h = r.radius * 7.6
          const x = r.x - w / 2
          const y = r.y - h / 2

          // Page-shaped glow for clickable outliers: soft fill + 3 shrinking strokes (reduced in low quality)
          if (r.glow && r.glow > 0) {
            const prevAlpha = ctx.globalAlpha
            // Soft base fill halo
            ctx.globalAlpha = 0.06 * r.glow
            ctx.fillStyle = GLOW
            ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
            // Outer strokes (reduced passes in low quality mode)
            ctx.strokeStyle = GLOW
            const maxPasses = lowQualityMode.current ? 1 : 3
            for (let pass = maxPasses; pass >= 1; pass--) {
              ctx.globalAlpha = 0.08 * r.glow * (pass / maxPasses) + 0.02 * r.glow
              ctx.lineWidth = 1 + pass
              ctx.strokeRect(x - pass, y - pass, w + pass * 2, h + pass * 2)
            }
            ctx.globalAlpha = prevAlpha
          }

          // Page base: sharp rect with subtle fill and stroke + slight offset shadow
          ctx.globalAlpha = r.alpha
          ctx.strokeStyle = "rgba(0,0,0,0.22)"
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.6, y + 0.6, w, h)
          ctx.globalAlpha = Math.min(1, r.alpha + 0.1)
          ctx.fillStyle = "rgba(255,255,255,0.05)"
          ctx.fillRect(x, y, w, h)
          ctx.globalAlpha = Math.min(1, r.alpha + 0.05)
          ctx.strokeStyle = color
          ctx.strokeRect(x, y, w, h)

          // Diagonal fold indicator (top-right); stroke only, no fill
          const fold = Math.max(2, Math.floor(w * 0.22))
          ctx.beginPath()
          ctx.moveTo(x + w - fold, y)
          ctx.lineTo(x + w, y + fold)
          ctx.globalAlpha = Math.min(1, r.alpha + 0.05)
          ctx.strokeStyle = color
          ctx.stroke()

          // Scribble lines: skip for tiny icons, background floaters, or low quality mode
          if (!lowQualityMode.current && w >= 12 && h >= 12 && (r.variant ?? 0) >= 0) {
            const padX = Math.max(2, w * 0.18)
            const padY = Math.max(2, h * 0.18)
            const lineH = Math.max(1, Math.floor(h * 0.08))
            const lines = (r.variant ?? 0) % 2 === 0 ? 4 : 3
            const vary = (r.variant ?? 0)
            ctx.lineWidth = 1
            ctx.strokeStyle = color
            ctx.globalAlpha = r.alpha
            for (let li = 0; li < lines; li++) {
              const yy = y + padY + li * (lineH + 2)
              const maxLen = Math.max(0, w - padX * 2 - 1)
              const t = (li + 1 + vary) % 5
              const len = Math.min(maxLen, w * (0.45 + 0.12 * ((t % 3))))
              ctx.beginPath()
              ctx.moveTo(x + padX, yy)
              ctx.lineTo(x + padX + len, yy)
              ctx.stroke()
            }
          }
        }
        ctx.globalAlpha = 1
      } catch (e) {
        console.warn('Canvas draw error:', e)
      }
    })
  }

  // Stabilize API identity to reduce re-renders and listener churn
  const api: GalaxyAPI = useMemo(() => ({
    getDrawSnapshot() { return snapshot.current },
    registerCanvas(canvas) {
      if (canvas) canvases.current.add(canvas)
      return () => { if (canvas) canvases.current.delete(canvas) }
    },
    getCosmeticsSettings() {
      try {
        const raw = localStorage.getItem("galaxy.cosmetics")
        if (raw) {
          const saved = JSON.parse(raw)
          // Ensure unlockedSprites exists and excludes our default-locked testing set
          const list = Array.isArray(saved?.unlockedSprites) ? saved.unlockedSprites : []
          const baseline = saved?.strictLocked ? ['database'] : ALL_SPRITE_IDS.filter(id => !DEFAULT_LOCKED_SPRITES.includes(id))
          const merged = Array.from(new Set([...(list || []), ...baseline]))
          saved.unlockedSprites = merged
          return saved
        }
      } catch {}
      // minimal fallback
      return {
        coreColors: ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"],
        ambientColors: ["#e5e7eb"],
        coreSprites: ['database','database','database','database','database'],
        // Unlock all except default-locked test sprites
        unlockedSprites: ALL_SPRITE_IDS.filter(id => !DEFAULT_LOCKED_SPRITES.includes(id)),
        specialEffects: { rgbNeon: false, customShift: false, shiftSpeed: 1.0 }
      }
    },
    setCosmeticsSettings(settings) {
      try { localStorage.setItem("galaxy.cosmetics", JSON.stringify(settings)) } catch {}
      setUiState(s => ({ ...s, cosmetics: settings as any }))
    },
    setTargetFps(fps: number) {
      const clamped = Math.max(15, Math.min(120, Math.round(fps)))
      targetFps.current = clamped
      frameBudgetMs.current = 1000 / clamped
      // Reflect in state so UI and dependents update
      try { setTargetFpsState(clamped) } catch {}
    },
    getTargetFps() { return targetFps.current },
    getCurrentFps() { return currentFps.current },
    getRenderStats() { return renderStatsRef.current },
    setExtremeMode(v: boolean) { setExtremeModeState(!!v) },
    getExtremeMode() { return extremeMode.current },
    setDragAndDropEnabled(enabled: boolean) {
      setUiState(s => ({ ...s, dragAndDropEnabled: enabled }))
      // Persist to localStorage
      try {
        localStorage.setItem("galaxy.dragAndDropEnabled", enabled.toString())
      } catch (e) {
        console.warn("Failed to save drag and drop setting:", e)
      }
    },
    getDragAndDropEnabled() { return uiState.dragAndDropEnabled },
    setPerformanceMode(v: boolean) {
      const next = !!v
      lowQualityMode.current = next
      try { setPerformanceModeState(next) } catch {}
    },
    getPerformanceMode() { return lowQualityMode.current },
    clearSaveData() {
      try {
        // Clear storage
        localStorage.removeItem('galaxy.tokens')
        localStorage.removeItem('galaxy.iq')
        localStorage.removeItem('galaxy.upgrades')
        localStorage.removeItem('galaxy.iqUpgrades')
        localStorage.removeItem('galaxy.coreData')
        localStorage.removeItem('galaxy.totalEverCollected')
        localStorage.removeItem('galaxy.dragAndDropEnabled')
        // Lock sprites except database; reset cosmetics
        const resetCosmetics = {
          coreColors: ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"],
          ambientColors: ["#e5e7eb"],
          coreSprites: ['database','database','database','database','database'],
          unlockedSprites: ['database'],
          specialEffects: { rgbNeon: false, customShift: false, shiftSpeed: 1.0 },
          strictLocked: true,
        } as any
        localStorage.setItem('galaxy.cosmetics', JSON.stringify(resetCosmetics))

        // Reset in-memory
        // Reset unlockables and timers
        unlockables.current = []
        nextUnlockSpawnAt.current = 0

        clusters.current = []
        // Add a single L1 core
        const newCluster: Cluster = {
          id: 0,
          x: 50 + Math.random() * Math.max(0, worldW.current - 100),
          y: 50 + Math.random() * Math.max(0, worldH.current - 100),
          vx: 0, vy: 0,
          members: 0,
          radius: 10,
          emitTimer: rand(PULSE_MIN, PULSE_MAX),
          flashT: 0,
          webIndices: [],
          level: 1,
          progress: 0,
          colorIndex: LEVEL_COLOR_INDEX[0] || 5,
          stackCount: 1,
          isVisible: true,
          scaleMultiplier: 1.0,
        }
        clusters.current.push(newCluster)
        // Reset all points to ambient and clear cluster references
        for (let i = 0; i < points.current.length; i++) {
          const p = points.current[i]
          p.state = 'ambient'
          p.clusterId = undefined
          p.alpha = Math.random() * 0.3 + 0.18
        }
        if (persisted.current) {
          persisted.current.tokens = 0
          persisted.current.iq = 0
          persisted.current.upgrades = { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0, dataQuality: 0 }
          persisted.current.iqUpgrades = { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false }
          persisted.current.totalEverCollected = 0
          persisted.current.dragAndDropEnabled = true
        }
        setUiState(s => ({
          ...s,
          tokens: 0,
          iq: 0,
          upgrades: { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0, dataQuality: 0 },
          iqUpgrades: { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false },
          cosmetics: resetCosmetics,
          dragAndDropEnabled: true,
        }))
        return true
      } catch (e) {
        console.warn('Failed to clear save data:', e)
        return false
      }
    },
    purchaseIQ(key) {
      if (!persisted.current) return
      // Input validation
      if (!key || typeof key !== 'string') {
        console.warn('Invalid IQ upgrade key:', key)
        return
      }
      const validKeys = ['computeMult', 'autoCollect', 'confetti', 'palette']
      if (!validKeys.includes(key)) {
        console.warn('Invalid IQ upgrade key:', key, 'Valid keys:', validKeys)
        return
      }
      let lvl = 0
      let cost = 0
      if (key === 'computeMult') {
        lvl = persisted.current.iqUpgrades.computeMult
        cost = Math.pow(2, lvl) // 1,2,4,8...
        if (persisted.current.iq < cost || lvl >= 10) return
        persisted.current.iq -= cost
        persisted.current.iqUpgrades.computeMult = lvl + 1
      } else if (key === 'autoCollect') {
        lvl = persisted.current.iqUpgrades.autoCollect
        cost = Math.pow(2, lvl)
        if (persisted.current.iq < cost) return
        persisted.current.iq -= cost
        persisted.current.iqUpgrades.autoCollect = lvl + 1
      } else if (key === 'confetti') {
        if (persisted.current.iqUpgrades.confettiUnlocked) return
        if (persisted.current.iq < 1) return
        persisted.current.iq -= 1
        persisted.current.iqUpgrades.confettiUnlocked = true
      } else if (key === 'palette') {
        if (persisted.current.iqUpgrades.paletteUnlocked) return
        if (persisted.current.iq < 1) return
        persisted.current.iq -= 1
        persisted.current.iqUpgrades.paletteUnlocked = true
      }
      setUiState(s => ({ ...s, iq: persisted.current!.iq, iqUpgrades: persisted.current!.iqUpgrades }))
    },
    clickAt(x, y) {
      if (!enabledRef.current) return

      // Check if game is properly initialized
      if (!persisted.current || !worldW.current || !worldH.current || !points.current.length) {
        console.warn('Game not ready for clicks:', {
          persistedReady: !!persisted.current,
          worldReady: !!(worldW.current && worldH.current),
          pointsReady: points.current.length > 0
        })
        return
      }

      // Input validation
      if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
        console.warn('Invalid click coordinates:', { x, y })
        return
      }
      // More lenient bounds checking - allow clicks slightly outside viewport
      if (x < -50 || y < -50 || x > worldW.current + 50 || y > worldH.current + 50) {
        console.warn('Click coordinates out of bounds:', { x, y, worldW: worldW.current, worldH: worldH.current })
        return
      }
      // Map to virtual units for unlockable tests if needed (currently hit tests are in screen px)
      // Unlockable click detection has priority
      if (unlockables.current.length > 0) {
        for (let i = unlockables.current.length - 1; i >= 0; i--) {
          const u = unlockables.current[i]
          const dx = u.x - x
          const dy = u.y - y
          const r = (u.size || 40) * 0.6
          if (dx * dx + dy * dy <= r * r) {
            u.clicks += 1
            // click feedback: brief shake and spin burst
            u.shakeT = 0.2
            u.spinBoostT = 0.25
            // increase cracking progress proportionally
            const inc = 1 / (u.clicksRequired || 10)
            u.crackP = Math.min(1, u.crackP + inc)
            // Persist unlock when threshold reached
            const cosRaw = localStorage.getItem('galaxy.cosmetics')
            let cos = null
            try { cos = cosRaw ? JSON.parse(cosRaw) : null } catch {}
            const list: string[] = Array.isArray(cos?.unlockedSprites) ? cos.unlockedSprites : []
            if (u.clicks >= u.clicksRequired && !list.includes(u.id)) {
              // initiate break animation
              u.breaking = true
              u.breakT = 0
              u.breakTotal = 0.35
              const merged = Array.from(new Set([...list, u.id]))
              const updated: any = { ...(cos || {}), unlockedSprites: merged }
              if (!Array.isArray(updated.coreColors)) updated.coreColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"]
              if (!Array.isArray(updated.ambientColors)) updated.ambientColors = ["#e5e7eb"]
              if (!Array.isArray(updated.coreSprites) || updated.coreSprites.length < 5) updated.coreSprites = ['database','database','database','database','database']
              if (!updated.specialEffects) updated.specialEffects = { rgbNeon: false, customShift: false, shiftSpeed: 1.0 }
              try { localStorage.setItem('galaxy.cosmetics', JSON.stringify(updated)) } catch {}
              ;(snapshot as any).currentCosmetics = updated
              // Immediately reflect unlocks in UI state so panel updates without refresh
              try { setUiState(s => ({ ...s, cosmetics: updated })) } catch {}
              // Fire toast event with unlocked name
              const def = ALL_SPRITES.find(s => s.id === u.id)
              const name = def?.name || u.id
              try { window.dispatchEvent(new CustomEvent('galaxy-toast', { detail: { message: `Unlocked: ${name}`, kind: 'unlock', ms: 3000 } })) } catch {}
            }
            return
          }
        }
      }

      // Force fresh outlier count calculation to avoid stale state
      let outlierCount = 0
      for (let i = 0; i < points.current.length; i++) {
        if (points.current[i].state === 'outlier') outlierCount++
      }
      const idx = nearestOutlierWithin(x, y, CLICK_RADIUS)
      if (idx !== -1) {
        convertOutlier(idx)
        const upgrades = persisted.current?.upgrades || { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 }
        let gain = CLICK_BASE + (upgrades.clickYield || 0)
        // Data Quality: bring extra outliers if available (bronze=1, silver=2, gold=3)
        const dq = Math.min(3, Math.max(1, upgrades.dataQuality || 1))
        if (dq > 1) {
          let need = dq - 1
          for (let i = 0; i < points.current.length && need > 0; i++) {
            const p = points.current[i]
            if (p.state === 'outlier') {
              convertOutlier(i)
              gain += 1
              need--
            }
          }
        }
        // Mini-Batch: +10% per level, collect ALL outliers if >1 present
        const mbLevel = upgrades.batchCollect || 0
        const chance = clamp(0.1 * mbLevel, 0, 1)
        const totalOutliers = points.current.reduce((n, p) => n + (p.state === 'outlier' ? 1 : 0), 0)
        if (totalOutliers > 1 && Math.random() < chance) {
          for (let i = 0; i < points.current.length; i++) {
            const p = points.current[i]
            if (p.state === 'outlier') {
              convertOutlier(i)
              gain += 1
            }
          }
        }
        if (persisted.current) {
          persisted.current.tokens += gain
          setUiState(s => ({ ...s, tokens: persisted.current!.tokens }))
        }
      }
    },
    purchase(key) {
      if (!persisted.current) return
      // Input validation
      if (!key || typeof key !== 'string') {
        console.warn('Invalid upgrade key:', key)
        return
      }
      if (key === 'dataQuality') {
        const lvl = persisted.current.upgrades.dataQuality ?? 0 // 0 bronze -> 1 silver -> 2 gold
        const costIQ = lvl === 0 ? 10 : 100
        if (persisted.current.iq < costIQ || lvl >= 2) return
        persisted.current.iq -= costIQ
        persisted.current.upgrades = { ...persisted.current.upgrades, dataQuality: lvl + 1 }
        setUiState(s => ({ ...s, iq: persisted.current!.iq, upgrades: persisted.current!.upgrades }))
        return
      }
      const lvl = persisted.current.upgrades[key]
      const price = upgradeCost(key, lvl)
      if (persisted.current.tokens < price) return
      persisted.current.tokens -= price
      persisted.current.upgrades = { ...persisted.current.upgrades, [key]: lvl + 1 }
      setUiState(s => ({ ...s, tokens: persisted.current!.tokens, upgrades: persisted.current!.upgrades }))
    },
    // For future: IQ purchases handled via UI calling 'galaxy-effect' or separate method
    triggerEffect(name) {
      try { window.dispatchEvent(new CustomEvent("galaxy-effect", { detail: { name, t: Date.now() } })) } catch {}
    },
    getStats() {
      const counts = [0,0,0,0,0]
      for (let i = 0; i < clusters.current.length; i++) {
        const c = clusters.current[i]
        const lvl = Math.min(5, Math.max(1, c.level))
        const stackMultiplier = c.stackCount || 1
        counts[lvl-1] += stackMultiplier // Count all stacked cores
      }
      const computeMult = Math.pow(2, (persisted.current?.iqUpgrades.computeMult ?? 0))
      let tps = 0
      for (let i = 0; i < counts.length; i++) tps += LEVEL_RATE[i] * counts[i]
      tps *= computeMult
      const totalEverCollected = persisted.current?.totalEverCollected ?? 0
      // Compute floating data as pages currently attached to cores
      let currentFloatingData = 0
      for (let i = 0; i < clusters.current.length; i++) currentFloatingData += (clusters.current[i].members || 0) * (clusters.current[i].stackCount || 1)
      return { tokensPerSec: tps, coresByLevel: counts, totalEverCollected, currentFloatingData }
    },

    // Drag and drop functionality
    startDrag(x, y) {
      if (!enabledRef.current) return false

      // Prevent starting a new drag if one is already active
      if (dragStateRef.current?.isActive) {
        console.log('🚫 Drag already active - ignoring new drag attempt')
        return false
      }

      // Use screen coordinates directly (same as click function)
      // Don't convert to world coordinates - nearestOutlierWithin expects screen coords
      const screenX = x
      const screenY = y

      // Find the nearest outlier within click radius (use larger radius for dragging)
      const dragRadius = CLICK_RADIUS * 1.5 // 72 pixels for dragging
      const idx = nearestOutlierWithin(screenX, screenY, dragRadius)

      if (idx !== -1) {
        const p = points.current[idx]
        if (p.state === 'outlier') {
          // Calculate offset BEFORE calling convertOutlier
          const mouseWorldCoords = screenToWorld(screenX, screenY)
          const dragOffsetX = mouseWorldCoords.x - p.x
          const dragOffsetY = mouseWorldCoords.y - p.y
          console.log('🎯 DRAG START: Point at world (', p.x.toFixed(1), p.y.toFixed(1), ') mouse at world (', mouseWorldCoords.x.toFixed(1), mouseWorldCoords.y.toFixed(1), ') offset (', dragOffsetX.toFixed(1), dragOffsetY.toFixed(1), ')')

          dragStateRef.current = {
            worldX: mouseWorldCoords.x,  // Store world coordinates
            worldY: mouseWorldCoords.y,
            isActive: true,
            draggedPoint: idx
          }

          // Convert to capturing state but don't trigger click animation
          convertOutlier(idx, true) // true = skip animation

          // NOW set drag properties AFTER convertOutlier (which clears them)
          p.isDragging = true
          p.dragOffsetX = dragOffsetX
          p.dragOffsetY = dragOffsetY

          // Initialize enhanced wobble effect for drag feedback
          p.wobbleT = 0 // Start wobble animation
          p.wobbleStrength = 3 + Math.random() * 3 // Stronger wobble strength 3-6 pixels

          return true
        }
      }
      return false
    },

    updateDrag(x, y) {
      if (!enabledRef.current || !dragStateRef.current?.isActive) return

      // Convert screen coordinates to world coordinates and store them
      const worldCoords = screenToWorld(x, y)
      dragStateRef.current.worldX = worldCoords.x
      dragStateRef.current.worldY = worldCoords.y

      console.log('🖱️ Mouse at screen coords:', x.toFixed(1), y.toFixed(1), '-> world:', worldCoords.x.toFixed(1), worldCoords.y.toFixed(1))
    },

    endDrag(velocityX, velocityY) {
      if (!dragStateRef.current?.isActive) {
        console.log('🚫 endDrag called but no active drag state - ignoring')
        return
      }

      console.log('🏁 endDrag called - clearing drag state')
      const draggedPointIdx = dragStateRef.current.draggedPoint
      if (draggedPointIdx !== undefined) {
        const point = points.current[draggedPointIdx]
        if (point && point.isDragging) {
          // Set final position using stored world coordinates (no double conversion needed)
          point.x = dragStateRef.current.worldX - (point.dragOffsetX || 0)
          point.y = dragStateRef.current.worldY - (point.dragOffsetY || 0)

          // Apply velocity-based physics if mouse velocity was provided
          if (velocityX !== undefined && velocityY !== undefined) {
            // Convert canvas velocity to world velocity
            const worldVelX = velocityX * zoomRef.current
            const worldVelY = velocityY * zoomRef.current

            // Apply initial momentum (scaled down for reasonable effect)
            point.initialVx = worldVelX * 0.3
            point.initialVy = worldVelY * 0.3

            console.log('🚀 Applied velocity physics:', worldVelX.toFixed(1), worldVelY.toFixed(1))
          }

          // Find the nearest core to the dropped position
          const nearestCoreIdx = nearestCluster(point.x, point.y)
          point.targetCluster = nearestCoreIdx

          // VELOCITY COOLDOWN: Allow momentum to play out before capture begins
          point.velocityCooldownT = 1.5 // 1.5 seconds of free momentum before orbital pull starts
          point.captureT = 0.4 // Normal capture time, but won't start until velocity cooldown ends

          console.log('🎯 Drag ended - point dropped at (', point.x.toFixed(1), point.y.toFixed(1), ') targeting core', nearestCoreIdx, '- VELOCITY COOLDOWN:', point.velocityCooldownT, 's')

          // Clear drag state for this point
          point.isDragging = false
          point.dragOffsetX = undefined
          point.dragOffsetY = undefined
          point.wobbleT = undefined
          point.wobbleStrength = undefined
        }
      }

      // Always clear the drag state reference
      dragStateRef.current = null
      console.log('✅ Drag state cleared')
    },

    // Debug functions for testing
    debug: {
      addTokens(amount: number) {
        if (persisted.current) {
          persisted.current.tokens += amount
          setUiState(s => ({ ...s, tokens: persisted.current!.tokens }))
        }
      },
      addIQ(amount: number) {
        if (persisted.current) {
          persisted.current.iq += amount
          setUiState(s => ({ ...s, iq: persisted.current!.iq }))
        }
      },
      addCores(levels: number[]) {
        // Add cores at specified levels [1,2,3,4,5]
        levels.forEach(level => {
          const targetLevel = Math.max(1, Math.min(5, level))

          // Try stacking first if over threshold
      if (/* getTotalCoreCount() >= MAX_CORES || */ tryStackCore(targetLevel)) {
        return // Successfully stacked or at limit
      }

          const newCluster: Cluster = {
            id: clusters.current.length,
            x: 50 + Math.random() * Math.max(0, worldW.current - 100),
            y: 50 + Math.random() * Math.max(0, worldH.current - 100),
            vx: 0,
            vy: 0,
            members: 0,
            radius: 10,
            emitTimer: rand(PULSE_MIN, PULSE_MAX),
            flashT: 0,
            webIndices: [],
            level: targetLevel,
            progress: 0,
            colorIndex: LEVEL_COLOR_INDEX[targetLevel - 1] || LEVEL_COLOR_INDEX[0],
            stackCount: 1,
            isVisible: true,
            scaleMultiplier: 1.0,
          }
          clusters.current.push(newCluster)
        })
      },
      setUpgradeLevel(upgradeKey: keyof Upgrades, level: number) {
        if (persisted.current) {
          const safeLevel = Math.max(0, level)
          persisted.current.upgrades = { ...persisted.current.upgrades, [upgradeKey]: safeLevel }
          setUiState(s => ({ ...s, upgrades: persisted.current!.upgrades }))
        }
      },
      setIQUpgradeLevel(upgradeKey: keyof NonNullable<GalaxyState['iqUpgrades']>, level: number) {
        if (persisted.current) {
          const safeLevel = Math.max(0, level)
          if (upgradeKey === 'confettiUnlocked' || upgradeKey === 'paletteUnlocked') {
            persisted.current.iqUpgrades = { ...persisted.current.iqUpgrades, [upgradeKey]: level > 0 }
          } else {
            persisted.current.iqUpgrades = { ...persisted.current.iqUpgrades, [upgradeKey]: safeLevel }
          }
          setUiState(s => ({ ...s, iqUpgrades: persisted.current!.iqUpgrades }))
        }
      },
      setExtremeMode(v: boolean) { try { setExtremeModeState(!!v) } catch {} }
    },
  }), [])

  return { state: uiState, api, parallaxY }
}





