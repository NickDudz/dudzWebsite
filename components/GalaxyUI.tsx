"use client"

import { useMemo } from "react"
import type { Upgrades } from "../hooks/useClusteringGalaxy"
// Use shared math for costs
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { upgradeCost } = require("../hooks/galaxyMath.js") as { upgradeCost: (k: keyof Upgrades, level: number) => number }

export type GalaxyUIProps = {
  state: { tokens: number; iq: number; upgrades: Upgrades; iqUpgrades?: { computeMult: number; autoCollect: number; confettiUnlocked: boolean; paletteUnlocked: boolean } }
  api: { purchase: (k: keyof Upgrades) => void; purchaseIQ?: (k: 'computeMult' | 'autoCollect' | 'confetti' | 'palette') => void; triggerEffect: (name: "confetti" | "palette") => void; getStats?: () => { tokensPerSec: number; coresByLevel: number[] } }
  onToggle: () => void
  enabled?: boolean
  centered?: boolean
  collapsed?: boolean
  onCollapsedChange?: (v: boolean) => void
}

export default function GalaxyUI({ state, api, onToggle, enabled = true, centered = false, collapsed = false, onCollapsedChange }: GalaxyUIProps) {
  const rows = useMemo(() => ([
    { key: "spawnRate", label: "Data Ingest", desc: "↑ spawn chance frequency" },
    { key: "spawnQty", label: "Spawn Qty", desc: "spawn multiple per wave (max 5)" },
    { key: "clickYield", label: "Label Quality", desc: "+1 click tokens / level" },
    { key: "batchCollect", label: "Mini-Batch", desc: "+10% chance/level; collect all" },
  ] as { key: keyof Upgrades; label: string; desc: string }[]), [])
  const iqUp = state.iqUpgrades || { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false }
  const stats = api.getStats ? api.getStats() : { tokensPerSec: 0, coresByLevel: [0,0,0,0,0] }
  // Track highest core level seen permanently for header display
  const maxLevelNow = (() => {
    for (let i = 5; i >= 1; i--) if (stats.coresByLevel[i-1] > 0) return i
    return 1
  })()

  const pos = "fixed left-1/2 top-3 -translate-x-1/2"

  if (collapsed) {
    return (
      <div className={`${pos} z-40`}>
        <button onClick={() => onCollapsedChange && onCollapsedChange(false)}
          className="rounded-md border border-zinc-700/70 bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-200 backdrop-blur-sm shadow">
          Data Continuum Clicker HUD ▾▴
        </button>
      </div>
    )
  }

  return (
    <div
      className={`${pos} z-40 rounded-md border border-zinc-700/60 bg-zinc-900/80 text-xs text-zinc-200 backdrop-blur-sm shadow-[0_0_18px_rgba(59,130,246,0.13)] transition-transform duration-300 ease-out max-h-72 overflow-y-auto small-scrollbar`}
      role="region"
      aria-label="Clustering Galaxy Controls"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-700/50 px-3 py-2">
        <div className="font-semibold text-[11px]">Data Continuum Clicker HUD</div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-zinc-300">TPS: {Math.round(stats.tokensPerSec)}</span>
          <span className="text-zinc-400">Cores:</span>
          <span className="text-zinc-300">
            L1 {stats.coresByLevel[0]}
            {maxLevelNow >= 2 && <> · L2 {stats.coresByLevel[1]}</>}
            {maxLevelNow >= 3 && <> · L3 {stats.coresByLevel[2]}</>}
            {maxLevelNow >= 4 && <> · L4 {stats.coresByLevel[3]}</>}
            {maxLevelNow >= 5 && <> · L5 {stats.coresByLevel[4]}</>}
          </span>
        </div>
        <div>
          <button onClick={() => onCollapsedChange && onCollapsedChange(true)} className="rounded-sm border border-zinc-700/70 bg-zinc-800/60 px-2 py-1 text-[11px]">Collapse</button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-700/50 px-3 py-2">
        <button
          onClick={onToggle}
          className="rounded-sm border border-zinc-700/70 bg-zinc-900/60 px-2 py-1 text-[11px] hover:border-zinc-600 hover:text-zinc-100"
          aria-pressed={enabled}
          aria-label="Toggle Clustering Galaxy"
        >
          Galaxy: {enabled ? "On" : "Off"}
        </button>
        <div className="min-w-[8.5rem] text-right space-x-2" aria-live="polite" aria-atomic>
          <span>Tokens: {Math.floor(state.tokens)}</span>
          <span className="text-emerald-400">IQ: {Math.floor(state.iq || 0)}</span>
        </div>
      </div>
      <div className="px-3 pt-2 text-[10px] font-semibold text-zinc-400">Upgrades</div>
      <div className="max-h-48 overflow-y-auto small-scrollbar">
        {rows.map((r) => {
          const lvl = state.upgrades[r.key]
          const cost = upgradeCost(r.key, lvl)
          const can = state.tokens >= cost
          return (
            <div key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold">{r.label} <span className="text-[10px] text-zinc-400">Lv {lvl}</span></div>
                <div className="truncate text-[10px] text-zinc-400">{r.desc}</div>
              </div>
              <button
                onClick={() => api.purchase(r.key)}
                disabled={!can}
                className={`rounded-sm px-2 py-1 text-[11px] ${can ? "border border-blue-500/70 bg-blue-500/10 hover:bg-blue-500/15" : "border border-zinc-700/70 bg-zinc-800/50 text-zinc-400"}`}
                aria-label={`Buy ${r.label} upgrade for ${cost} tokens`}
              >
                Buy ({cost})
              </button>
            </div>
          )
        })}
      </div>
      <div className="border-t border-zinc-700/50 px-3 pt-2 text-[10px] font-semibold text-zinc-400">IQ Upgrades</div>
      <div className="px-3 pb-2 space-y-2 max-h-56 overflow-y-auto small-scrollbar">
        {/* Data Quality tiers under IQ */}
        {(() => {
          const lvl = (state.upgrades as any).dataQuality ?? 0 // 0=Bronze,1=Silver,2=Gold
          return (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold">Silver Tier <span className="text-[10px] text-zinc-400">(2 data/click)</span></div>
                  <div className="truncate text-[10px] text-zinc-400">Costs 10 IQ; requires Bronze</div>
                </div>
                <button onClick={() => api.purchase && api.purchase('dataQuality' as any)} disabled={lvl >= 1}
                  className={`rounded-sm px-2 py-1 text-[11px] ${lvl >= 1 ? 'border border-zinc-700/70 bg-zinc-800/50 text-zinc-400' : 'border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/15'}`}>{lvl >= 1 ? 'Unlocked' : 'Buy (IQ 10)'}</button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold">Gold Tier <span className="text-[10px] text-zinc-400">(3 data/click)</span></div>
                  <div className="truncate text-[10px] text-zinc-400">Costs 100 IQ; requires Silver</div>
                </div>
                <button onClick={() => api.purchase && api.purchase('dataQuality' as any)} disabled={lvl < 1 || lvl >= 2}
                  className={`rounded-sm px-2 py-1 text-[11px] ${(lvl < 1 || lvl >= 2) ? 'border border-zinc-700/70 bg-zinc-800/50 text-zinc-400' : 'border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/15'}`}>{lvl >= 2 ? 'Unlocked' : 'Buy (IQ 100)'}</button>
              </div>
            </>
          )
        })()}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold">Compute Multiplier <span className="text-[10px] text-zinc-400">Lv {iqUp.computeMult} (x{Math.pow(2, iqUp.computeMult)})</span></div>
            <div className="truncate text-[10px] text-zinc-400">Scales passive tokens by 2x per level</div>
          </div>
          <button onClick={() => api.purchaseIQ && api.purchaseIQ('computeMult')} className={`rounded-sm px-2 py-1 text-[11px] border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/15`}>Buy (IQ {Math.pow(2, iqUp.computeMult)})</button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold">Auto Collect <span className="text-[10px] text-zinc-400">Lv {iqUp.autoCollect} ({(5/Math.pow(2, Math.max(0, iqUp.autoCollect))).toFixed(2)}s)</span></div>
            <div className="truncate text-[10px] text-zinc-400">Auto-capture 1 data every interval</div>
          </div>
          <button onClick={() => api.purchaseIQ && api.purchaseIQ('autoCollect')} className={`rounded-sm px-2 py-1 text-[11px] border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/15`}>Buy (IQ {Math.pow(2, iqUp.autoCollect)})</button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold">Cosmetics</div>
            <div className="truncate text-[10px] text-zinc-400">Unlock Confetti / Palette (1 IQ each)</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => api.purchaseIQ && api.purchaseIQ('confetti')} disabled={iqUp.confettiUnlocked}
              className={`rounded-sm px-2 py-1 text-[11px] ${iqUp.confettiUnlocked ? 'border border-zinc-700/70 bg-zinc-800/50 text-zinc-400' : 'border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/15'}`}>{iqUp.confettiUnlocked ? 'Confetti ✓' : 'Confetti (1 IQ)'}</button>
            <button onClick={() => api.purchaseIQ && api.purchaseIQ('palette')} disabled={iqUp.paletteUnlocked}
              className={`rounded-sm px-2 py-1 text-[11px] ${iqUp.paletteUnlocked ? 'border border-zinc-700/70 bg-zinc-800/50 text-zinc-400' : 'border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/15'}`}>{iqUp.paletteUnlocked ? 'Palette ✓' : 'Palette (1 IQ)'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}




