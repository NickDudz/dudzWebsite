// Lightweight shared math utilities for Clustering Galaxy
// Plain JS so tests can run without extra tooling.

const UPGRADE_BASES = {
  spawnRate: 25,
  spawnQty: 180,
  clickYield: 50,
  batchCollect: 120,
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function cost(base, level) {
  // Cost = base * 1.6^level, rounded to integer
  return Math.round(base * Math.pow(1.6, level))
}

function upgradeCost(key, level) {
  const base = UPGRADE_BASES[key]
  return cost(base, level)
}

function spawnIntervalBase(baseSpawnSeconds, spawnRateLevel) {
  // BASE_SPAWN / (1 + spawnRate*0.15)
  const factor = 1 + spawnRateLevel * 0.15
  return baseSpawnSeconds / factor
}

function offlineTrickle(clustersCount, computeMult, minutes) {
  // small fraction of expected passive earnings, capped at 30 minutes
  const m = clamp(minutes, 0, 30)
  const perSec = 1 * Math.max(1, computeMult) * Math.max(1, clustersCount)
  const raw = perSec * 60 * m * 0.12
  return Math.floor(raw)
}

function batchCollectChance(level) {
  // 10% per level, cap at 100%
  return clamp(0.1 * level, 0, 1)
}

module.exports = {
  clamp,
  cost,
  upgradeCost,
  spawnIntervalBase,
  offlineTrickle,
  batchCollectChance,
  UPGRADE_BASES,
}
