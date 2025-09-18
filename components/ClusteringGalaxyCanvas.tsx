"use client"

import { useEffect, useRef } from "react"
import type { DrawSnapshot } from "../hooks/useClusteringGalaxy"

export type ClusteringGalaxyCanvasProps = {
  enabled: boolean
  parallaxY: number
  api: { getDrawSnapshot(): DrawSnapshot; registerCanvas: (c: HTMLCanvasElement | null) => () => void; clickAt: (x: number, y: number) => void; startDrag: (x: number, y: number) => boolean; updateDrag: (x: number, y: number) => void; endDrag: () => void }
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

    let isDragging = false
    let hasMoved = false
    let dragStartCoords = { x: 0, y: 0 }

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (!enabled) return

      const coords = getCanvasCoords(e.clientX, e.clientY)
      dragStartCoords = coords
      isDragging = false
      hasMoved = false
      console.log('Pointer down at:', coords.x, coords.y)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!enabled) return

      const coords = getCanvasCoords(e.clientX, e.clientY)

      // Check if we've moved enough to consider this a drag
      const moveDistance = Math.hypot(coords.x - dragStartCoords.x, coords.y - dragStartCoords.y)
      if (moveDistance > 10 && !isDragging) { // 10px threshold
        console.log('Movement detected, trying to start drag...')
        // Try to start dragging
        const dragStarted = api.startDrag(dragStartCoords.x, dragStartCoords.y)
        console.log('Drag start result:', dragStarted)
        if (dragStarted) {
          isDragging = true
          canvas.setPointerCapture(e.pointerId)
        }
      }

      if (isDragging) {
        hasMoved = true
        api.updateDrag(coords.x, coords.y)
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!enabled) return

      if (isDragging) {
        // End drag
        api.endDrag()
        canvas.releasePointerCapture(e.pointerId)
        isDragging = false
      } else if (!hasMoved) {
        // Quick click without significant movement
        api.clickAt(dragStartCoords.x, dragStartCoords.y)
      }
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (isDragging) {
        api.endDrag()
        canvas.releasePointerCapture(e.pointerId)
      }
      isDragging = false
      hasMoved = false
    }

    // Add pointer events for better cross-device support
    canvas.addEventListener("pointerdown", handlePointerDown)
    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("pointerup", handlePointerUp)
    canvas.addEventListener("pointercancel", handlePointerCancel)

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown)
      canvas.removeEventListener("pointermove", handlePointerMove)
      canvas.removeEventListener("pointerup", handlePointerUp)
      canvas.removeEventListener("pointercancel", handlePointerCancel)
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
