'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ClusteringGalaxyCanvas from '../components/ClusteringGalaxyCanvas'
import GalaxyUI from '../components/GalaxyUI'
import ErrorBoundary from '../components/ErrorBoundary'
import StarfieldCanvas from '../components/StarfieldCanvas'
import SettingsDropdown from '../components/SettingsDropdown'
import FpsCounter from '../components/FpsCounter'
import { useClusteringGalaxy } from '../hooks/useClusteringGalaxy'


export default function Page() {
  const [starsOn, setStarsOn] = useState(true)
  const [galaxyOn, setGalaxyOn] = useState(false)
  const [hudCollapsed, setHudCollapsed] = useState(true)
  const [hudSidebar, setHudSidebar] = useState(false)
  const [panelsOn, setPanelsOn] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)
  const [showGameIntro, setShowGameIntro] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [smoothY, setSmoothY] = useState(0)
  const [showInstr, setShowInstr] = useState(false)
  const [showFpsCounter, setShowFpsCounter] = useState(false)
  const lagFactor = 0.05 // Smoother interpolation for parallax

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Galaxy state hook (single RAF loop internally)
  const galaxy = useClusteringGalaxy({ 
    enabled: galaxyOn, 
    orbitalMode: true // Enable circular orbit with slight wavy path
  })

  // Auto-start game (disable tutorial/intro)
  useEffect(() => {
    setGameStarted(true)
    setGalaxyOn(true)
    setHudCollapsed(false)
    setShowGameIntro(false)
    setShowInstr(false)
  }, [])

  // Disable tutorial-related event responses
  useEffect(() => {
    const onFx = () => {}
    window.addEventListener('galaxy-effect' as any, onFx as any)
    return () => window.removeEventListener('galaxy-effect' as any, onFx as any)
  }, [])

  // Throttle star parallax to target FPS (default 30)
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let targetMs = 1000 / (galaxy.api?.getTargetFps ? galaxy.api.getTargetFps() : 30)
    const onVis = () => { /* update target on visibility resume */ targetMs = 1000 / (galaxy.api?.getTargetFps ? galaxy.api.getTargetFps() : 30) }
    document.addEventListener('visibilitychange', onVis)
    const smoothLerp = (a: number, b: number, t: number) => {
      const diff = b - a
      const easedT = 1 - Math.pow(1 - t, 3)
      return a + diff * easedT
    }
    const tick = () => {
      const now = performance.now()
      if (now - last >= targetMs) {
        last = now
        setSmoothY(prev => {
          const next = smoothLerp(prev, scrollY, lagFactor)
          return Math.abs(next - scrollY) < 0.01 ? scrollY : next
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis) }
  }, [scrollY, lagFactor, galaxy.api])

  const projects = useMemo(
    () => [
      { title: 'Bookmark Smart', tagline: 'ML-Assisted Bookmark Organizer', img: 'https://picsum.photos/seed/bookmarksmart/1024/1024' },
      { title: 'GotYa Games', tagline: 'Dystopian Gacha Employee Simulator - Unity Game', img: 'https://picsum.photos/seed/gotya/1024/1024' },
      { title: 'Metadata Multitool', tagline: 'Protect & Manage Your Photo Metadata', img: 'https://picsum.photos/seed/metadata/1024/1024' },
      { title: 'Image Tournaments', tagline: 'Automated Voting Tournaments - Discord Bot', img: 'https://picsum.photos/seed/tourney/1024/1024' },
      { title: 'Local RAG Toolkit', tagline: 'Local-first PDFs - Q&A pipeline', img: 'https://picsum.photos/seed/rag/1024/1024' },
      { title: 'GotYa Pal', tagline: 'Local LLM Focused Idle/Gacha Game', img: 'https://picsum.photos/seed/capsule/1024/1024' },
    ],
    []
  )

  return (
    <main className="relative min-h-screen bg-[#07090c] text-zinc-200 font-mono overflow-hidden">
      {/* Canvas starfield (performant, pointer-events: none) */}
      {starsOn && (
        <StarfieldCanvas
          enabled={starsOn}
          parallaxY={smoothY}
          getTargetFps={galaxy.api?.getTargetFps}
          lowQuality={galaxy.api?.getPerformanceMode?.() ?? false}
        />
      )}

      {/* Galaxy game canvas (interactive layer above starfield) */}
      {galaxyOn && (
        <div className="fixed inset-0 z-[10]">
          <ErrorBoundary>
            <ClusteringGalaxyCanvas enabled={galaxyOn} parallaxY={smoothY} api={galaxy.api} />
          </ErrorBoundary>
        </div>
      )}

      {/* FPS Counter (top left) */}
      <FpsCounter
        show={showFpsCounter}
        getCurrentFps={galaxy.api?.getCurrentFps}
        getTargetFps={galaxy.api?.getTargetFps}
      />

      <div className="relative z-[20] mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className={`mb-4 flex items-center justify-between gap-4 ${hudSidebar ? 'pr-[0px] sm:pr-[24rem]' : ''}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <a
                href="mailto:nick@dudz.pro"
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-700/70 bg-zinc-900/60 text-xs text-zinc-300 backdrop-blur transition hover:border-zinc-600 hover:text-zinc-100 hover:bg-zinc-800/60"
                title="Email"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>Email</span>
              </a>
              <a
                href="https://github.com/nickdudz"
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-700/70 bg-zinc-900/60 text-xs text-zinc-300 backdrop-blur transition hover:border-zinc-600 hover:text-zinc-100 hover:bg-zinc-800/60"
                title="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-
0.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>
          <SettingsDropdown
            starsOn={starsOn}
            onStarsToggle={() => setStarsOn(v => !v)}
            panelsOn={panelsOn}
            onPanelsToggle={() => setPanelsOn(v => !v)}
            galaxyOn={galaxyOn}
            onGalaxyToggle={() => setGalaxyOn(v => !v)}
            targetFps={galaxy.api?.getTargetFps ? galaxy.api.getTargetFps() : 30}
            onTargetFpsChange={(fps) => galaxy.api?.setTargetFps?.(fps)}
            performanceMode={galaxy.api?.getPerformanceMode ? galaxy.api.getPerformanceMode() : false}
            onPerformanceModeToggle={() => galaxy.api?.setPerformanceMode?.(!galaxy.api?.getPerformanceMode?.())}
            showFpsCounter={showFpsCounter}
            onFpsCounterToggle={() => setShowFpsCounter(v => !v)}
          />
        </div>

        {/* HUD right side; collapsible */}
        <GalaxyUI 
          state={galaxy.state} 
          api={galaxy.api} 
          onToggle={() => setGalaxyOn(v => !v)} 
          enabled={galaxyOn} 
          collapsed={hudCollapsed} 
          onCollapsedChange={setHudCollapsed}
          sidebar={hudSidebar}
          onSidebarToggle={() => setHudSidebar(v => !v)}
        />

        {panelsOn && (
          <>
            <header className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">Nick Dudz</h1>
              <p className="mt-1 text-sm text-zinc-400">Projects, Experiments, & Creations</p>
            </header>

            <section className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
              {projects.map((p, i) => (
                <ProjectCard key={i} {...p} index={i} />
              ))}
            </section>
          </>
        )}
      </div>

      {/* Tutorial disabled */}
    </main>
  )
}

function ProjectCard({ title, tagline, img, index }: { title: string; tagline: string; img: string; index: number }) {
  // Panels on left fly from left, right from right. In single column alternate.
  const fromRight = index % 2 === 1
  const initX = fromRight ? 42 : -42
  return (
    <motion.article
      initial={{ opacity: 0, x: initX }}
      whileInView={{ opacity: 1, x: 0 }}
      whileHover={{ rotate: -2, scale: 1.01 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}

      className="group relative overflow-hidden border border-zinc-800/70 bg-zinc-900/40 p-2 ring-1 ring-blue-500/40 transition duration-300 hover:ring-blue-400/70 hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]"
    >
      <div className="relative overflow-hidden">
        <div className="aspect-square w-full overflow-hidden">
          <img src={img} alt={title} className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03] group-hover:opacity-95" loading="lazy" />
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
            <p className="text-[11px] text-zinc-300/80">{tagline}</p>
          </div>
          <button className="rounded-sm border border-zinc-700/70 bg-zinc-900/60 px-2 py-1 text-[10px] font-medium text-zinc-200 opacity-90 hover:opacity-100">View</button>
        </div>
      </div>
    </motion.article>
  )
}
