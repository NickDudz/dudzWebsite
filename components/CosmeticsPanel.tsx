"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

export type CosmeticsSettings = {
  coreColors: string[] // L1-L5 core colors
  ambientColors: string[] // Up to 3 ambient data colors
  coreSprites: string[] // L1-L5 sprite choices
  specialEffects: {
    rgbNeon: boolean
  }
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

  if (!unlocked) return null

  const ColorSwatch = ({ color, label, onOpen }: { color: string; label: string; onOpen: () => void }) => (
    <div className="flex flex-col gap-1 relative">
      <label className="text-[10px] text-zinc-400">{label}</label>
      <button
        onClick={onOpen}
        className="w-8 h-8 border border-zinc-700 rounded cursor-pointer"
        style={{ backgroundColor: color }}
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
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SpriteSelector
                      key={level}
                      selectedId={settings.coreSprites[level - 1] || 'database'}
                      onChange={(id) => {
                        const newSprites = [...settings.coreSprites]
                        newSprites[level - 1] = id
                        onSettingsChange({ ...settings, coreSprites: newSprites })
                      }}
                      level={level}
                    />
                  ))}
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
                        onSettingsChange({
                          ...settings,
                          specialEffects: { ...settings.specialEffects, rgbNeon: newRgbNeon }
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
