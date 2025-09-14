'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ClusteringGalaxyCanvas from '../components/ClusteringGalaxyCanvas'
import GalaxyUI from '../components/GalaxyUI'
import { useClusteringGalaxy } from '../hooks/useClusteringGalaxy'

type Star = { id: number; char: string; x: number; y: number; layer: number }

export default function Page() {
  const [starsOn, setStarsOn] = useState(true)
  const [galaxyOn, setGalaxyOn] = useState(true)
  const [hudCollapsed, setHudCollapsed] = useState(true)
  const [panelsOn, setPanelsOn] = useState(true)
  const [stars, setStars] = useState<Star[]>([])
  const [fieldSize, setFieldSize] = useState<number>(0)
  const [scrollY, setScrollY] = useState(0)
  const [smoothY, setSmoothY] = useState(0)
  const [showInstr, setShowInstr] = useState(false)

  const lagFactor = 0.1
  // Much subtler parallax
  const parallaxFactors = [-0.002, -0.001, 0.0015, 0.002]
  const globalParallax = 1
  const speedFactor = 1

  useEffect(() => {
    if (!starsOn) {
      setStars([])
      return
    }

    const glyphs = ['*', '+', '.']

    const regenerate = () => {
      const base = Math.max(window.innerWidth, window.innerHeight)
      // Larger field to ensure coverage during subtle scroll shifts
      const size = Math.ceil(base * 3.2)
      setFieldSize(size)

      const count = Math.max(200, Math.floor(size * size * 0.00006))
      const arr: Star[] = Array.from({ length: count }, (_, i) => ({
        id: i,
        char: glyphs[(Math.random() * glyphs.length) | 0],
        x: Math.random() * size,
        y: Math.random() * size,
        layer: i % 4,
      }))
      setStars(arr)
    }

    regenerate()
    window.addEventListener('resize', regenerate)
    return () => window.removeEventListener('resize', regenerate)
  }, [starsOn])

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Galaxy state hook (single RAF loop internally)
  const galaxy = useClusteringGalaxy({ enabled: galaxyOn })

  // Listen for galaxy events (auto fullscreen when first core maxed)
  useEffect(() => {
    const onFx = (e: any) => {
      const name = e?.detail?.name
      if (name === 'first-max') {
        setShowInstr(true)
        setPanelsOn(false)
      }
    }
    window.addEventListener('galaxy-effect' as any, onFx as any)
    return () => window.removeEventListener('galaxy-effect' as any, onFx as any)
  }, [])

  useEffect(() => {
    let raf = 0
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const tick = () => {
      setSmoothY(prev => {
        const next = lerp(prev, scrollY, lagFactor)
        return Math.abs(next - scrollY) < 0.1 ? scrollY : next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scrollY, lagFactor])

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
      {starsOn && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <div
            className="absolute left-1/2 top-1/2"
            style={{ width: fieldSize, height: fieldSize, transform: 'translate(-50%, -50%)', transformOrigin: '50% 50%' }}
          >
            {parallaxFactors.map((factor, idx) => (
              <div key={idx} className="absolute inset-0 will-change-transform" style={{ transform: `translate3d(0, ${smoothY * factor * globalParallax}px, 0)` }}>
                <div className="absolute inset-0 animate-[swirl_linear_infinite]" style={{ animationDuration: `${(140 + idx * 30) / speedFactor}s` }}>
                  {stars.filter(s => s.layer === idx).map(s => (
                    <span
                      key={`l${idx}-${s.id}`}
                      style={{
                        position: 'absolute',
                        left: s.x,
                        top: s.y,
                        fontSize: `${12 - idx}px`,
                        color:
                          idx === 0
                            ? 'rgba(147,197,253,0.85)'
                            : idx === 1
                            ? 'rgba(167,139,250,0.80)'
                            : idx === 2
                            ? 'rgba(129,140,248,0.78)'
                            : 'rgba(59,130,246,0.70)',
                        textShadow: '0 0 6px rgba(59,130,246,0.55)',
                        userSelect: 'none',
                      }}
                    >
                      {s.char}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[60vmin] w-[60vmin] rounded-full bg-[radial-gradient(closest-side,rgba(2,6,23,0.55),rgba(2,6,23,0))] animate-[pulseScale_12s_ease-in-out_infinite]" />
          </div>
          <style>{`
            @keyframes swirl { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulseScale { 0%, 100% { transform: scale(1.00); } 50% { transform: scale(1.03); } }
          `}</style>
        </div>
      )}

      {/* Galaxy background canvas (above swirl, below content) */}
      {galaxyOn && (
        <div className="fixed inset-0 z-0">
          <ClusteringGalaxyCanvas enabled={galaxyOn} parallaxY={smoothY} api={galaxy.api} />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
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
          <div className="flex flex-col items-stretch gap-1">
            <button onClick={() => setStarsOn(v => !v)} className="group inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700/70 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-300 backdrop-blur transition hover:border-zinc-600 hover:text-zinc-100">
              Stars: {starsOn ? 'On' : 'Off'}
            </button>
            <button onClick={() => setPanelsOn(v => !v)} className="group inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700/70 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-300 backdrop-blur transition hover:border-zinc-600 hover:text-zinc-100">
              Panels: {panelsOn ? 'On' : 'Off'}
            </button>
            <button onClick={() => setGalaxyOn(v => !v)} className="group inline-flex items-center justify-center gap-2 rounded-md border border-blue-500/50 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-200 backdrop-blur transition hover:border-blue-400 hover:text-blue-100">
              Clicker Game: {galaxyOn ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* HUD bottom-center; collapsible */}
        <GalaxyUI state={galaxy.state} api={galaxy.api} onToggle={() => setGalaxyOn(v => !v)} enabled={galaxyOn} collapsed={hudCollapsed} onCollapsedChange={setHudCollapsed} />

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

      {/* Instructions overlay when entering fullscreen play */}
      {!panelsOn && showInstr && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
          <div className="pointer-events-auto rounded-md border border-zinc-700/70 bg-zinc-900/80 px-4 py-3 text-xs text-zinc-200 shadow-lg">
            <div className="font-semibold mb-1">Galaxy Play Mode</div>
            <div className="text-zinc-300/90">Click glowing pages to feed nearby cores. Level cores to 5 to split and earn IQ. Use the HUD for upgrades.</div>
            <div className="mt-2 text-right">
              <button onClick={() => setShowInstr(false)} className="rounded-sm border border-zinc-700/70 bg-zinc-800/60 px-2 py-1">Got it</button>
            </div>
          </div>
        </div>
      )}
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
