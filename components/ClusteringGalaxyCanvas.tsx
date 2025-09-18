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

    let dragStartTime = 0
    let isDragging = false

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
      dragStartTime = Date.now()

      // Try to start dragging first (longer press for drag)
      // If no draggable point found, it will fall back to click
      setTimeout(() => {
        if (!isDragging && Date.now() - dragStartTime > 150) { // 150ms delay to distinguish click from drag
          const dragStarted = api.startDrag(coords.x, coords.y)
          if (dragStarted) {
            isDragging = true
            canvas.setPointerCapture(e.pointerId)
          }
        }
      }, 150)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!enabled) return

      const coords = getCanvasCoords(e.clientX, e.clientY)

      if (isDragging) {
        // Update drag position
        api.updateDrag(coords.x, coords.y)
      } else if (Date.now() - dragStartTime > 150) {
        // Late start drag if we haven't started yet but moved enough
        const dragStarted = api.startDrag(coords.x, coords.y)
        if (dragStarted) {
          isDragging = true
          canvas.setPointerCapture(e.pointerId)
        }
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!enabled) return

      const coords = getCanvasCoords(e.clientX, e.clientY)
      const dragDuration = Date.now() - dragStartTime

      if (isDragging) {
        // End drag
        api.endDrag()
        canvas.releasePointerCapture(e.pointerId)
      } else if (dragDuration < 150) {
        // Quick click
        api.clickAt(coords.x, coords.y)
      }

      isDragging = false
      dragStartTime = 0
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (isDragging) {
        api.endDrag()
        canvas.releasePointerCapture(e.pointerId)
      }
      isDragging = false
      dragStartTime = 0
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
