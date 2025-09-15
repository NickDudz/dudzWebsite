// Game Constants - Centralized configuration for the clustering galaxy game

export const GAME_CONFIG = {
  // Spawning
  AMBIENT_COUNT: 120,
  OUTLIER_COUNT: 3,
  BASE_SPAWN: 2.0,
  SPAWN_RADIUS: 0.15,
  
  // Clicking
  CLICK_RADIUS: 25,
  CLICK_BASE: 1,
  
  // Clustering
  CLUSTER_RADIUS: 60,
  CAPTURE_DISTANCE: 25,
  CAPTURE_TIME: 0.3,
  
  // Core progression
  MAX_LEVEL: 5,
  LEVEL_RATE: [1, 2, 4, 6, 8], // tokens/sec for levels 1..5
  LEVEL_COLOR_INDEX: [0, 1, 2, 3, 4],
  
  // Visual effects
  GLOW_MS: 800,
  FLASH_DURATION: 0.8,
  PULSE_MIN: 0.8,
  PULSE_MAX: 1.2,
  
  // Performance
  MAX_DT: 0.016, // 60 FPS cap
  PERSIST_INTERVAL: 1500, // milliseconds
  
  // Physics
  DRIFT_SPEED: 0.5,
  WRAP_MARGIN: 50,
} as const

export const UPGRADE_CONFIG = {
  // Regular upgrades
  SPAWN_RATE: { base: 0.15, max: 20 },
  SPAWN_QTY: { base: 0.1, max: 10 },
  CLICK_YIELD: { base: 1, max: 5 },
  BATCH_COLLECT: { base: 0.1, max: 10 },
  
  // IQ upgrades
  COMPUTE_MULT: { base: 2, max: 10 },
  AUTO_COLLECT: { base: 2, max: 10 },
  CONFETTI_COST: 1,
  PALETTE_COST: 1,
} as const

export const VISUAL_CONFIG = {
  // Colors (indices for color arrays)
  AMBIENT_ALPHA: 0.4,
  OUTLIER_ALPHA: 0.8,
  CLUSTERED_ALPHA: 0.6,
  CAPTURING_ALPHA: 0.9,
  
  // Animation
  FLASH_DURATION: 0.8,
  CAPTURE_DURATION: 0.3,
  
  // Sizes
  AMBIENT_SIZE: 2,
  OUTLIER_SIZE: 4,
  CLUSTERED_SIZE: 3,
} as const

export const PERSISTENCE_KEYS = {
  TOKENS: 'galaxy.tokens',
  IQ: 'galaxy.iq',
  UPGRADES: 'galaxy.upgrades',
  IQ_UPGRADES: 'galaxy.iqUpgrades',
  LAST_SEEN: 'galaxy.lastSeen',
} as const
