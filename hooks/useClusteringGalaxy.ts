"use client"

import { useEffect, useMemo, useRef, useState } from "react"

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
}

export type Cluster = {
  id: number
  x: number
  y: number
  members: number
  radius: number
  emitTimer: number
  flashT: number
  webIndices: number[]
  level: number
  progress: number
  colorIndex: number
}

export type GalaxyState = {
  tokens: number
  iq: number
  upgrades: Upgrades
  iqUpgrades: { computeMult: number; autoCollect: number; confettiUnlocked: boolean; paletteUnlocked: boolean }
}

export type GalaxyAPI = {
  getDrawSnapshot(): DrawSnapshot
  registerCanvas: (canvas: HTMLCanvasElement | null) => () => void
  clickAt: (x: number, y: number) => void
  purchase: (key: keyof Upgrades) => void
  purchaseIQ: (key: 'computeMult' | 'autoCollect' | 'confetti' | 'palette') => void
  triggerEffect: (name: "confetti" | "palette") => void
  getStats: () => { tokensPerSec: number; coresByLevel: number[] }
}

export type UseClusteringGalaxyOptions = {
  enabled?: boolean
}

export function useClusteringGalaxy(opts: UseClusteringGalaxyOptions = {}) {
  const enabled = opts.enabled ?? true

  // Constants (initial balancing in BALANCING.md)
  const PASSIVE_BASE = 1
  const CLICK_BASE = 3
  const BASE_SPAWN = 6.0 // seconds base; slower because items drift across
  const OUTLIER_MAX_BASE = 1
  const OUTLIER_MAX_PER_LEVEL = 1 // allows +1 every couple levels via cap formula
  const PULSE_MIN = 5.0
  const PULSE_MAX = 9.0
  const GLOW_MS = 200
  const AMBIENT_COUNT = 400
  const CLICK_RADIUS = 22
  const WRAP_PAD = 8
  const MAX_DT = 0.05 // seconds cap
  const SPAWN_MARGIN = 28
  const TOP_EXCLUDE = 140
  const EDGE_SPAWN_PAD = 24

  const COLORS = useMemo(() => [
    // 0..n color slots; keep alpha separate in draw record
    // blues/purples on dark bg
    "#93c5fd", // light blue
    "#a78bfa", // violet
    "#818cf8", // indigo
    "#60a5fa", // blue
    "#e5e7eb", // neutral light for outliers
    "#3b82f6", // royal blue (level 2)
    "#065f46", // dark green (level 3)
    "#10b981", // bright green (level 4)
    "#22ff88", // neon green (level 5)
  ], [])
  const LEVEL_COLOR_INDEX = [0, 5, 6, 7, 8] // indices into COLORS for levels 1..5
  const LEVEL_RATE = [1, 2, 4, 6, 8] // tokens/sec for levels 1..5

  // Persisted bits
  type Persisted = { tokens: number; iq: number; upgrades: Upgrades; iqUpgrades: { computeMult: number; autoCollect: number; confettiUnlocked: boolean; paletteUnlocked: boolean }; lastSeen: number }
  const persisted = useRef<Persisted | null>(null)
  const [uiState, setUiState] = useState<GalaxyState>(() => ({
    tokens: 0,
    iq: 0,
    upgrades: { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 },
    iqUpgrades: { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false },
  }))

  // Simulation model
  const points = useRef<Point[]>([])
  const clusters = useRef<Cluster[]>([])
  const spawnCooldown = useRef<number>(1)
  const lastTick = useRef<number>(0)
  const reducedMotion = useRef<boolean>(false)
  const autoAcc = useRef<number>(0)

  // Draw snapshot (stable reference)
  const snapshot = useRef<DrawSnapshot>({ width: 0, height: 0, parallaxY: 0, points: [] })
  const drawBuffer: DrawRecord[] = useRef<DrawRecord[]>(new Array(AMBIENT_COUNT + 64).fill(0).map(() => ({ x: 0, y: 0, radius: 0, alpha: 0, color: 0, shape: 'icon', variant: 0, glow: 0 }))).current

  // Registered canvases
  const canvases = useRef<Set<HTMLCanvasElement>>(new Set())

  // Internal helpers
  function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
  function rand(min: number, max: number) { return min + Math.random() * (max - min) }
  function choice<T>(arr: T[]): T { return arr[(Math.random() * arr.length) | 0] }

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

  function computeOfflineTrickle(minutes: number) {
    const m = clamp(minutes, 0, 30)
    // Approximate using level-1 rate and current compute multiplier
    const computeMult = Math.pow(2, (persisted.current?.iqUpgrades.computeMult ?? 0))
    const perSec = 1 * computeMult * Math.max(1, clusters.current.length)
    const approx = perSec * 60 * m * 0.12
    return Math.floor(approx)
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

    // Clusters: nice anchors (normalized)
    const anchors = [
      { x: 0.50, y: 0.10 }, // Top center, above panels area (nudged up)
      { x: 0.22, y: 0.60 }, // Left mid
      { x: 0.78, y: 0.60 }, // Right mid
    ]
    clusters.current = anchors.map((a, i) => ({
      id: i,
      x: a.x * worldW.current,
      y: a.y * worldH.current,
      members: 0,
      radius: 10,
      emitTimer: rand(PULSE_MIN, PULSE_MAX),
      flashT: 0,
      webIndices: [],
      level: 1,
      progress: 0,
      colorIndex: LEVEL_COLOR_INDEX[0],
    }))

    // Ambient points
    const arr: Point[] = new Array(AMBIENT_COUNT)
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      arr[i] = {
        id: i,
        x: SPAWN_MARGIN + Math.random() * Math.max(0, worldW.current - SPAWN_MARGIN * 2),
        y: Math.max(TOP_EXCLUDE, SPAWN_MARGIN + Math.random() * Math.max(0, worldH.current - SPAWN_MARGIN * 2 - TOP_EXCLUDE)),
        vx: rand(-0.04, 0.04),
        vy: rand(-0.04, 0.04),
        state: "ambient",
        age: 0,
        alpha: rand(0.18, 0.48),
      }
    }
    points.current = arr

    // Load persistence
    try {
      const tokensRaw = localStorage.getItem("galaxy.tokens")
      const iqRaw = localStorage.getItem("galaxy.iq")
      const upgradesRaw = localStorage.getItem("galaxy.upgrades")
      const iqUpRaw = localStorage.getItem("galaxy.iqUpgrades")
      const lastSeenRaw = localStorage.getItem("galaxy.lastSeen")
      const tokens = tokensRaw ? parseInt(tokensRaw, 10) || 0 : 0
      const iq = iqRaw ? parseInt(iqRaw, 10) || 0 : 0
      const upgrades: Upgrades = upgradesRaw ? JSON.parse(upgradesRaw) : { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 }
      const iqUpgrades = iqUpRaw ? JSON.parse(iqUpRaw) : { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false }
      const lastSeen = lastSeenRaw ? parseInt(lastSeenRaw, 10) || Date.now() : Date.now()
      persisted.current = { tokens, iq, upgrades, iqUpgrades, lastSeen }
      setUiState({ tokens, iq, upgrades, iqUpgrades })
      // Offline trickle
      const minutes = (Date.now() - lastSeen) / 60000
      const add = computeOfflineTrickle(minutes)
      if (add > 0) {
        persisted.current.tokens += add
        setUiState(s => ({ ...s, tokens: persisted.current!.tokens }))
      }
    } catch { /* ignore */ }

    // Spawn cooldown
    spawnCooldown.current = BASE_SPAWN / (1 + uiState.upgrades.spawnRate * 0.15)

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
      } catch { /* ignore */ }
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
        }
      } catch { /* ignore */ }
    }
    window.addEventListener("beforeunload", onUnload)
    return () => {
      if (t) window.clearTimeout(t)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [enabled])

  // Single RAF game loop + drawing to registered canvases
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    lastTick.current = performance.now()
    const step = () => {
      const now = performance.now()
      let dt = (now - lastTick.current) / 1000
      lastTick.current = now
      if (dt > 0.25) dt = 0.25 // catch-up cap to avoid explosive physics after tab restore

      if (!reducedMotion.current) {
        simulate(Math.min(dt, MAX_DT))
      }
      renderAll()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  function simulate(dt: number) {
    // Drift and wrap
    const W = worldW.current
    const H = worldH.current

    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      p.age += dt
      // gentle drift for ambient and outliers
      if (p.state === "ambient" || p.state === "outlier") {
        p.x += p.vx
        p.y += p.vy
      }
      if (p.state === "ambient" || p.state === "clustered") {
        // clustered moves toward centroid lazily
        if (p.state === "clustered" && p.clusterId != null) {
          const c = clusters.current[p.clusterId]
          const dx = c.x - p.x
          const dy = c.y - p.y
          const dist = Math.max(0.0001, Math.hypot(dx, dy))
          const nx = dx / dist
          const ny = dy / dist
          const targetR = p.orbitR ?? 34
          // Positive when too far -> pull inward; negative when too close -> push outward
          const radialPull = (dist - targetR) * 1.4
          // Clockwise tangential vector in screen space
          const tx = ny
          const ty = -nx
          // Reduce tangential influence when far from ring, increase near ring
          const near = clamp(1 - Math.min(1, Math.abs(dist - targetR) / (targetR * 0.9)), 0, 1)
          const orbitSpeed = 8 * (0.3 + 0.7 * near)
          // Small breathing bounce
          p.orbitPhase = (p.orbitPhase ?? 0) + dt * (1.2 + (p.id % 3) * 0.25)
          const breathe = Math.sin(p.orbitPhase) * 0.8 * near
          p.x += (nx * radialPull + tx * orbitSpeed + nx * breathe) * dt
          p.y += (ny * radialPull + ty * orbitSpeed + ny * breathe) * dt
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
        }
      } else if (p.state === 'capturing' && p.targetCluster != null) {
        const c = clusters.current[p.targetCluster]
        const dx = c.x - p.x
        const dy = c.y - p.y
        const dist = Math.hypot(dx, dy)
        const spd = 260
        const nx = dx / (dist || 1)
        const ny = dy / (dist || 1)
        p.x += nx * spd * dt
        p.y += ny * spd * dt
        p.captureT = (p.captureT || 0.25) - dt
        if (p.captureT <= 0 || dist < 6) {
          p.state = 'clustered'
          p.clusterId = p.targetCluster
          p.alpha = 0.6
          p.orbitR = 32 + Math.random() * 20
          p.orbitPhase = Math.random() * Math.PI * 2
          const c2 = clusters.current[p.targetCluster]
          c2.members += 1
          c2.progress += 1
          const web = c2.webIndices
          const idx = p.id
          if (web.length < 12) web.push(idx)
          else if (Math.random() < 0.35) web[(Math.random() * web.length) | 0] = idx
          if (c2.progress >= 10) {
            c2.progress -= 10
            if (c2.level < 5) {
              consumeMembers(p.targetCluster, 10)
              c2.level += 1
              c2.colorIndex = LEVEL_COLOR_INDEX[c2.level - 1]
              c2.flashT = GLOW_MS / 1000
              // first time any core reaches level 2: notify to hide panels
              if (c2.level >= 2 && !firstL2Notified.current) {
                firstL2Notified.current = true
                try { window.dispatchEvent(new CustomEvent("galaxy-effect", { detail: { name: "l2-reached", t: Date.now() } })) } catch {}
              }
            } else {
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
        }
      }
    }

    // Outlier spawn: rate + quantity
    const currentOutliers = points.current.reduce((n, p) => n + (p.state === "outlier" ? 1 : 0), 0)
    spawnCooldown.current -= dt
    if (spawnCooldown.current <= 0) {
      const chanceBoost = 1 + uiState.upgrades.spawnRate * 0.2
      const baseInterval = Math.max(2.5, BASE_SPAWN / chanceBoost)
      const qty = Math.min(5, 1 + uiState.upgrades.spawnQty)
      const toSpawn = Math.min(qty, Math.max(0, 10 - currentOutliers))
      for (let s = 0; s < toSpawn; s++) {
        const ambientIdx = findAmbientIndex()
        if (ambientIdx !== -1) {
          const p = points.current[ambientIdx]
          p.state = "outlier"
          p.alpha = 1.0
          const fromLeft = Math.random() < 0.5
          p.x = fromLeft ? -EDGE_SPAWN_PAD : W + EDGE_SPAWN_PAD
          p.y = Math.max(TOP_EXCLUDE + 10, SPAWN_MARGIN + Math.random() * Math.max(0, H - SPAWN_MARGIN * 2 - TOP_EXCLUDE))
          const baseV = 0.4 + Math.random() * 0.3
          p.vx = fromLeft ? baseV : -baseV
          p.vy = rand(-0.1, 0.1)
        }
      }
      spawnCooldown.current = rand(baseInterval * 0.6, baseInterval * 1.4)
    }

    // Core passive income per second (no blinking)
    let tokenDelta = 0
    const computeMult = Math.pow(2, (persisted.current?.iqUpgrades.computeMult ?? 0))
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]
      c.emitTimer += dt
      while (c.emitTimer >= 1.0) {
        c.emitTimer -= 1.0
        const lvlIdx = Math.min(4, Math.max(0, c.level - 1))
        tokenDelta += LEVEL_RATE[lvlIdx] * computeMult
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
            tokenDelta += CLICK_BASE + uiState.upgrades.clickYield
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

  let firstMaxNotified = false
  function convertOutlier(idx: number) {
    const p = points.current[idx]
    const cIdx = nearestCluster(p.x, p.y)
    // mark as capturing to animate into core before being counted
    p.state = 'capturing'
    p.targetCluster = cIdx
    p.captureT = 0.3
    p.vx = 0
    p.vy = 0
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
      c.members = Math.max(0, c.members - 1)
    }
    if (c.webIndices.length) {
      const consumedSet = new Set<number>(candidates.slice(0, n).map(v => v.i))
      c.webIndices = c.webIndices.filter(i => !consumedSet.has(i))
    }
  }

  function splitCore(cIdx: number) {
    const c = clusters.current[cIdx]
    const nx = Math.min(Math.max(c.x + 28, SPAWN_MARGIN), worldW.current - SPAWN_MARGIN)
    const ny = c.y
    const newCluster: Cluster = {
      id: clusters.current.length,
      x: nx,
      y: ny,
      members: 0,
      radius: 10,
      emitTimer: rand(PULSE_MIN, PULSE_MAX),
      flashT: 0,
      webIndices: [],
      level: 1,
      progress: 0,
      colorIndex: LEVEL_COLOR_INDEX[0],
    }
    // Reset existing core to level 1 and shift left a bit
    c.level = 1
    c.progress = 0
    c.colorIndex = LEVEL_COLOR_INDEX[0]
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
    let n = 0
    // Ambient/clustered points
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === "ambient" || p.state === "clustered") {
        const rec = drawBuffer[n++]
        rec.x = p.x
        rec.y = p.y
        rec.radius = p.state === "ambient" ? 1.2 : 1.6
        rec.alpha = p.alpha
        rec.color = p.state === "ambient" ? 1 : 2
        rec.shape = 'icon'
        // Mark tiny ambient pages to avoid scribbles
        rec.variant = p.state === "ambient" ? -1 : (p.id & 3)
        rec.glow = 0
      }
    }
    // Cluster halos and centroids
    for (let i = 0; i < clusters.current.length; i++) {
      const c = clusters.current[i]
      const halo = drawBuffer[n++]
      halo.x = c.x
      halo.y = c.y
      const prog = Math.max(0, Math.min(10, c.progress)) / 10
      halo.radius = 16 + c.level * 4 + Math.min(12, c.members * 0.2) + (c.flashT > 0 ? 5 : 0)
      halo.alpha = 0.12 + 0.25 * prog
      halo.color = c.colorIndex
      halo.shape = 'halo'
      const dot = drawBuffer[n++]
      dot.x = c.x
      dot.y = c.y
      dot.radius = 5 + c.level * 2
      dot.alpha = 0.98
      dot.color = c.colorIndex
      dot.shape = 'core'
      dot.variant = i & 3
      dot.glow = prog
    }
    // Outliers and capturing last
    for (let i = 0; i < points.current.length; i++) {
      const p = points.current[i]
      if (p.state === "outlier" || p.state === 'capturing') {
        const rec = drawBuffer[n++]
        rec.x = p.x
        rec.y = p.y
        rec.radius = 2.6
        rec.alpha = Math.max(0.9, p.alpha)
        rec.color = 4
        rec.shape = 'icon'
        rec.variant = p.id & 3
        rec.glow = 1
      }
    }
    snapshot.current.points.length = n
    // Assign references without reallocating
    for (let i = 0; i < n; i++) snapshot.current.points[i] = drawBuffer[i]
  }

  function renderAll() {
    buildSnapshot()
    if (canvases.current.size === 0) return
    const snap = snapshot.current
    // Render into each registered canvas context
    canvases.current.forEach((canvas) => {
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
      // Web connections: faint lines from centroid to a few members
      ctx.save()
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.08
      for (let i = 0; i < clusters.current.length; i++) {
        const c = clusters.current[i]
        ctx.strokeStyle = COLORS[c.colorIndex] || COLORS[0]
        const web = c.webIndices
        for (let k = 0; k < web.length; k++) {
          const p = points.current[web[k]]
          if (!p || p.state !== "clustered") continue
          ctx.beginPath()
          ctx.moveTo(c.x, c.y)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }
      }
      ctx.restore()
      // Draw in order; halos as circles, cores as CPU icons, others as page icons
      for (let i = 0; i < snap.points.length; i++) {
        const r = snap.points[i]
        const color = COLORS[r.color] || COLORS[0]
        if (r.shape === 'halo') {
          ctx.globalAlpha = r.alpha
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
          ctx.fill()
          continue
        }
        if (r.shape === 'core') {
          // CPU core glow based on progress carried in r.glow (0..1)
          const glowFrac = Math.max(0, Math.min(1, r.glow || 0))
          const size = r.radius * 2.4
          const gx = r.x - size / 2
          const gy = r.y - size / 2
          if (glowFrac > 0) {
            // soft base fill to make the glow read
            ctx.globalAlpha = 0.05 * glowFrac
            ctx.fillStyle = color
            ctx.fillRect(gx - 1, gy - 1, size + 2, size + 2)
            for (let pass = 3; pass >= 1; pass--) {
              ctx.globalAlpha = 0.08 * glowFrac * (pass / 3) + 0.02 * glowFrac
              ctx.strokeStyle = color
              ctx.lineWidth = 1 + pass
              ctx.strokeRect(gx - pass, gy - pass, size + pass * 2, size + pass * 2)
            }
          }
          // CPU/processor icon: small square with pins
          const x = gx
          const y = gy
          // Base
          ctx.globalAlpha = Math.min(1, r.alpha + 0.05)
          ctx.fillStyle = "rgba(0,0,0,0.25)"
          ctx.fillRect(x + 0.7, y + 0.7, size, size)
          ctx.globalAlpha = Math.min(1, r.alpha + 0.1)
          ctx.fillStyle = color
          ctx.fillRect(x, y, size, size)
          ctx.globalAlpha = 1
          ctx.strokeStyle = "rgba(0,0,0,0.6)"
          ctx.lineWidth = 1
          ctx.strokeRect(x, y, size, size)
          // Pins (3 each side)
          const pin = Math.max(1, Math.floor(size * 0.12))
          const step = size / 4
          ctx.strokeStyle = color
          ctx.globalAlpha = 0.8
          for (let k = 1; k <= 3; k++) {
            const px = x + k * step
            // top
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y - pin); ctx.stroke()
            // bottom
            ctx.beginPath(); ctx.moveTo(px, y + size); ctx.lineTo(px, y + size + pin); ctx.stroke()
            const py = y + k * step
            // left
            ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x - pin, py); ctx.stroke()
            // right
            ctx.beginPath(); ctx.moveTo(x + size, py); ctx.lineTo(x + size + pin, py); ctx.stroke()
          }
          continue
        }
        // Page icon with sharp corners + diagonal fold line + scribbles
        const dq = uiState.upgrades.dataQuality ?? 1
        const GLOW_COLORS = { 1: "#f59e0b", 2: "#d1d5db", 3: "#facc15" }
        const GLOW = GLOW_COLORS[Math.min(3, Math.max(1, dq)) as 1|2|3]
        const w = r.radius * 5.8
        const h = r.radius * 7.6
        const x = r.x - w / 2
        const y = r.y - h / 2

        // Page-shaped glow for clickable outliers: soft fill + 3 shrinking strokes
        if (r.glow && r.glow > 0) {
          const prevAlpha = ctx.globalAlpha
          // Soft base fill halo
          ctx.globalAlpha = 0.06 * r.glow
          ctx.fillStyle = GLOW
          ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
          // Outer strokes (slightly thicker to thinner)
          ctx.strokeStyle = GLOW
          for (let pass = 3; pass >= 1; pass--) {
            ctx.globalAlpha = 0.08 * r.glow * (pass / 3) + 0.02 * r.glow
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

        // Scribble lines: skip for tiny icons or background floaters
        if (w >= 12 && h >= 12 && (r.variant ?? 0) >= 0) {
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
    })
  }

  const api: GalaxyAPI = {
    getDrawSnapshot() { return snapshot.current },
    registerCanvas(canvas) {
      if (canvas) canvases.current.add(canvas)
      return () => { if (canvas) canvases.current.delete(canvas) }
    },
    purchaseIQ(key) {
      if (!persisted.current) return
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
      if (!enabled) return
      const idx = nearestOutlierWithin(x, y, CLICK_RADIUS)
      if (idx !== -1) {
        convertOutlier(idx)
        let gain = CLICK_BASE + uiState.upgrades.clickYield
        // Data Quality: bring extra outliers if available (bronze=1, silver=2, gold=3)
        const dq = Math.min(3, Math.max(1, uiState.upgrades.dataQuality || 1))
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
        const mbLevel = uiState.upgrades.batchCollect
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
        const lvl = Math.min(5, Math.max(1, clusters.current[i].level))
        counts[lvl-1]++
      }
      const computeMult = Math.pow(2, (persisted.current?.iqUpgrades.computeMult ?? 0))
      let tps = 0
      for (let i = 0; i < counts.length; i++) tps += LEVEL_RATE[i] * counts[i]
      tps *= computeMult
      return { tokensPerSec: tps, coresByLevel: counts }
    },
  }

  return { state: uiState, api, parallaxY }
}
