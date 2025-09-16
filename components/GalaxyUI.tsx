"use client"

import { useMemo, useState } from "react"
import type { Upgrades } from "../hooks/useClusteringGalaxy"
// Use shared math for costs
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { upgradeCost } = require("../hooks/galaxyMath.js") as { upgradeCost: (k: keyof Upgrades, level: number) => number }

export type GalaxyUIProps = {
  state: { tokens: number; iq: number; upgrades: Upgrades; iqUpgrades?: { computeMult: number; autoCollect: number; confettiUnlocked: boolean; paletteUnlocked: boolean } }
  api: { purchase: (k: keyof Upgrades, qty?: number) => void; purchaseIQ?: (k: 'computeMult' | 'autoCollect' | 'confetti' | 'palette') => void; triggerEffect: (name: "confetti" | "palette") => void; getStats?: () => { tokensPerSec: number; coresByLevel: number[]; totalEverCollected: number; currentFloatingData: number }; getExtremeMode?: () => boolean; setExtremeMode?: (v: boolean) => void; debug?: { addTokens: (amount: number) => void; addIQ: (amount: number) => void; addCores: (levels: number[]) => void; setUpgradeLevel: (upgradeKey: keyof Upgrades, level: number) => void; setIQUpgradeLevel: (upgradeKey: 'computeMult' | 'autoCollect' | 'confettiUnlocked' | 'paletteUnlocked', level: number) => void; setExtremeMode?: (v: boolean) => void } }
  onToggle: () => void
  enabled?: boolean
  collapsed?: boolean
  onCollapsedChange?: (v: boolean) => void
  sidebar?: boolean
  onSidebarToggle?: () => void
}

