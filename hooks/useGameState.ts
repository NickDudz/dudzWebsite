// Game State Management Hook - Handles state persistence and UI updates

import { useState, useRef, useCallback } from 'react'
import { PERSISTENCE_KEYS } from '../constants/gameConstants'
import type { GalaxyState, PersistedState, Upgrades, IQUpgrades } from '../types/gameTypes'

export function useGameState() {
  const [uiState, setUiState] = useState<GalaxyState>(() => ({
    tokens: 0,
    iq: 0,
    upgrades: { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 },
    iqUpgrades: { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false },
  }))

  const persisted = useRef<PersistedState | null>(null)

  // Load state from localStorage
  const loadState = useCallback(() => {
    try {
      const tokensRaw = localStorage.getItem(PERSISTENCE_KEYS.TOKENS)
      const iqRaw = localStorage.getItem(PERSISTENCE_KEYS.IQ)
      const upgradesRaw = localStorage.getItem(PERSISTENCE_KEYS.UPGRADES)
      const iqUpRaw = localStorage.getItem(PERSISTENCE_KEYS.IQ_UPGRADES)
      const lastSeenRaw = localStorage.getItem(PERSISTENCE_KEYS.LAST_SEEN)

      const tokens = tokensRaw ? parseInt(tokensRaw, 10) || 0 : 0
      const iq = iqRaw ? parseInt(iqRaw, 10) || 0 : 0
      const upgrades: Upgrades = upgradesRaw ? JSON.parse(upgradesRaw) : { 
        spawnRate: 0, 
        spawnQty: 0, 
        clickYield: 0, 
        batchCollect: 0 
      }
      const iqUpgrades: IQUpgrades = iqUpRaw ? JSON.parse(iqUpRaw) : { 
        computeMult: 0, 
        autoCollect: 0, 
        confettiUnlocked: false, 
        paletteUnlocked: false 
      }
      const lastSeen = lastSeenRaw ? parseInt(lastSeenRaw, 10) || Date.now() : Date.now()

      persisted.current = { tokens, iq, upgrades, iqUpgrades, lastSeen }
      setUiState({ tokens, iq, upgrades, iqUpgrades })

      return { tokens, iq, upgrades, iqUpgrades, lastSeen }
    } catch (error) {
      console.warn('Failed to load game state from localStorage:', error)
      // Initialize with default values if localStorage fails
      const defaultState = {
        tokens: 0,
        iq: 0,
        upgrades: { spawnRate: 0, spawnQty: 0, clickYield: 0, batchCollect: 0 },
        iqUpgrades: { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false },
        lastSeen: Date.now()
      }
      persisted.current = defaultState
      setUiState(defaultState)
      return defaultState
    }
  }, [])

  // Save state to localStorage
  const saveState = useCallback(() => {
    if (!persisted.current) return

    try {
      localStorage.setItem(PERSISTENCE_KEYS.TOKENS, String(persisted.current.tokens))
      localStorage.setItem(PERSISTENCE_KEYS.UPGRADES, JSON.stringify(persisted.current.upgrades))
      localStorage.setItem(PERSISTENCE_KEYS.IQ_UPGRADES, JSON.stringify(persisted.current.iqUpgrades))
      localStorage.setItem(PERSISTENCE_KEYS.IQ, String(persisted.current.iq))
      localStorage.setItem(PERSISTENCE_KEYS.LAST_SEEN, String(Date.now()))
    } catch (error) {
      console.warn('Failed to save game state to localStorage:', error)
    }
  }, [])

  // Update tokens
  const updateTokens = useCallback((amount: number) => {
    if (!persisted.current) return
    persisted.current.tokens += amount
    setUiState(prev => ({ ...prev, tokens: persisted.current!.tokens }))
  }, [])

  // Update IQ
  const updateIQ = useCallback((amount: number) => {
    if (!persisted.current) return
    persisted.current.iq += amount
    setUiState(prev => ({ ...prev, iq: persisted.current!.iq }))
  }, [])

  // Update upgrades
  const updateUpgrades = useCallback((upgrades: Partial<Upgrades>) => {
    if (!persisted.current) return
    persisted.current.upgrades = { ...persisted.current.upgrades, ...upgrades }
    setUiState(prev => ({ ...prev, upgrades: persisted.current!.upgrades }))
  }, [])

  // Update IQ upgrades
  const updateIQUpgrades = useCallback((iqUpgrades: Partial<IQUpgrades>) => {
    if (!persisted.current) return
    persisted.current.iqUpgrades = { ...persisted.current.iqUpgrades, ...iqUpgrades }
    setUiState(prev => ({ ...prev, iqUpgrades: persisted.current!.iqUpgrades }))
  }, [])

  // Get current state
  const getState = useCallback(() => {
    return persisted.current
  }, [])

  // Get UI state
  const getUIState = useCallback(() => {
    return uiState
  }, [uiState])

  return {
    uiState,
    persisted: persisted.current,
    loadState,
    saveState,
    updateTokens,
    updateIQ,
    updateUpgrades,
    updateIQUpgrades,
    getState,
    getUIState,
  }
}
