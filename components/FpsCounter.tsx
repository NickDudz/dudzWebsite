"use client"

import { useEffect, useState, useRef } from "react"

export type FpsCounterProps = {
  show: boolean
  getCurrentFps?: () => number
  getTargetFps?: () => number
  className?: string
}

export default function FpsCounter({ show, getCurrentFps, getTargetFps, className }: FpsCounterProps) {
  const [fps, setFps] = useState(0)
  const [trueFps, setTrueFps] = useState(0)
  const [targetFps, setTargetFps] = useState(30)
  const frameCountRef = useRef(0)
  const lastMeasureRef = useRef(performance.now())

  // Measure true browser FPS independently
  useEffect(() => {
    if (!show) return

    let raf: number

    const measureTrueFps = () => {
      frameCountRef.current++
      const now = performance.now()
      const elapsed = now - lastMeasureRef.current

      if (elapsed >= 1000) {
        setTrueFps(Math.round((frameCountRef.current * 1000) / elapsed))
        frameCountRef.current = 0
        lastMeasureRef.current = now
      }

      raf = requestAnimationFrame(measureTrueFps)
    }

    raf = requestAnimationFrame(measureTrueFps)
    return () => cancelAnimationFrame(raf)
  }, [show])

  useEffect(() => {
    if (!show) return

    const interval = setInterval(() => {
      if (getCurrentFps) {
        setFps(getCurrentFps())
      }
      if (getTargetFps) {
        setTargetFps(getTargetFps())
      }
    }, 250) // Update 4 times per second

    return () => clearInterval(interval)
  }, [show, getCurrentFps, getTargetFps])

  if (!show) return null

  // Color coding based on FPS performance (use true FPS for more accurate assessment)
  const getColorClass = () => {
    const percentage = trueFps / targetFps
    if (percentage >= 0.95) return "text-green-400 border-green-500/30"
    if (percentage >= 0.8) return "text-yellow-400 border-yellow-500/30"
    return "text-red-400 border-red-500/30"
  }

  return (
    <div className={className || "fixed top-4 left-4 z-40 pointer-events-none"}>
      <div className={`px-2 py-1 text-xs font-mono rounded border bg-black/60 backdrop-blur-sm ${getColorClass()}`}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Browser:</span>
            <span className="font-semibold">{trueFps}</span>
            <span className="text-zinc-500">/{targetFps}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Game:</span>
            <span className="font-semibold">{fps}</span>
            <span className="text-zinc-500">fps</span>
          </div>
        </div>
      </div>
    </div>
  )
}
