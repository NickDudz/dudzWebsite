"use client"

import { useEffect, useState, useRef } from "react"

export type FpsCounterProps = {
  show: boolean
  getCurrentFps?: () => number
  getTargetFps?: () => number
  getRenderStats?: () => { outliers: { rendered: number; total: number; limit: number }; ambient: { rendered: number; total: number; limit: number }; clustered: { rendered: number; total: number; limit: number }; cores: { rendered: number; total: number; limit: number }; unlockables: { rendered: number; total: number; limit: number }; buffer: { used: number; total: number; available: number } }
  className?: string
}

export default function FpsCounter({ show, getCurrentFps, getTargetFps, getRenderStats, className }: FpsCounterProps) {
  const [fps, setFps] = useState(0)
  const [trueFps, setTrueFps] = useState(0)
  const [targetFps, setTargetFps] = useState(30)
  const [renderStats, setRenderStats] = useState<{ outliers: { rendered: number; total: number; limit: number }; ambient: { rendered: number; total: number; limit: number }; clustered: { rendered: number; total: number; limit: number }; cores: { rendered: number; total: number; limit: number }; unlockables: { rendered: number; total: number; limit: number }; buffer: { used: number; total: number; available: number } } | null>(null)
  const [showRenderStats, setShowRenderStats] = useState(false)
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
      if (getRenderStats) {
        setRenderStats(getRenderStats())
      }
    }, 250) // Update 4 times per second

    return () => clearInterval(interval)
  }, [show, getCurrentFps, getTargetFps, getRenderStats])

  if (!show) return null

  // Color coding based on FPS performance (use true FPS for more accurate assessment)
  const getColorClass = () => {
    const percentage = trueFps / targetFps
    if (percentage >= 0.95) return "text-green-400 border-green-500/30"
    if (percentage >= 0.8) return "text-yellow-400 border-yellow-500/30"
    return "text-red-400 border-red-500/30"
  }

  // Color coding for render stats based on culling status
  const getCullingColor = (rendered: number, total: number, limit: number) => {
    if (total === 0) return "text-zinc-500" // No objects of this type
    if (rendered === total) return "text-green-400" // All rendered
    if (rendered >= limit) return "text-yellow-400" // At limit but some culled
    if (rendered < total * 0.5) return "text-red-400" // Heavy culling
    return "text-orange-400" // Moderate culling
  }

  const getBufferColor = (used: number, total: number) => {
    const percentage = used / total
    if (percentage >= 0.9) return "text-red-400"
    if (percentage >= 0.7) return "text-yellow-400"
    return "text-green-400"
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
          <button
            onClick={() => setShowRenderStats(!showRenderStats)}
            className="text-zinc-400 hover:text-zinc-300 text-[10px] underline pointer-events-auto"
          >
            {showRenderStats ? 'Hide' : 'Show'} Render Stats
          </button>
        </div>
      </div>
      
      {showRenderStats && renderStats && (
        <div className="mt-2 px-2 py-1 text-xs font-mono rounded border bg-black/80 backdrop-blur-sm border-zinc-600/30">
          <div className="flex flex-col gap-1">
            <div className="text-zinc-300 font-semibold mb-1">Render Statistics</div>
            
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Outliers:</span>
              <span className={getCullingColor(renderStats.outliers.rendered, renderStats.outliers.total, renderStats.outliers.limit)}>
                {renderStats.outliers.rendered}/{renderStats.outliers.total} (limit: {renderStats.outliers.limit})
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Ambient:</span>
              <span className={getCullingColor(renderStats.ambient.rendered, renderStats.ambient.total, renderStats.ambient.limit)}>
                {renderStats.ambient.rendered}/{renderStats.ambient.total} (limit: {renderStats.ambient.limit})
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Clustered:</span>
              <span className={getCullingColor(renderStats.clustered.rendered, renderStats.clustered.total, renderStats.clustered.limit)}>
                {renderStats.clustered.rendered}/{renderStats.clustered.total} (limit: {renderStats.clustered.limit})
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Cores:</span>
              <span className={getCullingColor(renderStats.cores.rendered, renderStats.cores.total, renderStats.cores.limit)}>
                {renderStats.cores.rendered}/{renderStats.cores.total} (limit: {renderStats.cores.limit})
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Unlockables:</span>
              <span className={getCullingColor(renderStats.unlockables.rendered, renderStats.unlockables.total, renderStats.unlockables.limit)}>
                {renderStats.unlockables.rendered}/{renderStats.unlockables.total} (limit: {renderStats.unlockables.limit})
              </span>
            </div>
            
            <div className="border-t border-zinc-600/30 pt-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Buffer:</span>
                <span className={getBufferColor(renderStats.buffer.used, renderStats.buffer.total)}>
                  {renderStats.buffer.used}/{renderStats.buffer.total} ({Math.round(renderStats.buffer.used/renderStats.buffer.total*100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Available:</span>
                <span className="text-zinc-300">{renderStats.buffer.available}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
