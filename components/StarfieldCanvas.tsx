"use client"

import { useEffect, useRef } from "react"

type Star = {
  x: number
  y: number
  layer: number
  size: number
  twinkleSpeed: number
  twinklePhase: number
  color: string
}

export type StarfieldCanvasProps = {
  enabled: boolean
  parallaxY: number
  getTargetFps?: () => number
  lowQuality?: boolean
}

export default function StarfieldCanvas({ enabled, parallaxY, getTargetFps, lowQuality = false }: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const starsRef = useRef<Star[]>([])
  const layersRef = useRef<number>(4)
  const lastFrameRef = useRef<number>(performance.now())
  const frameBudgetRef = useRef<number>(1000 / Math.max(1, getTargetFps?.() || 30))
  const visibleRef = useRef<boolean>(true)
  const parallaxYRef = useRef<number>(parallaxY || 0)
  const fpsFnRef = useRef<() => number>(() => 30)

  // Colors by layer (subtle)
  const LAYER_COLORS = [
    "#93c5fd", // light blue
    "#a78bfa", // violet
    "#818cf8", // indigo
    "#60a5fa", // blue
  ]

  // Initialize and handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const build = () => {
      const w = canvas.clientWidth || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight
      const area = Math.max(1, w * h)
      // Density tuned for stability; lower on lowQuality
      const density = lowQuality ? 0.00012 : 0.00025  // Increased density
      let count = Math.floor(area * density)
      count = Math.max(200, Math.min(1000, count))  // More stars
      const layers = layersRef.current
      const list: Star[] = new Array(count)
      // Spread slightly beyond viewport so parallax doesn't expose gaps
      const padX = w * 0.6
      const padY = h * 0.6
      for (let i = 0; i < count; i++) {
        const layer = i % layers
        list[i] = {
          x: (Math.random() * (w + padX * 2)) - (w * 0.5 + padX),
          y: (Math.random() * (h + padY * 2)) - (h * 0.5 + padY),
          layer,
          size: Math.max(1.0, 1.8 - layer * 0.25) * (lowQuality ? 0.9 : 1),
          twinkleSpeed: 0.3 + Math.random() * 0.7,
          twinklePhase: Math.random() * Math.PI * 2,
          color: LAYER_COLORS[layer % LAYER_COLORS.length],
        }
      }
      starsRef.current = list
    }

    const onResize = () => {
      // Resize backing store to DPR
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      const ctx = canvas.getContext("2d", { alpha: true })
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      build()
    }

    onResize()
    const ro = new ResizeObserver(onResize)
    ro.observe(canvas)
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [lowQuality])

  // Keep parallax and fps function in refs without recreating render loop
  useEffect(() => { parallaxYRef.current = parallaxY || 0 }, [parallaxY])
  useEffect(() => {
    fpsFnRef.current = getTargetFps || (() => 30)
    frameBudgetRef.current = 1000 / Math.max(1, fpsFnRef.current())
  }, [getTargetFps])

  // Visibility tracking updates budget and pause/resume
  useEffect(() => {
    const onVis = () => {
      visibleRef.current = !document.hidden
      frameBudgetRef.current = 1000 / Math.max(1, fpsFnRef.current())
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Render loop
  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let raf = 0
    let t0 = performance.now()

    const parallaxFactors = [-0.001, -0.0005, 0.0008, 0.001]

    const draw = () => {
      const now = performance.now()
      const dt = now - lastFrameRef.current
      const budget = frameBudgetRef.current
      if (!visibleRef.current || dt < budget) {
        raf = requestAnimationFrame(draw)
        return
      }
      lastFrameRef.current = now
      frameBudgetRef.current = 1000 / Math.max(1, fpsFnRef.current())

      const w = window.innerWidth
      const h = window.innerHeight


      // Fallback: initialize stars if not built yet
      if (starsRef.current.length === 0 && w > 0 && h > 0) {
        const area = Math.max(1, w * h)
        const density = lowQuality ? 0.00012 : 0.00025  // Increased density
        let count = Math.floor(area * density)
        count = Math.max(200, Math.min(1000, count))  // More stars
        const layers = layersRef.current
        const list: Star[] = new Array(count)
        const padX = w * 0.6, padY = h * 0.6
        for (let i = 0; i < count; i++) {
          const layer = i % layers
          list[i] = {
            x: (Math.random() * (w + padX * 2)) - (w * 0.5 + padX),
            y: (Math.random() * (h + padY * 2)) - (h * 0.5 + padY),
            layer,
            size: Math.max(1.0, 1.8 - layer * 0.25) * (lowQuality ? 0.9 : 1),
            twinkleSpeed: 0.3 + Math.random() * 0.7,
            twinklePhase: Math.random() * Math.PI * 2,
            color: LAYER_COLORS[layer % LAYER_COLORS.length],
          }
        }
        starsRef.current = list
      }
      // Clear canvas and set up drawing
      ctx.clearRect(0, 0, w, h)


      const cx = w * 0.5
      const cy = h * 0.5
      const stars = starsRef.current
      const layers = layersRef.current
      // Reduced motion support: disable twinkle when user prefers reduced motion
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      let drawnCount = 0
      for (let layer = 0; layer < layers; layer++) {
        const parY = parallaxYRef.current * (parallaxFactors[layer] || 0)
        for (let i = layer; i < stars.length; i += layers) {
          const s = stars[i]
          const x = cx + s.x
          const y = cy + s.y + parY
          // Simple culling to skip offscreen work (account for page size)
          const cullMargin = s.size * 4
          if (x < -cullMargin || y < -cullMargin || x > w + cullMargin || y > h + cullMargin) continue
          drawnCount++
          const alpha = prefersReduced ? 0.9 : (0.75 + 0.25 * Math.sin(s.twinklePhase + now * 0.001 * s.twinkleSpeed))
          // Tiny rects per README/PERF guidance (faster than arcs)
          ctx.globalAlpha = Math.min(0.8, alpha * 0.7)
          ctx.fillStyle = s.color
          const sz = Math.max(1, Math.round(s.size))
          ctx.fillRect(x, y, sz, sz)
        }
      }


      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [enabled, lowQuality])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 1 }}
    />
  )
}


