"use client"

import { useEffect, useRef } from "react"
import type { DrawSnapshot } from "../hooks/useClusteringGalaxy"

export type ClusteringGalaxyCanvasProps = {
  enabled: boolean
  parallaxY: number
  api: { getDrawSnapshot(): DrawSnapshot; registerCanvas: (c: HTMLCanvasElement | null) => () => void; clickAt: (x: number, y: number) => void }
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

  // Map clicks to hook clickAt
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !api?.clickAt) return
    const onClick = (e: MouseEvent) => {
      if (!enabled) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      console.log('Canvas click:', { x, y, canvasSize: { w: canvas.clientWidth, h: canvas.clientHeight }, rect })
      api.clickAt(x, y)
    }
    canvas.addEventListener("click", onClick)
    return () => canvas.removeEventListener("click", onClick)
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
