// Game constants shared between the galaxy hook and the experimental engine

export const GAME_CONFIG = {
  // Economy
  PASSIVE_BASE: 1,
  CLICK_BASE: 3,
  BASE_SPAWN: 6.0,
  OUTLIER_MAX_BASE: 1,
  OUTLIER_MAX_PER_LEVEL: 1,

  // Timing
  PULSE_MIN: 5.0,
  PULSE_MAX: 9.0,
  GLOW_MS: 200,
  FLASH_DURATION: 0.8,
  MAX_DT: 0.05,
  // Build/persistence
  PERSIST_INTERVAL: 1500,

  // World composition
  AMBIENT_COUNT: 520,
  OUTLIER_COUNT: 3,
  DRIFT_SPEED: 0.5,
  CLICK_RADIUS: 48,
  CAPTURE_TIME: 0.3,
  MAX_LEVEL: 5,
  WRAP_MARGIN: 50,
  WRAP_PAD: 8,
  SPAWN_MARGIN: 28,
  TOP_EXCLUDE: 60,
  EDGE_SPAWN_PAD: 24,

  // Progression
  // For testing: effectively remove the global core cap
  MAX_CORES: Number.POSITIVE_INFINITY,
  // Per-level visible core thresholds before stacking begins
  // L1..L5: 30, 32, 34, 36, 40
  STACK_THRESHOLDS: [30, 32, 34, 36, 40],
  // High-quality mode thresholds (more visible cores before stacking)
  // L1..L5: all 500 to stress test
  STACK_THRESHOLDS_HIGH: [500, 500, 500, 500, 500],
  // Legacy fallbacks (kept for compatibility if code paths still read them)
  STACK_THRESHOLD: 18,
  L5_STACK_THRESHOLD: 33,
  LEVEL_RATE: [1, 2, 4, 6, 8],
  LEVEL_COLOR_INDEX: [5, 6, 7, 8, 9],

  // Rendering helpers
  DRAW_BUFFER_EXTRA: 64,
  ORBIT_LIMIT_BASE: 8,
  // Web connection line caps per core
  WEB_MAX_LINES_LOW: 6,
  WEB_MAX_LINES_HIGH: 12,
  // Core draw reservation caps (records reserved for halo+dot)
  CORE_RESERVE_CAP_LOW: 300,
  CORE_RESERVE_CAP_HIGH: 1200,
  CORE_RESERVE_CAP_EXTREME: 5200,
  OUTLIER_RESERVE: 120,
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
  AMBIENT_ALPHA: 0.4,
  OUTLIER_ALPHA: 0.8,
  CLUSTERED_ALPHA: 0.6,
  CAPTURING_ALPHA: 0.9,
  FLASH_DURATION: 0.8,
  CAPTURE_DURATION: 0.3,
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
