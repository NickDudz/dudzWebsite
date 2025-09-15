// Game Engine - Core game logic separated from React hooks

import { GAME_CONFIG, UPGRADE_CONFIG, VISUAL_CONFIG } from '../constants/gameConstants'
import type { 
  Point, 
  Cluster, 
  Upgrades, 
  IQUpgrades, 
  PersistedState, 
  GalaxyState,
  DrawRecord,
  DrawSnapshot,
  GameStats
} from '../types/gameTypes'

export class ClusteringGalaxyEngine {
  private points: Point[] = []
  private clusters: Cluster[] = []
  private worldWidth: number = 0
  private worldHeight: number = 0
  private spawnCooldown: number = 1
  private lastTick: number = 0
  private reducedMotion: boolean = false
  private autoAcc: number = 0
  private firstL2Notified: boolean = false

  // Performance monitoring
  private frameCount: number = 0
  private lastFpsTime: number = 0
  private currentFps: number = 0
  private targetFps: number = 60
  private frameTime: number = 1000 / 60 // 16.67ms for 60 FPS

  // Orbital movement
  private orbitalMode: boolean = false
  private orbitalCenter: { x: number; y: number } = { x: 0, y: 0 }
  private orbitalRadius: number = 0
  private orbitalAngles: number[] = []

  // Draw state
  private drawBuffer: DrawRecord[] = []
  private snapshot: DrawSnapshot = { width: 0, height: 0, parallaxY: 0, points: [] }

  constructor() {
    this.initializeDrawBuffer()
  }

  private initializeDrawBuffer() {
    this.drawBuffer = new Array(GAME_CONFIG.AMBIENT_COUNT + 64)
      .fill(0)
      .map(() => ({
        x: 0,
        y: 0,
        radius: 0,
        alpha: 0,
        color: 0,
        shape: 'icon' as const,
        variant: 0,
        glow: 0,
      }))
  }

  // Initialize game world
  initialize(worldWidth: number, worldHeight: number, reducedMotion: boolean = false) {
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.reducedMotion = reducedMotion
    this.firstL2Notified = false

    // Set orbital center
    this.orbitalCenter = { x: worldWidth * 0.5, y: worldHeight * 0.5 }
    this.orbitalRadius = Math.min(worldWidth, worldHeight) * 0.3

    // Initialize clusters
    this.initializeClusters()
    
    // Initialize points
    this.initializePoints()

    // Reset timers
    this.spawnCooldown = GAME_CONFIG.BASE_SPAWN
    this.lastTick = performance.now()
  }

  private initializeClusters() {
    // Start with single core at top middle
    this.clusters = [{
      id: 0,
      x: this.worldWidth * 0.5,
      y: this.worldHeight * 0.15, // Top middle, not covered by HUD
      members: 0,
      radius: 10,
      emitTimer: this.rand(GAME_CONFIG.PULSE_MIN, GAME_CONFIG.PULSE_MAX),
      flashT: 0,
      webIndices: [],
      level: 1,
      progress: 0,
      colorIndex: GAME_CONFIG.LEVEL_COLOR_INDEX[0],
    }]
  }

