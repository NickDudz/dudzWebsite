// Game Logic Hook - Handles game mechanics and interactions

import { useCallback } from 'react'
import { ClusteringGalaxyEngine } from '../engine/ClusteringGalaxyEngine'
import { GAME_CONFIG, UPGRADE_CONFIG } from '../constants/gameConstants'
import type { Upgrades, IQUpgrades, GalaxyAPI } from '../types/gameTypes'

export function useGameLogic(
  engine: ClusteringGalaxyEngine,
  updateTokens: (amount: number) => void,
  updateIQ: (amount: number) => void,
  updateUpgrades: (upgrades: Partial<Upgrades>) => void,
  updateIQUpgrades: (iqUpgrades: Partial<IQUpgrades>) => void,
  getState: () => any
) {
  // Handle click events
  const handleClick = useCallback((x: number, y: number) => {
    const state = getState()
    if (!state) return

    const gain = engine.handleClick(x, y, state.upgrades)
    if (gain > 0) {
      updateTokens(gain)
    }
  }, [engine, updateTokens, getState])

  // Handle upgrade purchases
  const purchaseUpgrade = useCallback((key: keyof Upgrades) => {
    const state = getState()
    if (!state) return

    // Input validation
    if (!key || typeof key !== 'string') {
      console.warn('Invalid upgrade key:', key)
      return
    }

    if (key === 'dataQuality') {
      const lvl = state.upgrades.dataQuality ?? 0
      const costIQ = lvl === 0 ? 10 : 100
      if (state.iq < costIQ || lvl >= 2) return
      
      updateIQ(-costIQ)
      updateUpgrades({ dataQuality: lvl + 1 })
      return
    }

    const lvl = state.upgrades[key] || 0
    const price = calculateUpgradeCost(key, lvl)
    if (state.tokens < price) return

    updateTokens(-price)
    updateUpgrades({ [key]: lvl + 1 })
  }, [updateTokens, updateIQ, updateUpgrades, getState])

  // Handle IQ upgrade purchases
  const purchaseIQUpgrade = useCallback((key: 'computeMult' | 'autoCollect' | 'confetti' | 'palette') => {
    const state = getState()
    if (!state) return

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
      lvl = state.iqUpgrades.computeMult
      cost = Math.pow(UPGRADE_CONFIG.COMPUTE_MULT.base, lvl)
      if (state.iq < cost || lvl >= 10) return
      updateIQ(-cost)
      updateIQUpgrades({ computeMult: lvl + 1 })
    } else if (key === 'autoCollect') {
      lvl = state.iqUpgrades.autoCollect
      cost = Math.pow(UPGRADE_CONFIG.AUTO_COLLECT.base, lvl)
      if (state.iq < cost) return
      updateIQ(-cost)
      updateIQUpgrades({ autoCollect: lvl + 1 })
    } else if (key === 'confetti') {
      if (state.iqUpgrades.confettiUnlocked) return
      if (state.iq < UPGRADE_CONFIG.CONFETTI_COST) return
      updateIQ(-UPGRADE_CONFIG.CONFETTI_COST)
      updateIQUpgrades({ confettiUnlocked: true })
    } else if (key === 'palette') {
      if (state.iqUpgrades.paletteUnlocked) return
      if (state.iq < UPGRADE_CONFIG.PALETTE_COST) return
      updateIQ(-UPGRADE_CONFIG.PALETTE_COST)
      updateIQUpgrades({ paletteUnlocked: true })
    }
  }, [updateIQ, updateIQUpgrades, getState])

  // Trigger effects
  const triggerEffect = useCallback((name: 'confetti' | 'palette') => {
    try {
      window.dispatchEvent(new CustomEvent('galaxy-effect', { 
        detail: { name, t: Date.now() } 
      }))
    } catch (error) {
      console.warn('Failed to trigger effect:', error)
    }
  }, [])

  // Get game statistics
  const getStats = useCallback(() => {
    const state = getState()
    if (!state) return { tokensPerSec: 0, coresByLevel: [0, 0, 0, 0, 0] }

    return engine.getStats(state.iqUpgrades)
  }, [engine, getState])

  // Calculate offline trickle
  const calculateOfflineTrickle = useCallback((minutes: number) => {
    const state = getState()
    if (!state) return 0

    const stats = engine.getStats(state.iqUpgrades)
    const tokensPerMinute = stats.tokensPerSec * 60
    const offlineMinutes = Math.min(minutes, 60 * 24) // Cap at 24 hours
    return Math.floor(tokensPerMinute * offlineMinutes)
  }, [engine, getState])

  return {
    handleClick,
    purchaseUpgrade,
    purchaseIQUpgrade,
    triggerEffect,
    getStats,
    calculateOfflineTrickle,
  }
}

// Helper function to calculate upgrade costs
function calculateUpgradeCost(key: keyof Upgrades, level: number): number {
  switch (key) {
    case 'spawnRate':
      return Math.floor(10 * Math.pow(1.5, level))
    case 'spawnQty':
      return Math.floor(15 * Math.pow(1.4, level))
    case 'clickYield':
      return Math.floor(20 * Math.pow(1.3, level))
    case 'batchCollect':
      return Math.floor(25 * Math.pow(1.2, level))
    default:
      return 0
  }
}
