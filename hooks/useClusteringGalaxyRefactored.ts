// Refactored Clustering Galaxy Hook - Uses focused modules for better maintainability

import { useEffect, useRef, useState } from 'react'
import { ClusteringGalaxyEngine } from '../engine/ClusteringGalaxyEngine'
import { useGameState } from './useGameState'
import { useGameLogic } from './useGameLogic'
import { useRendering } from './useRendering'
import { usePersistence } from './usePersistence'
import { GAME_CONFIG } from '../constants/gameConstants'
import type { UseClusteringGalaxyOptions, GalaxyAPI, GalaxyState } from '../types/gameTypes'

export function useClusteringGalaxyRefactored(opts: UseClusteringGalaxyOptions = {}) {
  const enabled = opts.enabled ?? true
  
  // Initialize engine
  const engine = useRef(new ClusteringGalaxyEngine()).current
  
  // Game state management
  const {
    uiState,
    loadState,
    saveState,
    updateTokens,
    updateIQ,
    updateUpgrades,
    updateIQUpgrades,
    getState,
  } = useGameState()

  // Game logic
  const {
    handleClick,
    purchaseUpgrade,
    purchaseIQUpgrade,
    triggerEffect,
    getStats,
    calculateOfflineTrickle,
  } = useGameLogic(engine, updateTokens, updateIQ, updateUpgrades, updateIQUpgrades, getState)

  // Rendering
  const {
    registerCanvas,
    getDrawSnapshot,
    updateSnapshot,
    renderAll,
  } = useRendering(engine)

  // Persistence
  const {
    calculateOfflineProgress,
    applyOfflineTrickle,
    forceSave,
  } = usePersistence(enabled, getState, saveState)

  // World dimensions
  const worldW = useRef<number>(0)
  const worldH = useRef<number>(0)
  const lastTick = useRef<number>(0)
  const reducedMotion = useRef<boolean>(false)

  // Initialize game
  useEffect(() => {
    if (!enabled) return

    // Set world dimensions
    worldW.current = window.innerWidth
    worldH.current = window.innerHeight

    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      reducedMotion.current = mq.matches
      
      const onChange = () => { reducedMotion.current = mq.matches }
      try { 
        mq.addEventListener('change', onChange) 
      } catch { 
        mq.addListener(onChange as any) 
      }
    }

    // Initialize engine
    engine.initialize(worldW.current, worldH.current, reducedMotion.current)

    // Load saved state
    const loadedState = loadState()
    
    // Apply offline progress
    if (loadedState) {
      const offlineMinutes = calculateOfflineProgress(loadedState.lastSeen)
      const stats = engine.getStats(loadedState.iqUpgrades)
      const offlineTokens = applyOfflineTrickle(offlineMinutes, stats.tokensPerSec)
      
      if (offlineTokens > 0) {
        updateTokens(offlineTokens)
      }
    }

    // Update spawn cooldown based on upgrades
    const state = getState()
    if (state) {
      const spawnCooldown = GAME_CONFIG.BASE_SPAWN / (1 + state.upgrades.spawnRate * 0.15)
      // Note: This would need to be passed to the engine or handled differently
    }

    return () => {
      // Cleanup is handled by individual hooks
    }
  }, [enabled, engine, loadState, updateTokens, calculateOfflineProgress, applyOfflineTrickle, getState])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newW = window.innerWidth
      const newH = window.innerHeight
      
      if (worldW.current !== newW || worldH.current !== newH) {
        const sx = newW / worldW.current
        const sy = newH / worldH.current
        
        worldW.current = newW
        worldH.current = newH
        
        // Update engine world dimensions
        engine.initialize(newW, newH, reducedMotion.current)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [engine])

  // Main game loop
  useEffect(() => {
    if (!enabled) return

    let raf = 0
    lastTick.current = performance.now()

    const step = () => {
      const now = performance.now()
      let deltaTime = (now - lastTick.current) / 1000
      lastTick.current = now

      // Cap delta time to prevent large jumps
      if (deltaTime > 0.25) deltaTime = 0.25

      // Get current state
      const state = getState()
      if (state) {
        // Simulate game step
        engine.simulate(deltaTime, state.upgrades, state.iqUpgrades)
        
        // Update rendering snapshot
        updateSnapshot(0) // parallaxY would come from parent component
        
        // Render to canvases
        renderAll()
      }

      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [enabled, engine, getState, updateSnapshot, renderAll])

  // API object
  const api: GalaxyAPI = {
    getDrawSnapshot,
    registerCanvas,
    clickAt: handleClick,
    purchase: purchaseUpgrade,
    purchaseIQ: purchaseIQUpgrade,
    triggerEffect,
    getStats,
  }

  return {
    state: uiState,
    api,
    parallaxY: 0, // This would be passed from parent component
  }
}
