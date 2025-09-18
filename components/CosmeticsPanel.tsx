"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ALL_SPRITES, SPRITE_EMOJI } from "../constants/sprites"

export type CosmeticsSettings = {
  coreColors: string[] // L1-L5 core colors
  ambientColors: string[] // Up to 3 ambient data colors
  coreSprites: string[] // L1-L5 sprite choices
  specialEffects: {
    rgbNeon: boolean
    customShift?: boolean
    shiftSpeed?: number
  }
  unlockedSprites?: string[]
}

export type CosmeticsPanelProps = {
  visible: boolean
  onToggle: () => void
  settings: CosmeticsSettings
  onSettingsChange: (settings: CosmeticsSettings) => void
  unlocked: boolean // Whether cosmetics are unlocked
}

type TabType = 'palette' | 'sprites' | 'special'

// Available sprite options
const SPRITE_OPTIONS = [
  { id: 'database', name: 'Database', emoji: '💾' },
  { id: 'circle', name: 'Circle', emoji: '⭕' },
  { id: 'square', name: 'Square', emoji: '⬜' },
  { id: 'star', name: 'Star', emoji: '⭐' },
  { id: 'heart', name: 'Heart', emoji: '❤️' },
  { id: 'club', name: 'Club', emoji: '♣️' },
  { id: 'diamond', name: 'Diamond', emoji: '♦️' },
  { id: 'spade', name: 'Spade', emoji: '♠️' },
  { id: 'laughing', name: 'Laughing', emoji: '😂' },
  { id: 'heart_eyes', name: 'Heart Eyes', emoji: '😍' },
  { id: 'rofl', name: 'ROFL', emoji: '🤣' },
  { id: 'smile', name: 'Smile', emoji: '😊' },
  { id: 'sob', name: 'Sob', emoji: '😭' },
  { id: 'fire', name: 'Fire', emoji: '🔥' },
  { id: 'thinking', name: 'Thinking', emoji: '🤔' },
  { id: 'cool', name: 'Cool', emoji: '😎' },
  { id: 'angel', name: 'Angel', emoji: '😇' },
  { id: 'hundred', name: 'Hundred', emoji: '💯' },
  { id: 'exclamation', name: 'Exclamation', emoji: '‼️' },
  { id: 'hearts', name: 'Hearts', emoji: '💞' },
  { id: 'peace', name: 'Peace', emoji: '✌️' },
  { id: 'sparkles', name: 'Sparkles', emoji: '✨' },
  { id: 'shrug', name: 'Shrug', emoji: '🤷' },
  { id: 'shocked', name: 'Shocked', emoji: '😱' },
  { id: 'sweat', name: 'Sweat', emoji: '💦' },
  { id: 'numbered', name: 'Numbered', emoji: '#️⃣' },
]

// Default color palettes
const DEFAULT_CORE_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"]
const DEFAULT_AMBIENT_COLORS = ["#e5e7eb"]

