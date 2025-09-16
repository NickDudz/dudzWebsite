"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export type SettingsDropdownProps = {
  starsOn: boolean
  onStarsToggle: () => void
  panelsOn: boolean
  onPanelsToggle: () => void
  galaxyOn: boolean
  onGalaxyToggle: () => void
  targetFps?: number
  onTargetFpsChange?: (fps: number) => void
  qualityMode?: 'low' | 'high' | 'extreme'
  onQualityModeChange?: (mode: 'low' | 'high' | 'extreme') => void
  showFpsCounter?: boolean
  onFpsCounterToggle?: () => void
}

export default function SettingsDropdown({
  starsOn,
  onStarsToggle,
  panelsOn,
  onPanelsToggle,
  galaxyOn,
  onGalaxyToggle,
  targetFps = 30,
  onTargetFpsChange,
  qualityMode = 'high',
  onQualityModeChange,
  showFpsCounter = false,
  onFpsCounterToggle,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 backdrop-blur transition hover:border-zinc-600 hover:text-zinc-100 hover:bg-zinc-800/60"
        title="Settings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="hidden sm:inline">Settings</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-lg border border-zinc-700/70 bg-zinc-900/95 backdrop-blur-md shadow-xl z-50"
          >
            <div className="p-3 space-y-3">
              <div className="text-xs font-semibold text-zinc-300 border-b border-zinc-700/50 pb-2">
                Display Settings
              </div>

              {/* Toggle Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">Starfield</span>
                  <button
                    onClick={onStarsToggle}
                    className={`px-2 py-1 text-[10px] rounded transition-all ${
                      starsOn
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                        : 'bg-zinc-700/30 border border-zinc-600/50 text-zinc-400'
                    }`}
                  >
                    {starsOn ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">Content Panels</span>
                  <button
                    onClick={onPanelsToggle}
                    className={`px-2 py-1 text-[10px] rounded transition-all ${
                      panelsOn
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                        : 'bg-zinc-700/30 border border-zinc-600/50 text-zinc-400'
                    }`}
                  >
                    {panelsOn ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">Clicker Game</span>
                  <button
                    onClick={onGalaxyToggle}
                    className={`px-2 py-1 text-[10px] rounded transition-all ${
                      galaxyOn
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-200'
                        : 'bg-zinc-700/30 border border-zinc-600/50 text-zinc-400'
                    }`}
                  >
                    {galaxyOn ? 'On' : 'Off'}
                  </button>
                </div>
              </div>

              <div className="border-t border-zinc-700/50 pt-3">
                <div className="text-xs font-semibold text-zinc-300 mb-2">
                  Performance
                </div>

                <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300">Target FPS</span>
                <div className="flex items-center gap-1">
                  {([30, 60] as const).map(fps => (
                    <button
                      key={fps}
                      onClick={() => onTargetFpsChange?.(fps)}
                      className={`px-1.5 py-0.5 text-[10px] rounded transition-all ${
                        targetFps === fps
                          ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                          : 'bg-zinc-700/30 border border-zinc-600/50 text-zinc-400 hover:bg-zinc-600/30'
                      }`}
                    >
                      {fps}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300">Quality Mode</span>
                <select
                  value={qualityMode}
                  onChange={(e) => onQualityModeChange?.(e.target.value as 'low' | 'high' | 'extreme')}
                  className="px-2 py-1 text-[10px] rounded bg-zinc-800/60 border border-zinc-700/70 text-zinc-200 hover:bg-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="high">High</option>
                  <option value="extreme">Extreme</option>
                </select>
              </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300">FPS Counter</span>
                    <button
                      onClick={onFpsCounterToggle}
                      className={`px-2 py-1 text-[10px] rounded transition-all ${
                        showFpsCounter
                          ? 'bg-green-500/20 border border-green-500/50 text-green-200'
                          : 'bg-zinc-700/30 border border-zinc-600/50 text-zinc-400'
                      }`}
                    >
                      {showFpsCounter ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
