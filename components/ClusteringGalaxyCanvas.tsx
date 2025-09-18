"use client"

import { useEffect, useRef } from "react"
import type { DrawSnapshot } from "../hooks/useClusteringGalaxy"

export type ClusteringGalaxyCanvasProps = {
  enabled: boolean
  parallaxY: number
  api: { getDrawSnapshot(): DrawSnapshot; registerCanvas: (c: HTMLCanvasElement | null) => () => void; clickAt: (x: number, y: number) => void; startDrag: (x: number, y: number) => boolean; updateDrag: (x: number, y: number) => void; endDrag: (velocityX: number, velocityY: number) => void; getDragAndDropEnabled: () => boolean }
}

/**
 * Single <canvas> renderer. No state beyond maintaining the 2D context binding.
 * - Renders whatever the hook projects in its DrawSnapshot via the hook-managed RAF.
 * - Applies a small vertical translate proportional to parallaxY (handled by hook snapshot too).
 * - Keeps pointer events off for the page; only the canvas captures clicks.
 */
export default function ClusteringGalaxyCanvas({ enabled, parallaxY, api }: ClusteringGalaxyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const unregisterRef = useRef<() => void>(() => {})

  // Register canvas with the hook so its single RAF can draw into it
  useEffect(() => {
    if (!canvasRef.current || !api?.registerCanvas) return
    unregisterRef.current = api.registerCanvas(canvasRef.current)
    return () => unregisterRef.current?.()
  }, [api])

  // Resize observer to keep backing store sized to CSS box
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        // Let the hook redraw on next tick
      }
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // Clear immediately when disabled
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    if (!enabled) {
      const ctx = c.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, c.clientWidth, c.clientHeight)
      }
    }
  }, [enabled])

  // Handle mouse/touch events for clicks and drag-and-drop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !api?.clickAt || !api?.startDrag || !api?.updateDrag || !api?.endDrag) return

    // Centralized drag state management
    const dragState = {
      isActive: false,
      hasMoved: false,
      startCoords: { x: 0, y: 0 },
      attempted: false,
      pointerId: null as number | null,
      mouseHistory: [] as { x: number; y: number; time: number }[],
      lastPointerUpTime: 0,
    }

    // Enhanced mouse velocity tracking for dramatic physics effects
    const MAX_VELOCITY_HISTORY = 6 // Track more positions for smoother velocity
    const VELOCITY_SAMPLE_TIME = 50 // Sample more frequently for responsiveness

    // Centralized cleanup function
    const cleanupDragState = () => {
      console.log('🧹 Cleaning up drag state - isActive:', dragState.isActive)
      
      // Only end drag if we think we're actively dragging
      if (dragState.isActive) {
        console.log('🏁 Ending active drag in game hook')
        try {
          api.endDrag(0, 0)
        } catch (e) {
          console.warn('Failed to end drag in game hook:', e)
        }
      }
      
      // Always reset local state
      dragState.isActive = false
      dragState.hasMoved = false
      dragState.attempted = false
      dragState.pointerId = null
      dragState.mouseHistory = []
      dragState.lastPointerUpTime = performance.now()
      
      // Release pointer capture if active
      if (dragState.pointerId !== null) {
        try {
          canvas.releasePointerCapture(dragState.pointerId)
        } catch (e) {
          console.warn('Failed to release pointer capture:', e)
        }
      }
    }

    // Timeout-based cleanup to prevent stuck drags
    let cleanupTimeout: NodeJS.Timeout | null = null
    const scheduleCleanup = () => {
      if (cleanupTimeout) clearTimeout(cleanupTimeout)
      cleanupTimeout = setTimeout(() => {
        if (!dragState.isActive && dragState.lastPointerUpTime > 0) {
          const timeSinceUp = performance.now() - dragState.lastPointerUpTime
          if (timeSinceUp > 1000) { // 1 second after pointer up
            console.log('🧹 Timeout cleanup - forcing drag end in game hook')
            try {
              api.endDrag(0, 0)
            } catch (e) {
              console.warn('Failed to force end drag in timeout cleanup:', e)
            }
          }
        }
      }, 2000) // Check every 2 seconds
    }

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (!enabled) return

      // Force cleanup any existing drag state first (both local and game hook)
      console.log('🔽 Pointer down - forcing cleanup of any existing drag state')
      cleanupDragState()
      
      // Additional safety: force end any drag in game hook
      try {
        api.endDrag(0, 0)
      } catch (e) {
        console.warn('Failed to force end drag in game hook:', e)
      }

      const coords = getCanvasCoords(e.clientX, e.clientY)
      dragState.startCoords = coords
      dragState.isActive = false
      dragState.hasMoved = false
      dragState.attempted = false
      dragState.pointerId = e.pointerId
      dragState.mouseHistory = []
      console.log('🔽 Pointer down at:', coords.x.toFixed(1), coords.y.toFixed(1))
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!enabled) return

      const coords = getCanvasCoords(e.clientX, e.clientY)
      const now = performance.now()

      // Enhanced mouse velocity tracking for more dramatic physics
      if (dragState.mouseHistory.length === 0 ||
          now - dragState.mouseHistory[dragState.mouseHistory.length - 1].time > VELOCITY_SAMPLE_TIME) {
        dragState.mouseHistory.push({ x: coords.x, y: coords.y, time: now })
        if (dragState.mouseHistory.length > MAX_VELOCITY_HISTORY) {
          dragState.mouseHistory.shift() // Keep only recent history
        }
      }

      // CRITICAL: Check if we're already dragging FIRST
      if (dragState.isActive) {
        dragState.hasMoved = true
        api.updateDrag(coords.x, coords.y)
        return // Don't do anything else if already dragging
      }

      const moveDistance = Math.hypot(coords.x - dragState.startCoords.x, coords.y - dragState.startCoords.y)

      // Debug: Only log when we detect movement threshold
      if (!dragState.attempted && moveDistance > 8) {
        console.log('🎯 Movement detected, attempting drag at distance:', moveDistance.toFixed(1))
      }

      if (dragState.attempted) return

      // Check if we've moved enough to consider this a drag
      // Only allow drag start within reasonable distance from initial click
      const MAX_DRAG_START_DISTANCE = 100 // Increased to give more room for dragging
      if (moveDistance > 15 && moveDistance < MAX_DRAG_START_DISTANCE && !dragState.isActive && api.getDragAndDropEnabled?.()) {
        console.log('🎯 Attempting drag at distance:', moveDistance.toFixed(1), '(max:', MAX_DRAG_START_DISTANCE, ')')
        dragState.attempted = true // Prevent further attempts
        
        // Try to start dragging from current mouse position (not start position)
        const dragStarted = api.startDrag(coords.x, coords.y)
        console.log('🎯 Drag start result:', dragStarted)
        if (dragStarted) {
          dragState.isActive = true
          try {
            canvas.setPointerCapture(e.pointerId)
            dragState.pointerId = e.pointerId
            console.log('✅ Drag started successfully - isDragging set to true')
          } catch (e) {
            console.warn('Failed to set pointer capture:', e)
            // Continue with drag even if capture fails
          }
        } else {
          console.log('❌ Drag failed - no outlier found at (', coords.x.toFixed(1), coords.y.toFixed(1), ')')
          // If drag failed but game hook thinks there's an active drag, clean it up
          if (api.getDragAndDropEnabled?.()) {
            console.log('🧹 Cleaning up failed drag state in game hook')
            api.endDrag(0, 0)
          }
        }
      } else if (moveDistance >= MAX_DRAG_START_DISTANCE && !dragState.attempted) {
        // If user moved too far, prevent any drag attempts
        console.log('🚫 Moved too far for drag start:', moveDistance.toFixed(1), '>=', MAX_DRAG_START_DISTANCE)
        dragState.attempted = true // Prevent further attempts
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!enabled) return

      console.log('👆 Pointer up - isDragging:', dragState.isActive, 'hasMoved:', dragState.hasMoved, 'dragAttempted:', dragState.attempted)

      if (dragState.isActive) {
        // Enhanced mouse velocity calculation for dramatic physics
        let velocityX = 0, velocityY = 0
        if (dragState.mouseHistory.length >= 2) {
          // Use the most recent movement for velocity (more responsive)
          const recent = dragState.mouseHistory[dragState.mouseHistory.length - 1]
          const previous = dragState.mouseHistory[dragState.mouseHistory.length - 2]
          const timeDiff = recent.time - previous.time

          if (timeDiff > 0) {
            velocityX = (recent.x - previous.x) / timeDiff * 1000 // pixels per second
            velocityY = (recent.y - previous.y) / timeDiff * 1000

            // Amplify fast movements for more dramatic effect
            const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
            if (speed > 500) { // If moving fast, amplify the effect
              const amplifier = Math.min(2.5, speed / 500)
              velocityX *= amplifier
              velocityY *= amplifier
            }
          }
        }

        // End drag with velocity data for physics
        console.log('🏁 Ending drag (user released after dragging) - velocity:', velocityX.toFixed(1), velocityY.toFixed(1))
        dragState.isActive = false // Mark as inactive before calling endDrag
        api.endDrag(velocityX, velocityY)
        console.log('✅ Drag ended - point should move to nearest core with physics')
      } else if (!dragState.hasMoved && !dragState.attempted) {
        // Quick click - no movement, no drag attempted = regular click
        console.log('👆 Quick click detected - triggering click')
        api.clickAt(dragState.startCoords.x, dragState.startCoords.y)
      } else {
        // Failed drag attempt or moved too much - don't trigger click
        console.log('👆 Failed drag or moved too much - ignoring click')
      }

      // Always clean up state for next interaction
      cleanupDragState()
      
      // Schedule timeout cleanup to prevent stuck drags
      scheduleCleanup()
    }

    const handlePointerCancel = (e: PointerEvent) => {
      console.log('🚫 Pointer cancelled - cleaning up drag state')
      if (dragState.isActive) {
        console.log('🏁 Force ending drag due to pointer cancel')
        api.endDrag(0, 0)
      }
      // Always clean up state on cancel
      cleanupDragState()
    }

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent right-click context menu during drag operations
      e.preventDefault()
      console.log('🚫 Right-click detected - cancelling any active drag')
      if (dragState.isActive) {
        console.log('🏁 Force ending drag due to right-click')
        api.endDrag(0, 0)
      }
      // Always clean up state on right-click
      cleanupDragState()
    }

    const handleWindowBlur = () => {
      // Handle window blur (alt-tab, clicking outside browser, etc.)
      console.log('🚫 Window blur detected - cancelling any active drag')
      if (dragState.isActive) {
        console.log('🏁 Force ending drag due to window blur')
        api.endDrag(0, 0)
      }
      // Always clean up state on window blur
      cleanupDragState()
    }

    // Add pointer events for better cross-device support
    canvas.addEventListener("pointerdown", handlePointerDown)
    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("pointerup", handlePointerUp)
    canvas.addEventListener("pointercancel", handlePointerCancel)
    canvas.addEventListener("contextmenu", handleContextMenu)

    // Add window events for drag cleanup
    window.addEventListener("blur", handleWindowBlur)

    return () => {
      // Clean up any active drag state
      if (dragState.isActive) {
        console.log('🧹 Component unmounting - cleaning up active drag')
        api.endDrag(0, 0)
        cleanupDragState()
      }
      
      // Clear any pending cleanup timeout
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout)
      }
      
      canvas.removeEventListener("pointerdown", handlePointerDown)
      canvas.removeEventListener("pointermove", handlePointerMove)
      canvas.removeEventListener("pointerup", handlePointerUp)
      canvas.removeEventListener("pointercancel", handlePointerCancel)
      canvas.removeEventListener("contextmenu", handleContextMenu)
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [enabled, api])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-auto block h-full w-full"
      style={{ transform: `translate3d(0, ${parallaxY * 0.05}px, 0)` }}
    />
  )
}
