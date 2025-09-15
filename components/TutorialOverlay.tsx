"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TutorialOverlayProps {
  onComplete: () => void
  enabled: boolean
}

export default function TutorialOverlay({ onComplete, enabled }: TutorialOverlayProps) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (enabled) {
      setShow(true)
      setStep(0)
    }
  }, [enabled])

  const handleNext = () => {
    if (step === 0) {
      setStep(1)
    } else {
      setShow(false)
      onComplete()
    }
  }

  const handleSkip = () => {
    setShow(false)
    onComplete()
  }

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-md rounded-lg border border-zinc-700/70 bg-zinc-900/90 p-6 text-center shadow-xl backdrop-blur-sm"
        >
          {/* Tutorial Data Point */}
          <div className="mb-6 flex justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 rgba(59, 130, 246, 0)',
                  '0 0 20px rgba(59, 130, 246, 0.5)',
                  '0 0 0 rgba(59, 130, 246, 0)'
                ]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-500/20 text-blue-200"
            >
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
          </div>

          {/* Tutorial Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100">
              {step === 0 ? 'Welcome to Data Continuum' : 'How to Play'}
            </h3>
            
            {step === 0 ? (
              <div className="space-y-3 text-sm text-zinc-300">
                <p>Click the glowing data points to feed nearby cores.</p>
                <p>Level up cores to earn IQ points and unlock upgrades.</p>
                <div className="mt-4 rounded-md bg-blue-500/10 p-3 text-blue-200">
                  <p className="text-xs font-medium">💡 Tip: The game runs in the background while you browse!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-zinc-300">
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                  <span>Click glowing data points</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                  <span>Feed cores to level them up</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                  <span>Use the HUD for upgrades</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-3 pt-4">
              <button
                onClick={handleSkip}
                className="rounded-md border border-zinc-600 bg-zinc-800/50 px-4 py-2 text-xs text-zinc-400 transition hover:bg-zinc-700/50 hover:text-zinc-300"
              >
                Skip Tutorial
              </button>
              <button
                onClick={handleNext}
                className="rounded-md border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-xs text-blue-200 transition hover:bg-blue-500/30 hover:text-blue-100"
              >
                {step === 0 ? 'Next' : 'Start Playing'}
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800/50 hover:text-zinc-200"
            aria-label="Close tutorial"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
