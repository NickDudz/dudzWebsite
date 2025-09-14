// Lightweight unit tests for Clustering Galaxy math
const assert = require('assert')
const { UPGRADE_BASES, upgradeCost, spawnIntervalBase, offlineTrickle, batchCollectChance, clamp } = require('../hooks/galaxyMath.js')

function testCostCurve() {
  Object.entries(UPGRADE_BASES).forEach(([key, base]) => {
    let prev = upgradeCost(key, 0)
    for (let lvl = 1; lvl <= 7; lvl++) {
      const next = upgradeCost(key, lvl)
      assert(next > prev, `cost should increase: ${key}@${lvl} ${next} > ${prev}`)
      prev = next
    }
  })
}

function testOfflineTrickleClamp() {
  const clusters = 5
  const mult = 4 // 2^2
  const tenMin = offlineTrickle(clusters, mult, 10)
  const thirtyMin = offlineTrickle(clusters, mult, 30)
  const sixtyMin = offlineTrickle(clusters, mult, 60)
  assert(tenMin >= 0, '10min should be >= 0')
  assert(thirtyMin >= tenMin, '30min >= 10min')
  assert.strictEqual(sixtyMin, thirtyMin, 'clamped at 30min')
  const neg = offlineTrickle(clusters, mult, -10)
  assert.strictEqual(neg, 0, 'negative minutes => 0')
}

function testSpawnIntervalMonotonic() {
  const base = 5
  let prev = spawnIntervalBase(base, 0)
  for (let lvl = 1; lvl <= 6; lvl++) {
    const cur = spawnIntervalBase(base, lvl)
    assert(cur < prev, `spawn interval decreases with level ${lvl}: ${cur} < ${prev}`)
    prev = cur
  }
}

function testBatchCollectCap() {
  for (let lvl = 0; lvl <= 20; lvl++) {
    const p = batchCollectChance(lvl)
    assert(p <= 1 + 1e-9, 'cap at 1')
    assert(p >= 0, 'non-negative')
  }
}

function run() {
  testCostCurve()
  testOfflineTrickleClamp()
  testSpawnIntervalMonotonic()
  testBatchCollectCap()
  console.log('Galaxy math tests passed')
}

run()
