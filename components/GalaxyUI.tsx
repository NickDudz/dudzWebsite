"use client"

import { useMemo, useState, useEffect } from "react"
import type { Upgrades } from "../hooks/useClusteringGalaxy"
// Use shared math for costs
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { upgradeCost } = require("../hooks/galaxyMath.js") as { upgradeCost: (k: keyof Upgrades, level: number) => number }

export type GalaxyUIProps = {
  state: { tokens: number; iq: number; upgrades: Upgrades; iqUpgrades?: { computeMult: number; autoCollect: number; confettiUnlocked?: boolean; paletteUnlocked?: boolean; silverUnlocked?: boolean; goldUnlocked?: boolean; rareUnlocked?: boolean; epicUnlocked?: boolean; silverChanceLvl?: number; goldChanceLvl?: number; rareChanceLvl?: number; epicChanceLvl?: number }; cosmetics?: { coreColors?: string[] } }
  api: { purchase: (k: keyof Upgrades, qty?: number) => void; purchaseIQ?: (k: 'computeMult' | 'autoCollect' | 'silverUnlock' | 'goldUnlock' | 'rareUnlock' | 'epicUnlock' | 'silverChanceUp' | 'goldChanceUp' | 'rareChanceUp' | 'epicChanceUp') => void; triggerEffect: (name: "confetti" | "palette") => void; getStats?: () => { tokensPerSec: number; coresByLevel: number[]; totalEverCollected: number; currentFloatingData: number }; getExtremeMode?: () => boolean; setExtremeMode?: (v: boolean) => void; debug?: { addTokens: (amount: number) => void; addIQ: (amount: number) => void; addCores: (levels: number[]) => void; setUpgradeLevel: (upgradeKey: keyof Upgrades, level: number) => void; setIQUpgradeLevel: (upgradeKey: 'computeMult' | 'autoCollect' | 'confettiUnlocked' | 'paletteUnlocked', level: number) => void; setExtremeMode?: (v: boolean) => void } }
  onToggle: () => void
  enabled?: boolean
  collapsed?: boolean
  onCollapsedChange?: (v: boolean) => void
  sidebar?: boolean
  onSidebarToggle?: () => void
}

