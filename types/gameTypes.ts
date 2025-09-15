// TypeScript type definitions for the clustering galaxy game

export interface Point {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  age: number
  state: 'ambient' | 'outlier' | 'clustered' | 'capturing'
  clusterId?: number
  targetCluster?: number
  captureT?: number
  colorIndex: number
  glow: number
  flashT: number
}

export interface Cluster {
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

export interface Upgrades {
  spawnRate: number
  spawnQty: number
  clickYield: number
  batchCollect: number
  dataQuality?: number
}

export interface IQUpgrades {
  computeMult: number
  autoCollect: number
  confettiUnlocked: boolean
  paletteUnlocked: boolean
}

export interface PersistedState {
  tokens: number
  iq: number
  upgrades: Upgrades
  iqUpgrades: IQUpgrades
  lastSeen: number
}

export interface GalaxyState {
  tokens: number
  iq: number
  upgrades: Upgrades
  iqUpgrades: IQUpgrades
}

export interface DrawRecord {
  x: number
  y: number
  radius: number
  alpha: number
  color: number
  shape: 'icon' | 'circle' | 'square' | 'diamond'
  variant: number
  glow: number
}

export interface DrawSnapshot {
  width: number
  height: number
  parallaxY: number
  points: DrawRecord[]
}

export interface GalaxyAPI {
  getDrawSnapshot(): DrawSnapshot
  registerCanvas(canvas: HTMLCanvasElement | null): () => void
  clickAt(x: number, y: number): void
  purchase(key: keyof Upgrades): void
  purchaseIQ(key: 'computeMult' | 'autoCollect' | 'confetti' | 'palette'): void
  triggerEffect(name: 'confetti' | 'palette'): void
  getStats(): { tokensPerSec: number; coresByLevel: number[] }
}

export interface UseClusteringGalaxyOptions {
  enabled?: boolean
}

export interface GalaxyUIProps {
  state: GalaxyState
  api: GalaxyAPI
  onToggle: () => void
  enabled?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  sidebar?: boolean
  onSidebarToggle?: () => void
}

export interface ClusteringGalaxyCanvasProps {
  enabled: boolean
  parallaxY: number
  api: GalaxyAPI
}

export interface GameStats {
  tokensPerSec: number
  coresByLevel: number[]
  totalCores: number
  maxLevel: number
}

export interface UpgradeRow {
  key: keyof Upgrades
  label: string
  desc: string
  cost: number
  canAfford: boolean
  level: number
}

export interface IQUpgradeRow {
  key: keyof IQUpgrades
  label: string
  desc: string
  cost: number
  canAfford: boolean
  level: number
  unlocked: boolean
}

// Event types for custom events
export interface GalaxyEffectEvent extends CustomEvent {
  detail: {
    name: string
    t: number
  }
}

// Utility types
export type UpgradeKey = keyof Upgrades
export type IQUpgradeKey = keyof IQUpgrades
export type EffectName = 'confetti' | 'palette' | 'l2-reached' | 'first-max'
export type PointState = Point['state']
export type DrawShape = DrawRecord['shape']
