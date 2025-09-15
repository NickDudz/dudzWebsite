// Rendering Hook - Handles canvas rendering and draw state

import { useRef, useCallback, useEffect } from 'react'
import { ClusteringGalaxyEngine } from '../engine/ClusteringGalaxyEngine'
import type { DrawSnapshot } from '../types/gameTypes'

export function useRendering(engine: ClusteringGalaxyEngine) {
  const snapshot = useRef<DrawSnapshot>({ width: 0, height: 0, parallaxY: 0, points: [] })
  const canvases = useRef<Set<HTMLCanvasElement>>(new Set())

  // Register canvas for rendering
  const registerCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvases.current.add(canvas)
    }
    return () => {
      if (canvas) {
        canvases.current.delete(canvas)
      }
    }
  }, [])

  // Get current draw snapshot
  const getDrawSnapshot = useCallback((): DrawSnapshot => {
    return snapshot.current
  }, [])

  // Update snapshot from engine
  const updateSnapshot = useCallback((parallaxY: number) => {
    snapshot.current = engine.generateDrawSnapshot(parallaxY)
  }, [engine])

  // Render to all registered canvases
  const renderAll = useCallback(() => {
    const snap = snapshot.current
    if (snap.points.length === 0) return

    canvases.current.forEach(canvas => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Group points by color and alpha for batch rendering
      const pointGroups = new Map<string, typeof snap.points>()
      
      snap.points.forEach(point => {
        if (point.alpha <= 0) return
        
        const key = `${point.color}-${Math.round(point.alpha * 10)}`
        if (!pointGroups.has(key)) {
          pointGroups.set(key, [])
        }
        pointGroups.get(key)!.push(point)
      })

      // Render each group with shared settings
      pointGroups.forEach((points, key) => {
        if (points.length === 0) return

        const firstPoint = points[0]
        ctx.save()
        ctx.globalAlpha = firstPoint.alpha
        ctx.fillStyle = getColor(firstPoint.color)
        
        // Apply glow if any point in group has it
        const hasGlow = points.some(p => p.glow > 0)
        if (hasGlow) {
          ctx.shadowColor = getColor(firstPoint.color)
          ctx.shadowBlur = Math.max(...points.map(p => p.glow)) * 10
        }

        // Batch render points with same settings
        points.forEach(point => {
          drawPoint(ctx, point.x, point.y, point.radius, point.shape, point.variant)
        })
        
        ctx.restore()
      })
    })
  }, [])

  // Draw a single point
  const drawPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    shape: 'icon' | 'circle' | 'square' | 'diamond',
    variant: number
  ) => {
    switch (shape) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'square':
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
        break
      case 'diamond':
        ctx.beginPath()
        ctx.moveTo(x, y - radius)
        ctx.lineTo(x + radius, y)
        ctx.lineTo(x, y + radius)
        ctx.lineTo(x - radius, y)
        ctx.closePath()
        ctx.fill()
        break
      case 'icon':
      default:
        // Draw data point icon
        drawDataPointIcon(ctx, x, y, radius, variant)
        break
    }
  }, [])

  // Draw data point icon
  const drawDataPointIcon = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    variant: number
  ) => {
    const size = radius * 2
    const icons = [
      // Variant 0: Circle with dot
      () => {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2)
        ctx.fill()
      },
      // Variant 1: Square with cross
      () => {
        ctx.strokeRect(x - radius, y - radius, size, size)
        ctx.beginPath()
        ctx.moveTo(x - radius * 0.5, y)
        ctx.lineTo(x + radius * 0.5, y)
        ctx.moveTo(x, y - radius * 0.5)
        ctx.lineTo(x, y + radius * 0.5)
        ctx.stroke()
      },
      // Variant 2: Diamond
      () => {
        ctx.beginPath()
        ctx.moveTo(x, y - radius)
        ctx.lineTo(x + radius, y)
        ctx.lineTo(x, y + radius)
        ctx.lineTo(x - radius, y)
        ctx.closePath()
        ctx.stroke()
      },
      // Variant 3: Triangle
      () => {
        ctx.beginPath()
        ctx.moveTo(x, y - radius)
        ctx.lineTo(x - radius, y + radius)
        ctx.lineTo(x + radius, y + radius)
        ctx.closePath()
        ctx.stroke()
      },
      // Variant 4: Hexagon
      () => {
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3
          const px = x + Math.cos(angle) * radius
          const py = y + Math.sin(angle) * radius
          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.closePath()
        ctx.stroke()
      }
    ]

    const iconIndex = variant % icons.length
    icons[iconIndex]()
  }, [])

  // Get color for point
  const getColor = useCallback((colorIndex: number) => {
    const colors = [
      '#3b82f6', // Blue
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
    ]
    return colors[colorIndex % colors.length]
  }, [])

  return {
    registerCanvas,
    getDrawSnapshot,
    updateSnapshot,
    renderAll,
  }
}

// Helper function to get color
function getColor(colorIndex: number): string {
  const colors = [
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
  ]
  return colors[colorIndex % colors.length]
}
