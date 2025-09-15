// Performance Monitoring Hook - Tracks FPS and performance metrics

import { useRef, useCallback, useEffect } from 'react'
import type { ClusteringGalaxyEngine } from '../engine/ClusteringGalaxyEngine'

interface PerformanceMetrics {
  currentFps: number
  targetFps: number
  frameTime: number
  pointCount: number
  clusterCount: number
  averageFps: number
  minFps: number
  maxFps: number
  frameDrops: number
}

export function usePerformanceMonitoring(engine: ClusteringGalaxyEngine) {
  const metrics = useRef<PerformanceMetrics>({
    currentFps: 0,
    targetFps: 60,
    frameTime: 16.67,
    pointCount: 0,
    clusterCount: 0,
    averageFps: 0,
    minFps: 60,
    maxFps: 0,
    frameDrops: 0,
  })

  const fpsHistory = useRef<number[]>([])
  const lastUpdateTime = useRef<number>(0)
  const frameDropThreshold = 45 // Consider it a frame drop if FPS < 45

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const engineMetrics = engine.getPerformanceMetrics()
    const now = performance.now()
    
    // Update basic metrics
    metrics.current.currentFps = engineMetrics.currentFps
    metrics.current.targetFps = engineMetrics.targetFps
    metrics.current.frameTime = engineMetrics.frameTime
    metrics.current.pointCount = engineMetrics.pointCount
    metrics.current.clusterCount = engineMetrics.clusterCount

    // Track FPS history for average calculation
    if (engineMetrics.currentFps > 0) {
      fpsHistory.current.push(engineMetrics.currentFps)
      
      // Keep only last 60 frames (1 second at 60 FPS)
      if (fpsHistory.current.length > 60) {
        fpsHistory.current.shift()
      }

      // Calculate average FPS
      const sum = fpsHistory.current.reduce((a, b) => a + b, 0)
      metrics.current.averageFps = sum / fpsHistory.current.length

      // Update min/max FPS
      metrics.current.minFps = Math.min(metrics.current.minFps, engineMetrics.currentFps)
      metrics.current.maxFps = Math.max(metrics.current.maxFps, engineMetrics.currentFps)

      // Count frame drops
      if (engineMetrics.currentFps < frameDropThreshold) {
        metrics.current.frameDrops++
      }
    }

    lastUpdateTime.current = now
  }, [engine])

  // Set target FPS
  const setTargetFps = useCallback((fps: number) => {
    engine.setTargetFps(fps)
    metrics.current.targetFps = fps
    metrics.current.frameTime = 1000 / fps
  }, [engine])

  // Reset performance counters
  const resetMetrics = useCallback(() => {
    metrics.current = {
      currentFps: 0,
      targetFps: 60,
      frameTime: 16.67,
      pointCount: 0,
      clusterCount: 0,
      averageFps: 0,
      minFps: 60,
      maxFps: 0,
      frameDrops: 0,
    }
    fpsHistory.current = []
    lastUpdateTime.current = 0
  }, [])

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metrics.current }
  }, [])

  // Check if performance is good
  const isPerformanceGood = useCallback(() => {
    return metrics.current.currentFps >= frameDropThreshold && 
           metrics.current.averageFps >= 50
  }, [])

  // Get performance status
  const getPerformanceStatus = useCallback(() => {
    const fps = metrics.current.currentFps
    const avgFps = metrics.current.averageFps

    if (fps >= 55 && avgFps >= 55) {
      return { status: 'excellent', color: 'green', message: 'Smooth performance' }
    } else if (fps >= 45 && avgFps >= 45) {
      return { status: 'good', color: 'yellow', message: 'Good performance' }
    } else if (fps >= 30 && avgFps >= 30) {
      return { status: 'fair', color: 'orange', message: 'Fair performance' }
    } else {
      return { status: 'poor', color: 'red', message: 'Poor performance' }
    }
  }, [])

  // Auto-adjust performance based on metrics
  const autoAdjustPerformance = useCallback(() => {
    const status = getPerformanceStatus()
    
    if (status.status === 'poor' && metrics.current.targetFps > 30) {
      // Reduce target FPS for better stability
      setTargetFps(30)
      console.log('Performance: Auto-reduced FPS to 30 for better stability')
    } else if (status.status === 'excellent' && metrics.current.targetFps < 60) {
      // Increase target FPS for better quality
      setTargetFps(60)
      console.log('Performance: Auto-increased FPS to 60 for better quality')
    }
  }, [getPerformanceStatus, setTargetFps])

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(updateMetrics, 1000) // Update every second
    return () => clearInterval(interval)
  }, [updateMetrics])

  return {
    updateMetrics,
    setTargetFps,
    resetMetrics,
    getMetrics,
    isPerformanceGood,
    getPerformanceStatus,
    autoAdjustPerformance,
  }
}