export default function CosmeticsPanel({ visible, onToggle, settings, onSettingsChange, unlocked }: CosmeticsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('palette')
  const [activeSlot, setActiveSlot] = useState<number>(0) // 0..4 selection for L1..L5
  // Centralized picker state so it cannot be lost on child remounts
  const [openPicker, setOpenPicker] = useState<null | {
    group: 'core' | 'ambient'
    index: number
    label: string
  }>(null)
  const [pickerTempColor, setPickerTempColor] = useState<string | null>(null)
  const [recentColors, setRecentColors] = useState<string[]>([])


  // Close picker on Escape
  useEffect(() => {
    if (!openPicker) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPicker(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openPicker])

  const closePicker = (_reason: string) => {
    setOpenPicker(null)
  }

  // Load/save recent colors (persist last 5)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cosmetics.recentColors')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          setRecentColors(arr.filter(Boolean).slice(0, 5))
          return
        }
      }
    } catch {}
    // Default to 5 whites
    setRecentColors(new Array(5).fill('#ffffff'))
  }, [])

  const addRecentColor = (c: string) => {
    setRecentColors(prev => {
      const next = [c, ...prev.filter(x => x && x.toLowerCase() !== c.toLowerCase())].slice(0, 5)
      try { localStorage.setItem('cosmetics.recentColors', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Mini sprite preview renderer for panel buttons (SVG for drawn shapes; emoji fallback)
  const SpritePreview = ({ id, size = 18 }: { id: string; size?: number }) => {
    const s = size
    const half = s / 2
    const stroke = 'currentColor'
    const fill = 'currentColor'

    const starPath = () => {
      const spikes = 5
      const outerR = s * 0.45
      const innerR = outerR * 0.5
      let rot = Math.PI / 2 * 3
      let x = half
      let y = half
      const points: string[] = []
      points.push(`${half},${half - outerR}`)
      for (let i = 0; i < spikes; i++) {
        x = half + Math.cos(rot) * outerR
        y = half + Math.sin(rot) * outerR
        points.push(`${x},${y}`)
        rot += Math.PI / spikes
        x = half + Math.cos(rot) * innerR
        y = half + Math.sin(rot) * innerR
        points.push(`${x},${y}`)
        rot += Math.PI / spikes
      }
      return points.join(' ')
    }

    if (id === 'circle') {
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <circle cx={half} cy={half} r={s * 0.45} fill={fill} />
        </svg>
      )
    }
    if (id === 'ring') {
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <circle cx={half} cy={half} r={s * 0.45} fill="none" stroke={stroke} strokeWidth={Math.max(1, Math.floor(s * 0.12))} />
        </svg>
      )
    }
    if (id === 'square') {
      const side = s * 0.82
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <rect x={half - side / 2} y={half - side / 2} width={side} height={side} fill={fill} rx={Math.max(1, s * 0.08)} />
        </svg>
      )
    }
    if (id === 'triangle') {
      const r = s * 0.48
      const p1 = `${half},${half - r}`
      const p2 = `${half - r * 0.866},${half + r * 0.5}`
      const p3 = `${half + r * 0.866},${half + r * 0.5}`
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <polygon points={`${p1} ${p2} ${p3}`} fill={fill} />
        </svg>
      )
    }
    if (id === 'diamond_shape') {
      const r = s * 0.48
      const p = `${half},${half - r} ${half + r},${half} ${half},${half + r} ${half - r},${half}`
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <polygon points={p} fill={fill} />
        </svg>
      )
    }
    if (id === 'hexagon') {
      const r = s * 0.48
      const pts: string[] = []
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const x = half + Math.cos(a) * r
        const y = half + Math.sin(a) * r
        pts.push(`${x},${y}`)
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <polygon points={pts.join(' ')} fill={fill} />
        </svg>
      )
    }
    if (id === 'star') {
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <polygon points={starPath()} fill={fill} />
        </svg>
      )
    }
    if (id === 'pentagon') {
      const r = s * 0.48
      const pts: string[] = []
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2
        const x = half + Math.cos(a) * r
        const y = half + Math.sin(a) * r
        pts.push(`${x},${y}`)
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <polygon points={pts.join(' ')} fill={fill} />
        </svg>
      )
    }
    if (id === 'octagon') {
      const r = s * 0.48
      const pts: string[] = []
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 - Math.PI / 8
        const x = half + Math.cos(a) * r
        const y = half + Math.sin(a) * r
        pts.push(`${x},${y}`)
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <polygon points={pts.join(' ')} fill={fill} />
        </svg>
      )
    }
    if (id === 'chevron') {
      const w = s * 0.9
      const h = s * 0.6
      const x0 = half - w / 2
      const y0 = half - h / 2
      const t = Math.max(2, s * 0.18)
      const pts = [
        [x0, y0],
        [x0 + w * 0.6, y0 + h / 2],
        [x0, y0 + h],
        [x0 + t, y0 + h],
        [x0 + w * 0.6 + t, y0 + h / 2],
        [x0 + t, y0],
      ]
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <polygon points={pts.map(p=>p.join(',')).join(' ')} fill={fill} />
        </svg>
      )
    }
    if (id === 'plus') {
      const w = s * 0.18
      const l = s * 0.5
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <rect x={half - w / 2} y={half - l} width={w} height={l * 2} fill={fill} />
          <rect x={half - l} y={half - w / 2} width={l * 2} height={w} fill={fill} />
        </svg>
      )
    }
    // Fallback: emoji-based preview
    return <span style={{ fontSize: s * 0.9, lineHeight: 1 }}>{SPRITE_EMOJI[id] || '✨'}</span>
  }

  if (!unlocked) return null

  const ColorSwatch = ({ color, label, onOpen }: { color: string; label: string; onOpen: () => void }) => (
    <div className="flex flex-col gap-1 relative select-none">
      <label className="text-[10px] text-zinc-400">{label}</label>
      <button
        onPointerDown={(e) => { e.preventDefault(); onOpen() }}
        className="w-10 h-10 border border-zinc-700 rounded cursor-pointer touch-manipulation active:scale-95 transition-transform"
        style={{ backgroundColor: color, WebkitTapHighlightColor: 'transparent' as any }}
        aria-label={`Choose color for ${label}`}
      />
    </div>
  )

  const SpriteSelector = ({ selectedId, onChange, level }: { selectedId: string, onChange: (id: string) => void, level: number }) => (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] text-zinc-400">L{level} Sprite</label>
      <div className="grid grid-cols-6 gap-1">
        {SPRITE_OPTIONS.map((sprite) => (
          <button
            key={sprite.id}
            onClick={() => {
              console.log(`Sprite changed for L${level}: ${sprite.id}`)
              onChange(sprite.id)
            }}
            className={`w-8 h-8 rounded text-xs flex items-center justify-center transition-all ${
              selectedId === sprite.id
                ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60'
            }`}
            title={sprite.name}
          >
            {sprite.emoji}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-96 max-w-[90vw]"
        >
          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/70 rounded-lg shadow-xl">
            {/* Header with tabs */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-700/50">
              <div className="flex gap-1">
                {(['palette', 'sprites', 'special'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 text-[11px] font-medium rounded transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                        : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                onClick={onToggle}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {activeTab === 'palette' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[12px] font-semibold text-zinc-300 mb-3">Core Colors</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {settings.coreColors.map((color, i) => (
                        <ColorSwatch
                          key={i}
                          color={color}
                          label={`L${i + 1}`}
                          onOpen={() => {
                            setOpenPicker({ group: 'core', index: i, label: `L${i + 1}` })
                            setPickerTempColor(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[12px] font-semibold text-zinc-300 mb-3">Ambient Data Colors</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((i) => (
                        <ColorSwatch
                          key={i}
                          color={settings.ambientColors[i] || "#e5e7eb"}
                          label={`Color ${i + 1}`}
                          onOpen={() => {
                            setOpenPicker({ group: 'ambient', index: i, label: `Color ${i + 1}` })
                            setPickerTempColor(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => onSettingsChange({
                        ...settings,
                        coreColors: [...DEFAULT_CORE_COLORS],
                        ambientColors: [...DEFAULT_AMBIENT_COLORS]
                      })}
                      className="px-3 py-1 text-[10px] bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 rounded hover:bg-zinc-700/60 transition-colors"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'sprites' && (
                <div className="space-y-4">
                  {/* Selected sprites L1-L5 */}
                  <div>
                    <h3 className="text-[12px] font-semibold text-zinc-300 mb-2">Selected Sprites</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {[0,1,2,3,4].map(i => {
                        const id = settings.coreSprites[i] || 'database'
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveSlot(i)}
                            className={`flex flex-col items-center gap-1 px-2 py-2 rounded border text-center transition-colors ${activeSlot === i ? 'border-blue-500/60 bg-blue-500/10 text-blue-200' : 'border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/40'}`}
                            aria-pressed={activeSlot === i}
                            title={`Select L${i+1} slot`}
                          >
                            <div className="leading-none" style={{ color: 'currentColor' }}>
                              <SpritePreview id={id} size={18} />
                            </div>
                            <div className="text-[10px]">L{i+1}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Unlocked list shared */}
                  <div>
                    <h3 className="text-[12px] font-semibold text-zinc-300 mb-2">Unlocked Sprites</h3>
                    <div className="grid grid-cols-8 gap-2">
                      {(settings.unlockedSprites?.length ? settings.unlockedSprites : ALL_SPRITES.map(s=>s.id)).map(id => {
                        const usedSlots = (settings.coreSprites || []).map((s, i) => s === id ? i : -1).filter(i => i >= 0)
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              const newSprites = [...settings.coreSprites]
                              newSprites[Math.max(0, Math.min(4, activeSlot))] = id
                              onSettingsChange({ ...settings, coreSprites: newSprites })
                            }}
                            className={`relative h-10 rounded border flex items-center justify-center text-sm ${ (settings.coreSprites.includes(id)) ? 'border-blue-500/60 bg-blue-500/10 text-blue-200' : 'border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/40'}`}
                            title={ALL_SPRITES.find(s=>s.id===id)?.name || id}
                          >
                            <SpritePreview id={id} size={16} />
                            {usedSlots.length > 0 && (
                              <div className="absolute -top-1 -right-1 flex gap-0.5 flex-wrap max-w-[42px] justify-end">
                                {usedSlots.map(slot => (
                                  <span key={`${id}-slot-${slot}`} className="px-0.5 rounded bg-blue-500/30 border border-blue-500/40 text-[9px] leading-none">
                                    L{slot+1}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    {(() => {
                      const total = ALL_SPRITES.length
                      const cnt = settings.unlockedSprites?.length ?? total
                      const pct = cnt/total
                      const color = pct>=1?'text-green-400': pct>=0.75?'text-lime-300': pct>=0.5?'text-yellow-400': pct>=0.25?'text-orange-400':'text-red-500'
                      return <div className="mt-2 text-[11px] text-zinc-400">Collected: <span className={`font-semibold ${color}`}>{cnt}</span>/{total}</div>
                    })()}
                  </div>

                  {/* Locked section */}
                  <div>
                    <h3 className="text-[12px] font-semibold text-zinc-300 mb-2">Locked</h3>
                    <div className="grid grid-cols-8 gap-2">
                      {(() => {
                        const unlocked = new Set(settings.unlockedSprites && settings.unlockedSprites.length ? settings.unlockedSprites : ALL_SPRITES.map(s=>s.id))
                        const locked = ALL_SPRITES.map(s=>s.id).filter(id => !unlocked.has(id))
                        return locked.map(id => (
                          <div
                            key={`locked-${id}`}
                            className="relative h-10 rounded border border-zinc-700/60 bg-zinc-800/30 text-zinc-500 flex items-center justify-center opacity-50 select-none"
                            title={(ALL_SPRITES.find(s=>s.id===id)?.name || id) + ' (Locked)'}
                            aria-disabled
                          >
                            <SpritePreview id={id} size={16} />
                            <div className="absolute inset-0 rounded bg-black/10" />
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'special' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[12px] font-semibold text-zinc-300">RGB Neon Effect</h3>
                      <p className="text-[10px] text-zinc-500 mt-1">Override palette with rainbow neon colors</p>
                    </div>
                    <button
                      onClick={() => {
                        const newRgbNeon = !settings.specialEffects.rgbNeon
                        console.log(`RGB Neon toggled: ${newRgbNeon}`)
                        // Mutual exclusion: disable custom shift when enabling neon
                        onSettingsChange({
                          ...settings,
                          specialEffects: { ...settings.specialEffects, rgbNeon: newRgbNeon, customShift: newRgbNeon ? false : (settings.specialEffects as any).customShift }
                        })
                      }}
                      className={`px-3 py-1 text-[10px] rounded transition-all ${
                        settings.specialEffects.rgbNeon
                          ? 'bg-gradient-to-r from-red-500/20 via-green-500/20 to-blue-500/20 border border-purple-500/50 text-purple-200'
                          : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60'
                      }`}
                    >
                      {settings.specialEffects.rgbNeon ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[12px] font-semibold text-zinc-300">Custom Shift</h3>
                      <p className="text-[10px] text-zinc-500 mt-1">Animated gradient using your palette (L1..L5)</p>
                    </div>
                    <button
                      onClick={() => {
                        const current = (settings.specialEffects as any).customShift || false
                        const next = !current
                        onSettingsChange({
                          ...settings,
                          specialEffects: { ...(settings.specialEffects as any), customShift: next, rgbNeon: next ? false : settings.specialEffects.rgbNeon }
                        })
                      }}
                      className={`px-3 py-1 text-[10px] rounded transition-all ${
                        (settings.specialEffects as any).customShift
                          ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                          : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60'
                      }`}
                    >
                      {(settings.specialEffects as any).customShift ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Shift Speed Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[12px] font-semibold text-zinc-300">Shift Speed</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Adjust animation speed (0.25× – 3×)</p>
                      </div>
                      <div className="text-[11px] text-zinc-300 tabular-nums">
                        {(settings.specialEffects as any).shiftSpeed ? (settings.specialEffects as any).shiftSpeed.toFixed(2) + '×' : '1.00×'}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0.25}
                      max={3}
                      step={0.05}
                      value={(settings.specialEffects as any).shiftSpeed ?? 1.0}
                      onChange={(e) => {
                        const v = Math.max(0.25, Math.min(3, parseFloat(e.target.value))) || 1.0
                        onSettingsChange({
                          ...settings,
                          specialEffects: { ...(settings.specialEffects as any), shiftSpeed: v }
                        })
                      }}
                      className="w-full accent-blue-500"
                      aria-label="Shift speed"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Toggle button */}
      {!visible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onToggle}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-2 bg-zinc-900/80 backdrop-blur border border-zinc-700/70 rounded-lg text-[11px] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all"
        >
          <span className="flex items-center gap-2">
            🎨 Cosmetics
          </span>
        </motion.button>
      )}
    </AnimatePresence>

    {/* Centralized Color Picker Modal (portal) rendered outside AnimatePresence */}
    {openPicker && createPortal(
      <div
        className="fixed inset-0 z-[9999]"
        data-cosmetics-popover
        onMouseDown={(e) => { if (e.target === e.currentTarget) closePicker('backdrop-mousedown') }}
        onTouchStart={(e) => { if (e.target === e.currentTarget) closePicker('backdrop-touchstart') }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 border border-zinc-600 rounded-lg p-3 shadow-xl min-w-[240px]"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="text-[11px] text-zinc-300 mb-2">{openPicker.label}</div>
          <div className="grid grid-cols-5 gap-1 mb-3">
            {[
              '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc',
              '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
              '#d946ef', '#ec4899', '#f43f5e', '#ffffff', '#000000',
              '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#fbbf24'
            ].map((presetColor, index) => (
              <button
                key={`${presetColor}-${index}`}
                onClick={() => {
                  const apply = (c: string) => {
                    if (openPicker.group === 'core') {
                      const newColors = [...settings.coreColors]
                      newColors[openPicker.index] = c
                      onSettingsChange({ ...settings, coreColors: newColors })
                    } else {
                      const newColors = [...settings.ambientColors]
                      newColors[openPicker.index] = c
                      onSettingsChange({ ...settings, ambientColors: newColors.filter(Boolean) })
                    }
                  }
                  apply(presetColor)
                  setPickerTempColor(presetColor)
                  addRecentColor(presetColor)
                  closePicker('preset-select')
                }}
                className="w-6 h-6 rounded border border-zinc-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: presetColor }}
              />
            ))}
          </div>
          {/* Recent colors row */}
          <div className="mb-2 text-[10px] text-zinc-400">Recent</div>
          <div className="grid grid-cols-5 gap-1 mb-3">
            {(recentColors.length ? recentColors : new Array(5).fill('#ffffff')).slice(0,5).map((rc, idx) => (
              <button
                key={`recent-${idx}-${rc}`}
                onClick={() => {
                  const apply = (c: string) => {
                    if (openPicker.group === 'core') {
                      const newColors = [...settings.coreColors]
                      newColors[openPicker.index] = c
                      onSettingsChange({ ...settings, coreColors: newColors })
                    } else {
                      const newColors = [...settings.ambientColors]
                      newColors[openPicker.index] = c
                      onSettingsChange({ ...settings, ambientColors: newColors.filter(Boolean) })
                    }
                  }
                  apply(rc)
                  setPickerTempColor(rc)
                  addRecentColor(rc)
                  closePicker('recent-select')
                }}
                className="w-6 h-6 rounded border border-zinc-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: rc || '#ffffff' }}
                title={rc}
              />
            ))}
          </div>
          <input
            type="color"
            value={(pickerTempColor ?? (openPicker.group === 'core' ? (settings.coreColors[openPicker.index] || '#ffffff') : (settings.ambientColors[openPicker.index] || '#e5e7eb')))}
            onChange={(e) => {
              const c = e.target.value
              setPickerTempColor(c)
              if (openPicker.group === 'core') {
                const newColors = [...settings.coreColors]
                newColors[openPicker.index] = c
                onSettingsChange({ ...settings, coreColors: newColors })
              } else {
                const newColors = [...settings.ambientColors]
                newColors[openPicker.index] = c
                onSettingsChange({ ...settings, ambientColors: newColors.filter(Boolean) })
              }
              addRecentColor(c)
            }}
            className="w-full h-8 border border-zinc-600 rounded"
          />
          <button
            onClick={() => closePicker('button-close')}
            className="w-full mt-2 px-2 py-1 text-[10px] bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600"
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