export default function GalaxyUI({ state, api, onToggle, enabled = true, collapsed = true, onCollapsedChange, sidebar = false, onSidebarToggle }: GalaxyUIProps) {
  const [buyQuantity, setBuyQuantity] = useState(1)
  const rows = useMemo(() => ([
    { key: "spawnRate", label: "Data Ingest", desc: "- spawn chance frequency" },
    { key: "spawnQty", label: "Spawn Qty", desc: "spawn multiple per wave (max 5)" },
    { key: "clickYield", label: "Label Quality", desc: "+1 click tokens / level" },
    { key: "batchCollect", label: "Mini-Batch", desc: "+10% chance/level; collect all" },
  ] as { key: keyof Upgrades; label: string; desc: string }[]), [])
  const iqUp = state.iqUpgrades || { computeMult: 0, autoCollect: 0, confettiUnlocked: false, paletteUnlocked: false }
  const stats = api.getStats ? api.getStats() : { tokensPerSec: 0, coresByLevel: [0,0,0,0,0], totalEverCollected: 0, currentFloatingData: 0 }
  const totalCores = stats.coresByLevel.reduce((a, b) => a + b, 0)

  const coreColors = useMemo(() => ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"], [])
  const primaryGradientStops = useMemo(() => {
    const first = coreColors[0]
    const mid = coreColors[Math.min(2, coreColors.length - 1)]
    const last = coreColors[Math.max(coreColors.length - 1, 0)]
    return `${first}, ${mid}, ${last}`
  }, [coreColors])
  const coreGradientStyle = useMemo(() => ({
    backgroundImage: `linear-gradient(90deg, ${primaryGradientStops})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  }), [primaryGradientStops])

  // Top-right trigger button (dropdown opener)
  const trigger = (
    <div className="fixed top-4 right-4 z-30 pointer-events-auto">
      <button
        onClick={() => onCollapsedChange && onCollapsedChange(!collapsed)}
        className="group inline-flex items-center gap-2 rounded-md border border-zinc-700/50 bg-zinc-900/70 px-3 py-2 text-[11px] font-medium text-zinc-300 shadow-sm backdrop-blur-sm transition hover:bg-zinc-800/70 hover:border-zinc-600/60"
        aria-expanded={!collapsed}
        aria-controls="galaxy-ui-panel"
      >
        <span style={coreGradientStyle} className="tracking-tight">Data Continuum Idle</span>
        <svg className="h-3 w-3 text-zinc-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 011.04 1.08l-4.24 3.833a.75.75 0 01-1.04 0L5.21 8.29a.75.75 0 01.02-1.08z" />
        </svg>
      </button>
    </div>
  )

  // Core colors matching the game engine - blue and purple gradient, no dots for L1-L5
  // (defined above)

  // Common sticky header content for both dropdown and sidebar
  const Header = (
    <div className="sticky top-0 z-10 border-b border-zinc-700/50 bg-zinc-900/95 backdrop-blur px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="font-semibold text-sm" style={coreGradientStyle}>Data Continuum Idle</div>
        <div className="text-right text-sm space-x-4">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span className="text-blue-200 font-medium">Tokens: {Math.floor(state.tokens)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
            <span className="text-emerald-200 font-medium">IQ: {Math.floor(state.iq || 0)}</span>
          </span>
        </div>
      </div>

      {/* Cores with proper colors */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span className="text-zinc-400 font-semibold">Cores:</span>
          {stats.coresByLevel.map((count, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i >= 5 && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: coreColors[Math.min(i, coreColors.length - 1)] }}
                ></span>
              )}
              <span style={{ color: coreColors[Math.min(i, coreColors.length - 1)] }}>L{i+1}: {count}</span>
            </span>
          ))}
          <span className="ml-auto text-zinc-400 font-medium">Total: {totalCores}</span>
        </div>
      </div>

      {/* Stats with better separation */}
      <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-zinc-800/40 rounded">
          <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
          <span className="text-amber-200">Data Collected: {Math.floor(stats.totalEverCollected || 0)}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-zinc-800/40 rounded">
          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
          <span className="text-purple-200">Data Processing: {stats.currentFloatingData || 0}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-zinc-400">Upgrades</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (onCollapsedChange) {
                onCollapsedChange(true)
              }
            }}
            className="rounded border border-zinc-700/70 bg-zinc-800/60 px-2 py-1 text-[10px] font-medium hover:bg-zinc-700/60 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => onSidebarToggle && onSidebarToggle()}
            className="rounded border border-blue-500/70 bg-blue-500/15 px-2 py-1 text-[10px] font-medium hover:bg-blue-500/20 transition-colors"
          >
            {sidebar ? 'Compact' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Buy Quantity Selector - moved to bottom */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-zinc-400">Buy Quantity</div>
        <div className="flex gap-1">
          {[1, 5, 20].map(qty => (
            <button
              key={qty}
              onClick={() => setBuyQuantity(qty)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                buyQuantity === qty
                  ? 'bg-blue-500/20 border border-blue-500/70 text-blue-300'
                  : 'bg-zinc-800/60 border border-zinc-700/70 text-zinc-300 hover:bg-zinc-700/60'
              }`}
            >
              {qty}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // Dropdown panel (compact) - narrower than sidebar
  const DropdownPanel = (
    <div id="galaxy-ui-panel" role="region" aria-label="Clustering Galaxy Controls"
      className="fixed right-3 top-12 z-40 w-[90vw] max-w-[22rem] max-h-[75vh] overflow-y-auto small-scrollbar rounded-lg border border-zinc-700/60 bg-zinc-900/95 backdrop-blur text-zinc-200 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
      {Header}
      <div className="space-y-1">
        {/* Token Upgrades */}
        <div className="px-4 py-3">
          <div className="text-[11px] font-semibold text-zinc-400 mb-3 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Token Upgrades
          </div>
          <div className="space-y-3">
            {rows.map((r) => {
              const lvl = (state.upgrades[r.key] ?? 0) as number
              const cost = upgradeCost(r.key, lvl)
              const totalCost = Array.from({length: buyQuantity}, (_, i) => upgradeCost(r.key, lvl + i)).reduce((a, b) => a + b, 0)
              const can = state.tokens >= totalCost
              return (
                <div key={r.key} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-zinc-200">{r.label} <span className="text-[12px] text-zinc-400">Lv {lvl}</span></div>
                      <div className="text-[12px] text-zinc-400 mt-0.5">{r.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => api.purchase(r.key, buyQuantity)}
                    disabled={!can}
                    className={`w-full rounded-lg px-4 py-3 text-[14px] font-semibold transition-all ${
                      can
                        ? "border border-blue-500/70 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 shadow-sm hover:shadow-blue-500/20"
                        : "border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed"
                    }`}
                    aria-label={`Buy ${buyQuantity}x ${r.label} upgrade${buyQuantity > 1 ? 's' : ''} for ${totalCost} tokens`}
                  >
                    Buy {buyQuantity > 1 ? `${buyQuantity}x` : ''} ({totalCost} tokens)
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-emerald-500/30 mx-4"></div>

        <div className="px-4 py-3">
          <div className="text-[11px] font-semibold text-zinc-400 mb-3 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            IQ Upgrades
          </div>
          <div className="space-y-3">
          {(() => {
            const lvl = (state.upgrades as any).dataQuality ?? 0
            return (
              <>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-zinc-200">Silver Tier <span className="text-[12px] text-zinc-400">(2 data/click)</span></div>
                      <div className="text-[12px] text-zinc-400 mt-0.5">Costs 10 IQ; requires Bronze</div>
                    </div>
                  </div>
                  <button
                    onClick={() => api.purchase && api.purchase('dataQuality' as any)}
                    disabled={lvl >= 1}
                    className={`w-full rounded-lg px-4 py-3 text-[14px] font-semibold transition-all ${
                      lvl >= 1
                        ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                        : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                    }`}
                  >
                    {lvl >= 1 ? 'Unlocked ✓' : 'Buy (10 IQ)'}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-zinc-200">Gold Tier <span className="text-[12px] text-zinc-400">(3 data/click)</span></div>
                      <div className="text-[12px] text-zinc-400 mt-0.5">Costs 100 IQ; requires Silver</div>
                    </div>
                  </div>
                  <button
                    onClick={() => api.purchase && api.purchase('dataQuality' as any)}
                    disabled={lvl < 1 || lvl >= 2}
                    className={`w-full rounded-lg px-4 py-3 text-[14px] font-semibold transition-all ${
                      (lvl < 1 || lvl >= 2)
                        ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                        : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                    }`}
                  >
                    {lvl >= 2 ? 'Unlocked ✓' : 'Buy (100 IQ)'}
                  </button>
                </div>
              </>
            )
          })()}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-zinc-200">Compute Multiplier <span className="text-[12px] text-zinc-400">Lv {iqUp.computeMult} (x{Math.pow(2, iqUp.computeMult)})</span></div>
                <div className="text-[12px] text-zinc-400 mt-0.5">Scales passive tokens by 2x per level</div>
              </div>
            </div>
            <button
              onClick={() => api.purchaseIQ && api.purchaseIQ('computeMult')}
              className="w-full rounded-lg px-4 py-3 text-[14px] font-semibold border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20 transition-all"
            >
              Buy ({Math.pow(2, iqUp.computeMult)} IQ)
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-zinc-200">Auto Collect <span className="text-[12px] text-zinc-400">Lv {iqUp.autoCollect} ({(5/Math.pow(2, Math.max(0, iqUp.autoCollect))).toFixed(2)}s)</span></div>
                <div className="text-[12px] text-zinc-400 mt-0.5">Auto-capture 1 data every interval</div>
              </div>
            </div>
            <button
              onClick={() => api.purchaseIQ && api.purchaseIQ('autoCollect')}
              className="w-full rounded-lg px-4 py-3 text-[14px] font-semibold border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20 transition-all"
            >
              Buy ({Math.pow(2, iqUp.autoCollect)} IQ)
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-zinc-200">Cosmetics</div>
                <div className="text-[12px] text-zinc-400 mt-0.5">Unlock Confetti / Palette (1 IQ each)</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => api.purchaseIQ && api.purchaseIQ('confetti')}
                disabled={iqUp.confettiUnlocked}
                className={`flex-1 rounded-lg px-4 py-3 text-[14px] font-semibold transition-all ${
                  iqUp.confettiUnlocked
                    ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                    : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                }`}
              >
                {iqUp.confettiUnlocked ? 'Confetti ✓' : 'Confetti (1 IQ)'}
              </button>
              <button
                onClick={() => api.purchaseIQ && api.purchaseIQ('palette')}
                disabled={iqUp.paletteUnlocked}
                className={`flex-1 rounded-lg px-4 py-3 text-[14px] font-semibold transition-all ${
                  iqUp.paletteUnlocked
                    ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                    : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                }`}
              >
                {iqUp.paletteUnlocked ? 'Palette ✓' : 'Palette (1 IQ)'}
              </button>
            </div>
          </div>

          {/* Debug Buttons */}
          <div className="border-t border-zinc-700/50 pt-3 mt-3">
            <div className="text-[11px] font-semibold text-zinc-400 mb-2">Debug Controls</div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => api.debug?.addTokens(1000)}
                className="flex-1 rounded px-3 py-2 text-[12px] font-medium border border-blue-500/70 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 transition-colors"
              >
                💰 +1000 Tokens
              </button>
              <button
                onClick={() => api.debug?.addIQ(100)}
                className="flex-1 rounded px-3 py-2 text-[12px] font-medium border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 transition-colors"
              >
                🧠 +100 IQ
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => api.debug?.addCores([1, 2, 3, 4, 5])}
                className="w-full rounded px-3 py-2 text-[12px] font-medium border border-purple-500/70 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 transition-colors"
              >
                ⚡ Add All 5 Levels (L1-L5)
              </button>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => api.debug?.addCores([level])}
                    className="flex-1 rounded px-2 py-1 text-[11px] font-medium border border-purple-500/70 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 transition-colors"
                  >
                    L{level}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-zinc-400 mb-1">Set Upgrade Levels:</div>
              <div className="grid grid-cols-2 gap-1">
                {rows.map((r) => (
                  <div key={r.key} className="space-y-1">
                    <div className="text-[10px] text-zinc-400">{r.label}</div>
                    <div className="flex gap-1">
                      {[0, 1, 5, 10].map(level => (
                        <button
                          key={level}
                          onClick={() => api.debug?.setUpgradeLevel(r.key, level)}
                          className="flex-1 rounded px-1 py-0.5 text-[9px] font-medium border border-orange-500/70 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 transition-colors"
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Debug tools (dev only) */}
        {api.debug?.addCores && (
          <div className="px-4 py-3">
            <div className="text-[11px] font-semibold text-zinc-400 mb-2">Debug</div>
            <button
              onClick={() => {
                const arr: number[] = []
                for (let r = 0; r < 20; r++) arr.push(1, 2, 3, 4, 5)
                api.debug!.addCores(arr)
              }}
              className="w-full rounded border border-zinc-700/70 bg-zinc-800/60 px-3 py-2 text-[12px] font-semibold text-zinc-200 hover:bg-zinc-700/60 transition"
            >
              Spawn 20× cores (L1–L5)
            </button>
            {api.setExtremeMode && (
              <button
                onClick={() => api.setExtremeMode && api.setExtremeMode(!api.getExtremeMode?.())}
                className="mt-2 w-full rounded border border-red-600/60 bg-red-600/20 px-3 py-2 text-[12px] font-semibold text-red-200 hover:bg-red-600/30 transition"
              >
                Toggle Extreme Mode
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Sidebar (expanded)
  const Sidebar = (
    <div className="fixed inset-y-0 right-0 z-50 w-[100vw] sm:w-[24rem] border-l border-zinc-700/60 bg-zinc-900/95 backdrop-blur text-zinc-200 shadow-[0_0_28px_rgba(59,130,246,0.25)] overflow-y-auto small-scrollbar">
      {Header}
      <div className="space-y-1">
        {/* Token Upgrades */}
        <div className="px-4 py-4">
          <div className="text-[12px] font-semibold text-zinc-400 mb-4 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Token Upgrades
          </div>
          <div className="space-y-4">
            {rows.map((r) => {
              const lvl = (state.upgrades[r.key] ?? 0) as number
              const cost = upgradeCost(r.key, lvl)
              const totalCost = Array.from({length: buyQuantity}, (_, i) => upgradeCost(r.key, lvl + i)).reduce((a, b) => a + b, 0)
              const can = state.tokens >= totalCost
              return (
                <div key={r.key} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-zinc-200">{r.label} <span className="text-[12px] text-zinc-400">Lv {lvl}</span></div>
                      <div className="text-[12px] text-zinc-400 mt-1">{r.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => api.purchase(r.key, buyQuantity)}
                    disabled={!can}
                    className={`w-full rounded-lg px-4 py-3 text-[15px] font-semibold transition-all ${
                      can
                        ? "border border-blue-500/70 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 shadow-sm hover:shadow-blue-500/20"
                        : "border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed"
                    }`}
                    aria-label={`Buy ${buyQuantity}x ${r.label} upgrade${buyQuantity > 1 ? 's' : ''} for ${totalCost} tokens`}
                  >
                    Buy {buyQuantity > 1 ? `${buyQuantity}x` : ''} ({totalCost} tokens)
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-emerald-500/30 mx-4"></div>

        <div className="px-4 py-4">
          <div className="text-[12px] font-semibold text-zinc-400 mb-4 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            IQ Upgrades
          </div>
          <div className="space-y-4">
          {(() => {
            const lvl = (state.upgrades as any).dataQuality ?? 0
            return (
              <>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-zinc-200">Silver Tier <span className="text-[12px] text-zinc-400">(2 data/click)</span></div>
                      <div className="text-[12px] text-zinc-400 mt-1">Costs 10 IQ; requires Bronze</div>
                    </div>
                  </div>
                  <button
                    onClick={() => api.purchase && api.purchase('dataQuality' as any)}
                    disabled={lvl >= 1}
                    className={`w-full rounded-lg px-4 py-3 text-[15px] font-semibold transition-all ${
                      lvl >= 1
                        ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                        : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                    }`}
                  >
                    {lvl >= 1 ? 'Unlocked ✓' : 'Buy (10 IQ)'}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-zinc-200">Gold Tier <span className="text-[12px] text-zinc-400">(3 data/click)</span></div>
                      <div className="text-[12px] text-zinc-400 mt-1">Costs 100 IQ; requires Silver</div>
                    </div>
                  </div>
                  <button
                    onClick={() => api.purchase && api.purchase('dataQuality' as any)}
                    disabled={lvl < 1 || lvl >= 2}
                    className={`w-full rounded-lg px-4 py-3 text-[15px] font-semibold transition-all ${
                      (lvl < 1 || lvl >= 2)
                        ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                        : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                    }`}
                  >
                    {lvl >= 2 ? 'Unlocked ✓' : 'Buy (100 IQ)'}
                  </button>
                </div>
              </>
            )
          })()}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-zinc-200">Compute Multiplier <span className="text-[12px] text-zinc-400">Lv {iqUp.computeMult} (x{Math.pow(2, iqUp.computeMult)})</span></div>
                <div className="text-[12px] text-zinc-400 mt-1">Scales passive tokens by 2x per level</div>
              </div>
            </div>
            <button
              onClick={() => api.purchaseIQ && api.purchaseIQ('computeMult')}
              className="w-full rounded-lg px-4 py-3 text-[15px] font-semibold border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20 transition-all"
            >
              Buy ({Math.pow(2, iqUp.computeMult)} IQ)
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-zinc-200">Auto Collect <span className="text-[12px] text-zinc-400">Lv {iqUp.autoCollect} ({(5/Math.pow(2, Math.max(0, iqUp.autoCollect))).toFixed(2)}s)</span></div>
                <div className="text-[12px] text-zinc-400 mt-1">Auto-capture 1 data every interval</div>
              </div>
            </div>
            <button
              onClick={() => api.purchaseIQ && api.purchaseIQ('autoCollect')}
              className="w-full rounded-lg px-4 py-3 text-[15px] font-semibold border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20 transition-all"
            >
              Buy ({Math.pow(2, iqUp.autoCollect)} IQ)
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-zinc-200">Cosmetics</div>
                <div className="text-[12px] text-zinc-400 mt-1">Unlock Confetti / Palette (1 IQ each)</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => api.purchaseIQ && api.purchaseIQ('confetti')}
                disabled={iqUp.confettiUnlocked}
                className={`flex-1 rounded-lg px-4 py-3 text-[15px] font-semibold transition-all ${
                  iqUp.confettiUnlocked
                    ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                    : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                }`}
              >
                {iqUp.confettiUnlocked ? 'Confetti ✓' : 'Confetti (1 IQ)'}
              </button>
              <button
                onClick={() => api.purchaseIQ && api.purchaseIQ('palette')}
                disabled={iqUp.paletteUnlocked}
                className={`flex-1 rounded-lg px-4 py-3 text-[15px] font-semibold transition-all ${
                  iqUp.paletteUnlocked
                    ? 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                    : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'
                }`}
              >
                {iqUp.paletteUnlocked ? 'Palette ✓' : 'Palette (1 IQ)'}
              </button>
            </div>
          </div>

          {/* Debug Buttons */}
          <div className="border-t border-zinc-700/50 pt-4 mt-4">
            <div className="text-[11px] font-semibold text-zinc-400 mb-3">Debug Controls</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => api.debug?.addTokens(1000)}
                  className="rounded-lg px-3 py-2 text-[13px] font-medium border border-blue-500/70 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 transition-colors"
                >
                  💰 +1000 Tokens
                </button>
                <button
                  onClick={() => api.debug?.addIQ(100)}
                  className="rounded-lg px-3 py-2 text-[13px] font-medium border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 transition-colors"
                >
                  🧠 +100 IQ
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => api.debug?.addCores([1, 2, 3, 4, 5])}
                  className="w-full rounded-lg px-3 py-2 text-[13px] font-medium border border-purple-500/70 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 transition-colors"
                >
                  ⚡ Add All 5 Levels (L1-L5)
                </button>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => api.debug?.addCores([level])}
                      className="rounded px-2 py-1 text-[11px] font-medium border border-purple-500/70 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 transition-colors"
                    >
                      L{level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-zinc-400">Set Upgrade Levels:</div>
                <div className="grid grid-cols-2 gap-2">
                  {rows.map((r) => (
                    <div key={r.key} className="space-y-1">
                      <div className="text-[10px] text-zinc-400">{r.label}</div>
                      <div className="grid grid-cols-4 gap-1">
                        {[0, 1, 5, 10].map(level => (
                          <button
                            key={level}
                            onClick={() => api.debug?.setUpgradeLevel(r.key, level)}
                            className="rounded px-1 py-0.5 text-[10px] font-medium border border-orange-500/70 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 transition-colors"
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {trigger}
      {!collapsed && !sidebar && DropdownPanel}
      {sidebar && Sidebar}
    </>
  )
}