export default function GalaxyUI({ state, api, onToggle, enabled = true, collapsed = true, onCollapsedChange, sidebar = false, onSidebarToggle }: GalaxyUIProps) {
  const [buyQuantity, setBuyQuantity] = useState(1)
  const [openSections, setOpenSections] = useState<{ swarm: boolean; tokens: boolean; iq: boolean; debug: boolean }>({ swarm: true, tokens: true, iq: true, debug: false })
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number; visible: boolean }>({ text: '', x: 0, y: 0, visible: false })
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null)
  const [compactSidebar, setCompactSidebar] = useState(false)

  // Hide external toggle button when sidebar mode is active
  useEffect(() => {
    const el = document.getElementById('galaxy-ui-toggle') as HTMLElement | null
    if (!el) return
    const prev = el.style.display
    if (sidebar) {
      el.style.display = 'none'
    } else {
      el.style.display = prev || ''
    }
    return () => {
      if (el) el.style.display = prev || ''
    }
  }, [sidebar])

  useEffect(() => {
    const updatePos = () => {
      try {
        const anchor = document.getElementById('galaxy-ui-toggle')
        if (!anchor) return
        const r = anchor.getBoundingClientRect()
        // Place panel 8px below the toggle, align its right edge with the toggle's right edge
        const top = Math.round(r.bottom + 8)
        const right = Math.max(12, Math.round(window.innerWidth - r.right))
        setPanelPos({ top, right })
      } catch {}
    }
    // Compute when opening and on layout changes
    updatePos()
    const onResize = () => updatePos()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize as any)
    }
  }, [collapsed])
  const rows = useMemo(() => ([
    { key: "spawnRate", label: "Data Ingest", desc: "- spawn chance frequency" },
    { key: "spawnQty", label: "Spawn Qty", desc: "spawn multiple per wave (max 5)" },
    { key: "clickYield", label: "Label Quality", desc: "+1 click tokens / level" },
    { key: "batchCollect", label: "Mini-Batch", desc: "+10% chance/level; collect all" },
  ] as { key: keyof Upgrades; label: string; desc: string }[]), [])
  const iqUp = state.iqUpgrades || { computeMult: 0, autoCollect: 0, silverUnlocked: false, goldUnlocked: false, rareUnlocked: false, epicUnlocked: false, silverChanceLvl: 0, goldChanceLvl: 0, rareChanceLvl: 0, epicChanceLvl: 0 }
  const stats = api.getStats ? api.getStats() : { tokensPerSec: 0, coresByLevel: [0,0,0,0,0], totalEverCollected: 0, currentFloatingData: 0 }
  const totalCores = stats.coresByLevel.reduce((a, b) => a + b, 0)

  const coreColors = useMemo(() => {
    const palette = state.cosmetics?.coreColors
    if (palette && palette.length >= 2) return palette
    return ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"]
  }, [state.cosmetics?.coreColors])
  const primaryGradientStops = useMemo(() => {
    const first = coreColors[0]
    const fifth = coreColors[Math.min(4, coreColors.length - 1)]
    return `${first}, ${fifth}`
  }, [coreColors])
  const coreGradientStyle = useMemo(() => ({
    backgroundImage: `linear-gradient(90deg, ${primaryGradientStops})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  }), [primaryGradientStops])

  const quantityOptions = [1, 5, 20, 100] as const

  const renderSwarmSection = () => (
    <div className="px-4 py-3">
      <button
        onClick={() => setOpenSections((s) => ({ ...s, swarm: !s.swarm }))}
        className="w-full flex items-center justify-between text-[12px] font-semibold text-zinc-400"
      >
        <span className="inline-flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>Swarm Info</span>
        <span className="text-zinc-500">{openSections.swarm ? '▾' : '▸'}</span>
      </button>
      {openSections.swarm && (
        <div className="mt-3 space-y-3 text-[12px] text-zinc-300">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-2">
              <div className="text-[10px] text-blue-200/80">Tokens / sec</div>
              <div className="text-[13px] font-semibold text-blue-200">{stats.tokensPerSec.toFixed(2)}</div>
            </div>
            <div className="rounded border border-purple-500/40 bg-purple-500/10 px-2 py-2">
              <div className="text-[10px] text-purple-200/80">Floating Data</div>
              <div className="text-[13px] font-semibold text-purple-200">{stats.currentFloatingData}</div>
            </div>
            <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-2">
              <div className="text-[10px] text-amber-200/80">Total Collected</div>
              <div className="text-[13px] font-semibold text-amber-200">{Math.floor(stats.totalEverCollected || 0)}</div>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2 text-center">
            {stats.coresByLevel.map((count, i) => (
              <div key={i} className="rounded border border-zinc-700/60 bg-zinc-800/40 px-2 py-2">
                <div className="text-[10px] text-zinc-400">L{i + 1}</div>
                <div className="text-[12px] font-semibold" style={{ color: coreColors[Math.min(i, coreColors.length - 1)] }}>{count}</div>
              </div>
            ))}
            <div className="rounded border border-zinc-700/60 bg-zinc-800/40 px-2 py-2">
              <div className="text-[10px] text-zinc-400">Total</div>
              <div className="text-[12px] font-semibold text-zinc-200">{totalCores}</div>
            </div>
          </div>
          <div className="mt-1">
            <div className="text-[10px] text-zinc-500 mb-1">Upgrades</div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            {rows.map((r) => {
                const lvl = state.upgrades[r.key] ?? 0
                return (
                  <div
                    key={r.key}
                    className="relative"
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                      setTooltip({
                        text: `${r.label}${lvl > 0 ? ` • Lv ${lvl}` : ''}`,
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height + 8,
                        visible: true,
                      })
                    }}
                    onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded border border-blue-500/40 bg-zinc-900/60 flex items-center justify-center text-[12px] font-semibold text-blue-200">
                      {lvl > 0 ? lvl : ''}
                    </div>
                  </div>
                )
              })}
              {/* Confetti/Palette badges removed */}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderBuyQuantityRow = () => (
    <div className="px-4 pt-2 pb-3 border-t border-zinc-700/40">
      <div className="text-[11px] font-semibold text-zinc-400 mb-2">Buy Quantity</div>
      <div className="flex gap-1">
        {quantityOptions.map((qty) => (
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
  )

  const renderTokenUpgradeSection = () => (
    <div className="px-4 py-3 border-t border-zinc-700/40">
      <button
        onClick={() => setOpenSections((s) => ({ ...s, tokens: !s.tokens }))}
        className="w-full flex items-center justify-between text-[12px] font-semibold text-zinc-400"
      >
        <span className="inline-flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Token Upgrades</span>
        <span className="text-zinc-500">{openSections.tokens ? '▾' : '▸'}</span>
      </button>
      {openSections.tokens && (
        <div className="space-y-3 mt-2">
          {rows.map((r) => {
            const lvl = (state.upgrades[r.key] ?? 0) as number
            const totalCost = Array.from({ length: buyQuantity }, (_, i) => upgradeCost(r.key, lvl + i)).reduce((a, b) => a + b, 0)
            const can = state.tokens >= totalCost
            const qtyLabel = buyQuantity > 1 ? `${buyQuantity}x ` : '1x '
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
                      ? 'border border-blue-500/70 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 shadow-sm hover:shadow-blue-500/20'
                      : 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-400 cursor-not-allowed'
                  }`}
                  aria-label={`Buy ${qtyLabel}${r.label} upgrade${buyQuantity > 1 ? 's' : ''} for ${totalCost} tokens`}
                >
                  Buy {qtyLabel.trim()}({totalCost} tokens)
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderIqUpgradeSection = () => (
    <div className="px-4 py-3 border-t border-zinc-700/40">
      <button
        onClick={() => setOpenSections((s) => ({ ...s, iq: !s.iq }))}
        className="w-full flex items-center justify-between text-[12px] font-semibold text-zinc-400"
      >
        <span className="inline-flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>Data Types (IQ)</span>
        <span className="text-zinc-500">{openSections.iq ? '▾' : '▸'}</span>
      </button>
      {openSections.iq && (
        <div className="space-y-3 mt-2">
          {/* Per-tier unlocks and chance upgrades */}
          {([ 
            { key: 'silver', label: 'Silver', color: '#c0c0c0', unlockKey: 'silverUnlock', chanceKey: 'silverChanceUp', unlocked: !!iqUp.silverUnlocked, lvl: iqUp.silverChanceLvl || 0, base: 0.75 },
            { key: 'gold', label: 'Gold', color: '#ffd700', unlockKey: 'goldUnlock', chanceKey: 'goldChanceUp', unlocked: !!iqUp.goldUnlocked, lvl: iqUp.goldChanceLvl || 0, base: 0.40 },
            { key: 'rare', label: 'Rare', color: '#60a5fa', unlockKey: 'rareUnlock', chanceKey: 'rareChanceUp', unlocked: !!iqUp.rareUnlocked, lvl: iqUp.rareChanceLvl || 0, base: 0.10 },
            { key: 'epic', label: 'Epic', color: '#a855f7', unlockKey: 'epicUnlock', chanceKey: 'epicChanceUp', unlocked: !!iqUp.epicUnlocked, lvl: iqUp.epicChanceLvl || 0, base: 0.01 },
          ] as const).map(row => (
            <div key={row.key} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold" style={{ color: row.color }}>{row.label} <span className="text-[12px] text-zinc-400">Lv {row.lvl}</span></div>
                  <div className="text-[12px] text-zinc-400 mt-0.5">Per 5s roll. Base {Math.round(Math.min(1, row.base) * 100)}%, +25% per level. Effective {(Math.min(1, row.base * (1 + 0.25 * row.lvl)) * 100).toFixed(0)}%.</div>
                </div>
              </div>
              <button
                onClick={() => api.purchaseIQ && api.purchaseIQ(row.unlocked ? row.chanceKey : row.unlockKey)}
                className={`w-full rounded-lg px-4 py-3 text-[14px] font-semibold transition-all ${row.unlocked ? 'border border-blue-500/70 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 shadow-sm hover:shadow-blue-500/20' : 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 shadow-sm hover:shadow-emerald-500/20'}`}
              >
                {row.unlocked ? '+25% Chance (1 IQ)' : 'Unlock (1 IQ)'}
              </button>
            </div>
          ))}
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
          {/* Cosmetics unlocks removed; cosmetics available by default in Cosmetics panel */}
        </div>
      )}
    </div>
  )

  const renderDebugSection = () => {
    const debugAvailable = Boolean(api.debug)
    return (
      <div className="px-4 py-3 border-t border-zinc-700/40">
        <button
          onClick={() => setOpenSections((s) => ({ ...s, debug: !s.debug }))}
          className="w-full flex items-center justify-between text-[12px] font-semibold text-zinc-400"
        >
          <span className="inline-flex items-center"><span className="w-2 h-2 bg-zinc-500 rounded-full mr-2"></span>Debug Options</span>
          <span className="text-zinc-500">{openSections.debug ? '▾' : '▸'}</span>
        </button>
        {openSections.debug && (
            <div className="space-y-3 mt-2">
            <div className="flex gap-2">
              <button
                onClick={() => api.debug?.addTokens(1000)}
                disabled={!debugAvailable}
                className={`flex-1 rounded px-3 py-2 text-[12px] font-medium transition-colors ${
                  debugAvailable
                    ? 'border border-blue-500/70 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200'
                    : 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                }`}
              >
                ?? +1000 Tokens
              </button>
              <button
                onClick={() => api.debug?.addIQ(100)}
                disabled={!debugAvailable}
                className={`flex-1 rounded px-3 py-2 text-[12px] font-medium transition-colors ${
                  debugAvailable
                    ? 'border border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200'
                    : 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                }`}
              >
                ?? +100 IQ
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => api.debug?.addCores([1, 2, 3, 4, 5])}
                disabled={!debugAvailable}
                className={`w-full rounded px-3 py-2 text-[12px] font-medium transition-colors ${
                  debugAvailable
                    ? 'border border-purple-500/70 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200'
                    : 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                }`}
              >
                ? Add All 5 Levels (L1-L5)
              </button>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => api.debug?.addCores([level])}
                    disabled={!debugAvailable}
                    className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                      debugAvailable
                        ? 'border border-purple-500/70 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200'
                        : 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    L{level}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-zinc-400">Set Upgrade Levels:</div>
              <div className="grid grid-cols-2 gap-1">
                {rows.map((r) => (
                  <div key={r.key} className="space-y-1">
                    <div className="text-[10px] text-zinc-400">{r.label}</div>
                    <div className="flex gap-1">
                      {[0, 1, 5, 10].map((level) => (
                        <button
                          key={level}
                          onClick={() => api.debug?.setUpgradeLevel(r.key, level)}
                          disabled={!debugAvailable}
                          className={`flex-1 rounded px-1 py-0.5 text-[9px] font-medium transition-colors ${
                            debugAvailable
                              ? 'border border-orange-500/70 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200'
                              : 'border border-zinc-700/70 bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                          }`}
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
        )}
      </div>
    )
  }

  // Trigger button removed - now handled in page.tsx

  // Core colors matching the game engine - blue and purple gradient, no dots for L1-L5
  // (defined above)

  // Common sticky header content for both dropdown and sidebar
  const renderHeader = () => (
    <div className="sticky top-0 z-10 border-b border-zinc-700/50 bg-zinc-900/95 backdrop-blur px-4 py-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm" style={coreGradientStyle} suppressHydrationWarning>Data Continuum Idle</div>
          <div className="inline-flex items-center gap-2">
            {sidebar ? (
              <>
                {/* Close (X) button - exits sidebar and shows dropdown toggle again */}
                <button
                  onClick={() => {
                    onSidebarToggle && onSidebarToggle()
                    onCollapsedChange && onCollapsedChange(true)
                    setCompactSidebar(false)
                  }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded border border-zinc-600/70 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60"
                  aria-label="Close sidebar"
                  title="Close sidebar"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {/* Down arrow toggle - compact 42% height mode */}
                <button
                  onClick={() => setCompactSidebar((v) => !v)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded border border-zinc-600/70 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60"
                  aria-label={compactSidebar ? 'Expand sidebar to full height' : 'Condense sidebar to 42% height'}
                  title={compactSidebar ? 'Expand to full' : 'Condense to 42%'}
                >
                  {compactSidebar ? (
                    // Up arrow when compact (to expand)
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.915l-3.71 3.354a.75.75 0 11-1.04-1.08l4.24-3.833a.75.75 0 011.04 0l4.24 3.833c.3.27.32.74.05 1.04z" />
                    </svg>
                  ) : (
                    // Down arrow when full (to compact)
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 011.04 1.08l-4.24 3.833a.75.75 0 01-1.04 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Close (X) button for dropdown - simply collapse */}
                <button
                  onClick={() => onCollapsedChange && onCollapsedChange(true)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded border border-zinc-600/70 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60"
                  aria-label="Close panel"
                  title="Close"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {/* Down arrow in dropdown - open sidebar in compact mode */}
                <button
                  onClick={() => { setCompactSidebar(true); onSidebarToggle && onSidebarToggle() }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded border border-zinc-600/70 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60"
                  aria-label="Open compact sidebar"
                  title="Open compact sidebar"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 011.04 1.08l-4.24 3.833a.75.75 0 01-1.04 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                  </svg>
                </button>
              </>
            )}
            {/* Existing layout toggle (sidebar/dropdown) */}
            <button
              onClick={() => onSidebarToggle && onSidebarToggle()}
              className="inline-flex items-center justify-center w-7 h-7 rounded border border-zinc-600/70 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60"
              aria-label={sidebar ? 'Switch to dropdown layout' : 'Expand to sidebar layout'}
              title={sidebar ? 'Switch to dropdown layout' : 'Expand to sidebar layout'}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M3 5h14v2H3V5zm0 4h9v2H3V9zm0 4h14v2H3v-2z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span className="text-blue-200 font-medium">Tokens: {Math.floor(state.tokens)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
            <span className="text-emerald-200 font-medium">IQ: {Math.floor(state.iq || 0)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-400">Buy Qty:</span>
          <div className="flex items-center gap-1 rounded px-0.5 py-0.5 bg-zinc-900/40">
            {[1,5,20,100].map(q => (
              <button
                key={q}
                onClick={() => setBuyQuantity(q)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded ${buyQuantity===q? 'bg-blue-500/20 border border-blue-500/70 text-blue-300':'text-zinc-300 hover:bg-zinc-800/80'}`}
              >{q}x</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Dropdown panel (compact) - narrower than sidebar
  const DropdownPanel = (
    <div id="galaxy-ui-panel" role="region" aria-label="Clustering Galaxy Controls"
      className="fixed z-40 w-[90vw] max-w-[22rem] max-h-[75vh] overflow-y-auto overflow-x-hidden small-scrollbar rounded-lg border border-zinc-700/60 bg-zinc-900/95 backdrop-blur text-zinc-200 shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-auto"
      style={panelPos ? { top: panelPos.top, right: panelPos.right } : undefined}
    >
      {renderHeader()}
      <div className="space-y-2 py-2">
        {renderSwarmSection()}
        {renderBuyQuantityRow()}
        {renderTokenUpgradeSection()}
        {renderIqUpgradeSection()}
        {renderDebugSection()}
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
  )

  // Sidebar (expanded)
  const Sidebar = (
    <div
      className={
        "fixed right-0 z-50 w-[100vw] sm:w-[24rem] border-l border-zinc-700/60 bg-zinc-900/95 backdrop-blur text-zinc-200 shadow-[0_0_28px_rgba(59,130,246,0.25)] overflow-y-auto overflow-x-hidden small-scrollbar pointer-events-auto"
        + (compactSidebar ? " bottom-0 h-[42vh] rounded-t-lg" : " inset-y-0")
      }
    >
      {renderHeader()}
      <div className="space-y-1">
        {renderSwarmSection()}
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
            {/* removed cosmetics buttons */}
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
      {!collapsed && !sidebar && DropdownPanel}
      {sidebar && Sidebar}
      {tooltip.visible && (
        <div
          style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)', zIndex: 1000 }}
          className="pointer-events-none whitespace-nowrap rounded border border-zinc-700/70 bg-zinc-900/95 px-2 py-1 text-[10px] text-zinc-200 shadow-md"
        >
          {tooltip.text}
        </div>
      )}
    </>
  )
}