  private initializePoints() {
    const count = GAME_CONFIG.AMBIENT_COUNT + GAME_CONFIG.OUTLIER_COUNT
    this.points = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * this.worldWidth,
      y: Math.random() * this.worldHeight,
      vx: (Math.random() - 0.5) * GAME_CONFIG.DRIFT_SPEED,
      vy: (Math.random() - 0.5) * GAME_CONFIG.DRIFT_SPEED,
      age: Math.random() * 10,
      state: i < GAME_CONFIG.AMBIENT_COUNT ? 'ambient' : 'outlier',
      colorIndex: Math.floor(Math.random() * 5),
      glow: 0,
      flashT: 0,
    }))
  }

  // Game simulation step
  simulate(deltaTime: number, upgrades: Upgrades, iqUpgrades: IQUpgrades) {
    if (this.reducedMotion) return

    // Frame rate limiting
    const now = performance.now()
    const timeSinceLastFrame = now - this.lastTick
    
    if (timeSinceLastFrame < this.frameTime) {
      return // Skip this frame to maintain target FPS
    }

    // Update FPS counter
    this.updateFpsCounter(now)

    // Cap delta time to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, GAME_CONFIG.MAX_DT)

    this.updateSpawnCooldown(upgrades)
    this.updatePoints(cappedDeltaTime)
    this.updateClusters(cappedDeltaTime)
    this.updateOrbitalMovement(cappedDeltaTime)
    this.handleAutoCollect(iqUpgrades)

    this.lastTick = now
  }

  private updateSpawnCooldown(upgrades: Upgrades) {
    this.spawnCooldown = GAME_CONFIG.BASE_SPAWN / (1 + upgrades.spawnRate * UPGRADE_CONFIG.SPAWN_RATE.base)
  }

  private updatePoints(deltaTime: number) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      point.age += deltaTime

      // Update position based on state
      if (point.state === 'ambient' || point.state === 'outlier') {
        point.x += point.vx
        point.y += point.vy
      }

      if (point.state === 'ambient' || point.state === 'clustered') {
        // Clustered points move toward centroid
        if (point.clusterId !== undefined) {
          const cluster = this.clusters[point.clusterId]
          const dx = cluster.x - point.x
          const dy = cluster.y - point.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 5) {
            point.x += (dx / dist) * 20 * deltaTime
            point.y += (dy / dist) * 20 * deltaTime
          }
        }
      }

      if (point.state === 'capturing') {
        // Animate toward target cluster
        if (point.targetCluster !== undefined) {
          const cluster = this.clusters[point.targetCluster]
          const dx = cluster.x - point.x
          const dy = cluster.y - point.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 5) {
            point.x += (dx / dist) * 100 * deltaTime
            point.y += (dy / dist) * 100 * deltaTime
          }
        }
        point.captureT! -= deltaTime
        if (point.captureT! <= 0) {
          this.convertToClustered(i)
        }
      }

      // Wrap around world bounds
      this.wrapPoint(point)

      // Update visual effects
      point.glow = Math.max(0, point.glow - deltaTime * 2)
      point.flashT = Math.max(0, point.flashT - deltaTime)
    }
  }

  private updateClusters(deltaTime: number) {
    for (let i = 0; i < this.clusters.length; i++) {
      const cluster = this.clusters[i]
      
      // Update emit timer
      cluster.emitTimer -= deltaTime
      if (cluster.emitTimer <= 0) {
        cluster.emitTimer = this.rand(GAME_CONFIG.PULSE_MIN, GAME_CONFIG.PULSE_MAX)
        cluster.flashT = GAME_CONFIG.FLASH_DURATION
      }

      // Update flash timer
      cluster.flashT = Math.max(0, cluster.flashT - deltaTime)

      // Update member count
      cluster.members = this.points.filter(p => 
        p.state === 'clustered' && p.clusterId === i
      ).length
    }
  }

  private handleAutoCollect(iqUpgrades: IQUpgrades) {
    if (iqUpgrades.autoCollect === 0) return

    this.autoAcc += 1 / 60 // Assuming 60 FPS
    if (this.autoAcc >= 1) {
      this.autoAcc = 0
      const outliers = this.points.filter(p => p.state === 'outlier')
      if (outliers.length > 0) {
        const randomIndex = Math.floor(Math.random() * outliers.length)
        const pointIndex = this.points.indexOf(outliers[randomIndex])
        this.convertOutlier(pointIndex)
      }
    }
  }

  // Point conversion methods
  convertOutlier(index: number): boolean {
    if (index < 0 || index >= this.points.length) return false
    
    const point = this.points[index]
    if (point.state !== 'outlier') return false

    const clusterIndex = this.findNearestCluster(point.x, point.y)
    point.state = 'capturing'
    point.targetCluster = clusterIndex
    point.captureT = GAME_CONFIG.CAPTURE_TIME
    point.vx = 0
    point.vy = 0

    return true
  }

  private convertToClustered(index: number) {
    const point = this.points[index]
    if (point.targetCluster === undefined) return

    point.state = 'clustered'
    point.clusterId = point.targetCluster
    point.targetCluster = undefined
    point.captureT = undefined

    // Check for level up
    this.checkClusterLevelUp(point.clusterId)
  }

  private checkClusterLevelUp(clusterIndex: number) {
    const cluster = this.clusters[clusterIndex]
    if (cluster.level >= GAME_CONFIG.MAX_LEVEL) return

    const requiredMembers = (cluster.level + 1) * 10
    if (cluster.members >= requiredMembers) {
      cluster.level += 1
      cluster.progress = 0
      cluster.colorIndex = GAME_CONFIG.LEVEL_COLOR_INDEX[cluster.level - 1]
      cluster.flashT = GAME_CONFIG.FLASH_DURATION

      // Check for first level 2 notification
      if (cluster.level >= 2 && !this.firstL2Notified) {
        this.firstL2Notified = true
        this.dispatchEvent('l2-reached')
      }

      // Check for max level
      if (cluster.level >= GAME_CONFIG.MAX_LEVEL) {
        this.dispatchEvent('first-max')
      }
    }
  }

  // Click handling
  handleClick(x: number, y: number, upgrades: Upgrades): number {
    // Input validation
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
      console.warn('Invalid click coordinates:', { x, y })
      return 0
    }
    if (x < 0 || y < 0 || x > this.worldWidth || y > this.worldHeight) {
      console.warn('Click coordinates out of bounds:', { x, y, worldWidth: this.worldWidth, worldHeight: this.worldHeight })
      return 0
    }

    const index = this.findNearestOutlier(x, y, GAME_CONFIG.CLICK_RADIUS)
    if (index === -1) return 0

    this.convertOutlier(index)
    let gain = GAME_CONFIG.CLICK_BASE + upgrades.clickYield

    // Data Quality bonus
    const dq = Math.min(3, Math.max(1, upgrades.dataQuality || 1))
    if (dq > 1) {
      let need = dq - 1
      for (let i = 0; i < this.points.length && need > 0; i++) {
        const p = this.points[i]
        if (p.state === 'outlier') {
          this.convertOutlier(i)
          gain += 1
          need--
        }
      }
    }

    // Batch collect bonus
    const mbLevel = upgrades.batchCollect
    const chance = Math.min(0.1 * mbLevel, 1)
    const totalOutliers = this.points.filter(p => p.state === 'outlier').length
    if (totalOutliers > 1 && Math.random() < chance) {
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i]
        if (p.state === 'outlier') {
          this.convertOutlier(i)
          gain += 1
        }
      }
    }

    return gain
  }

  // Rendering
  generateDrawSnapshot(parallaxY: number): DrawSnapshot {
    this.snapshot.width = this.worldWidth
    this.snapshot.height = this.worldHeight
    this.snapshot.parallaxY = parallaxY
    this.snapshot.points = this.drawBuffer.slice(0, this.points.length)

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const record = this.snapshot.points[i]
      
      record.x = point.x
      record.y = point.y + parallaxY * 0.05
      record.radius = this.getPointSize(point.state)
      record.alpha = this.getPointAlpha(point.state)
      record.color = point.colorIndex
      record.shape = 'icon'
      record.variant = 0
      record.glow = point.glow
    }

    return this.snapshot
  }

  private getPointSize(state: string): number {
    switch (state) {
      case 'ambient': return VISUAL_CONFIG.AMBIENT_SIZE
      case 'outlier': return VISUAL_CONFIG.OUTLIER_SIZE
      case 'clustered': return VISUAL_CONFIG.CLUSTERED_SIZE
      case 'capturing': return VISUAL_CONFIG.OUTLIER_SIZE
      default: return VISUAL_CONFIG.AMBIENT_SIZE
    }
  }

  private getPointAlpha(state: string): number {
    switch (state) {
      case 'ambient': return VISUAL_CONFIG.AMBIENT_ALPHA
      case 'outlier': return VISUAL_CONFIG.OUTLIER_ALPHA
      case 'clustered': return VISUAL_CONFIG.CLUSTERED_ALPHA
      case 'capturing': return VISUAL_CONFIG.CAPTURING_ALPHA
      default: return VISUAL_CONFIG.AMBIENT_ALPHA
    }
  }

  // Utility methods
  private findNearestOutlier(x: number, y: number, radius: number): number {
    let bestIndex = -1
    let bestDistance = radius * radius

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      if (point.state !== 'outlier') continue

      const dx = point.x - x
      const dy = point.y - y
      const distance = dx * dx + dy * dy

      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }

    return bestIndex
  }

  private findNearestCluster(x: number, y: number): number {
    let bestIndex = 0
    let bestDistance = Infinity

    for (let i = 0; i < this.clusters.length; i++) {
      const cluster = this.clusters[i]
      const dx = cluster.x - x
      const dy = cluster.y - y
      const distance = dx * dx + dy * dy

      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }

    return bestIndex
  }

  private wrapPoint(point: Point) {
    const margin = GAME_CONFIG.WRAP_MARGIN
    if (point.x < -margin) point.x = this.worldWidth + margin
    if (point.x > this.worldWidth + margin) point.x = -margin
    if (point.y < -margin) point.y = this.worldHeight + margin
    if (point.y > this.worldHeight + margin) point.y = -margin
  }

  private rand(min: number, max: number): number {
    return min + Math.random() * (max - min)
  }

  private updateFpsCounter(now: number) {
    this.frameCount++
    
    if (now - this.lastFpsTime >= 1000) { // Update FPS every second
      this.currentFps = this.frameCount
      this.frameCount = 0
      this.lastFpsTime = now
    }
  }

  private dispatchEvent(name: string) {
    try {
      window.dispatchEvent(new CustomEvent('galaxy-effect', { 
        detail: { name, t: Date.now() } 
      }))
    } catch (error) {
      console.warn('Failed to dispatch galaxy effect:', error)
    }
  }

  // Getters
  getStats(iqUpgrades: IQUpgrades): GameStats {
    const counts = [0, 0, 0, 0, 0]
    for (let i = 0; i < this.clusters.length; i++) {
      const level = Math.min(GAME_CONFIG.MAX_LEVEL, Math.max(1, this.clusters[i].level))
      counts[level - 1]++
    }

    const computeMult = Math.pow(UPGRADE_CONFIG.COMPUTE_MULT.base, iqUpgrades.computeMult)
    let tokensPerSec = 0
    for (let i = 0; i < counts.length; i++) {
      tokensPerSec += GAME_CONFIG.LEVEL_RATE[i] * counts[i]
    }
    tokensPerSec *= computeMult

    return {
      tokensPerSec,
      coresByLevel: counts,
      totalCores: this.clusters.length,
      maxLevel: Math.max(...this.clusters.map(c => c.level))
    }
  }

  getClusters(): Cluster[] {
    return [...this.clusters]
  }

  getPoints(): Point[] {
    return [...this.points]
  }

  // Performance methods
  getCurrentFps(): number {
    return this.currentFps
  }

  setTargetFps(fps: number) {
    this.targetFps = Math.max(30, Math.min(120, fps)) // Clamp between 30-120 FPS
    this.frameTime = 1000 / this.targetFps
  }

  getPerformanceMetrics() {
    return {
      currentFps: this.currentFps,
      targetFps: this.targetFps,
      frameTime: this.frameTime,
      pointCount: this.points.length,
      clusterCount: this.clusters.length,
    }
  }

  // Set orbital mode
  setOrbitalMode(enabled: boolean) {
    this.orbitalMode = enabled
    if (enabled) {
      this.initializeOrbitalAngles()
    }
  }

  private initializeOrbitalAngles() {
    this.orbitalAngles = this.clusters.map((_, i) => {
      // Distribute clusters around the orbit with some randomness
      const baseAngle = (i / this.clusters.length) * Math.PI * 2
      const randomOffset = (Math.random() - 0.5) * Math.PI * 0.5 // ±45 degrees
      return baseAngle + randomOffset
    })
  }

  private updateOrbitalMovement(deltaTime: number) {
    if (!this.orbitalMode || this.clusters.length === 0) return

    const orbitalSpeed = 0.5 // radians per second
    const waveAmplitude = 20 // pixels
    const waveFrequency = 0.3 // waves per second

    this.clusters.forEach((cluster, i) => {
      if (i >= this.orbitalAngles.length) {
        // Add new angle for new clusters
        this.orbitalAngles.push(Math.random() * Math.PI * 2)
      }

      // Update angle
      this.orbitalAngles[i] += orbitalSpeed * deltaTime

      // Calculate base orbital position
      const angle = this.orbitalAngles[i]
      const baseX = this.orbitalCenter.x + Math.cos(angle) * this.orbitalRadius
      const baseY = this.orbitalCenter.y + Math.sin(angle) * this.orbitalRadius

      // Add wavy motion
      const waveOffset = Math.sin(angle * waveFrequency + this.lastTick * 0.001) * waveAmplitude
      const perpendicularAngle = angle + Math.PI / 2
      const waveX = Math.cos(perpendicularAngle) * waveOffset
      const waveY = Math.sin(perpendicularAngle) * waveOffset

      cluster.x = baseX + waveX
      cluster.y = baseY + waveY
    })
  }
}
