// Persistence Hook - Handles save/load functionality

import { useCallback, useEffect, useRef } from 'react'
import { GAME_CONFIG } from '../constants/gameConstants'
import type { PersistedState } from '../types/gameTypes'

export function usePersistence(
  enabled: boolean,
  getState: () => PersistedState | null,
  saveState: () => void
) {
  const saveTimeoutRef = useRef<number | undefined>(undefined)

  // Auto-save periodically
  useEffect(() => {
    if (!enabled) return

    const scheduleSave = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        saveState()
        scheduleSave() // Schedule next save
      }, GAME_CONFIG.PERSIST_INTERVAL)
    }

    scheduleSave()

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [enabled, saveState])

  // Save on page unload
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = () => {
      saveState()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, saveState])

  // Calculate offline progress
  const calculateOfflineProgress = useCallback((lastSeen: number) => {
    const now = Date.now()
    const minutes = (now - lastSeen) / 60000
    return Math.min(minutes, 60 * 24) // Cap at 24 hours
  }, [])

  // Apply offline trickle
  const applyOfflineTrickle = useCallback((offlineMinutes: number, tokensPerSec: number) => {
    if (offlineMinutes <= 0) return 0

    const tokensPerMinute = tokensPerSec * 60
    const offlineTokens = Math.floor(tokensPerMinute * offlineMinutes)
    return Math.max(0, offlineTokens)
  }, [])

  // Force save (for manual saves)
  const forceSave = useCallback(() => {
    saveState()
  }, [saveState])

  // Clear save data
  const clearSaveData = useCallback(() => {
    try {
      localStorage.removeItem('galaxy.tokens')
      localStorage.removeItem('galaxy.iq')
      localStorage.removeItem('galaxy.upgrades')
      localStorage.removeItem('galaxy.iqUpgrades')
      localStorage.removeItem('galaxy.lastSeen')
    } catch (error) {
      console.warn('Failed to clear save data:', error)
    }
  }, [])

  // Export save data
  const exportSaveData = useCallback(() => {
    const state = getState()
    if (!state) return null

    try {
      return JSON.stringify(state, null, 2)
    } catch (error) {
      console.warn('Failed to export save data:', error)
      return null
    }
  }, [getState])

  // Import save data
  const importSaveData = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data) as PersistedState
      
      // Validate the data structure
      if (
        typeof parsed.tokens === 'number' &&
        typeof parsed.iq === 'number' &&
        typeof parsed.upgrades === 'object' &&
        typeof parsed.iqUpgrades === 'object' &&
        typeof parsed.lastSeen === 'number'
      ) {
        // Save to localStorage
        localStorage.setItem('galaxy.tokens', String(parsed.tokens))
        localStorage.setItem('galaxy.iq', String(parsed.iq))
        localStorage.setItem('galaxy.upgrades', JSON.stringify(parsed.upgrades))
        localStorage.setItem('galaxy.iqUpgrades', JSON.stringify(parsed.iqUpgrades))
        localStorage.setItem('galaxy.lastSeen', String(parsed.lastSeen))
        
        return true
      } else {
        console.warn('Invalid save data format')
        return false
      }
    } catch (error) {
      console.warn('Failed to import save data:', error)
      return false
    }
  }, [])

  return {
    calculateOfflineProgress,
    applyOfflineTrickle,
    forceSave,
    clearSaveData,
    exportSaveData,
    importSaveData,
  }
}
