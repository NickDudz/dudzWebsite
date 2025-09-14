'use client';

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface DataIcon {
  id: number;
  x: number;
  y: number;
  layer: number;
  type: 'good' | 'bad' | 'neutral';
  icon: string;
  activity: number;
}

export default function Page() {
  const [networkOn, setNetworkOn] = useState(true);
  const [dataIcons, setDataIcons] = useState<DataIcon[]>([]);
  const [fieldSize, setFieldSize] = useState<number>(0);
  const [scrollY, setScrollY] = useState(0);
  const [smoothY, setSmoothY] = useState(0);

  const [clickCount, setClickCount] = useState(0);
  const [goodDataCount, setGoodDataCount] = useState(0);
  const [badDataCount, setBadDataCount] = useState(0);
  const [showEffect, setShowEffect] = useState<{x: number, y: number, type: string} | null>(null);

  // Debug controls
  const [lagFactor, setLagFactor] = useState(0.14);
  const [parallaxFactors, setParallaxFactors] = useState([-0.01, -0.005]);
  const [globalParallax, setGlobalParallax] = useState(1);
  const [speedFactor, setSpeedFactor] = useState(1);

  useEffect(() => {
    if (!networkOn) {
      setDataIcons([]);
      return;
    }

    const regen = () => {
      const base = Math.max(window.innerWidth, window.innerHeight);
      const size = Math.ceil(base * 2.2);
      setFieldSize(size);

      // Much fewer icons for better performance (30-50 instead of 150+)
      const iconCount = Math.max(30, Math.floor(size * size * 0.00002));

      const goodIcons = ['📊', '📈', '💹', '🔵', '✅', '💚', '🟢', '📋', '🔷'];
      const badIcons = ['❌', '🔴', '⚠️', '🚫', '💥', '🟥', '🔺', '⛔'];
      const neutralIcons = ['⚪', '⚫', '📄', '🔘', '⭕', '🔲', '🔳'];

      const newDataIcons: DataIcon[] = Array.from({ length: iconCount }, (_, i) => {
        const rand = Math.random();
        let type: 'good' | 'bad' | 'neutral';
        let iconSet: string[];

        if (rand < 0.4) {
          type = 'good';
          iconSet = goodIcons;
        } else if (rand < 0.7) {
          type = 'bad';
          iconSet = badIcons;
        } else {
          type = 'neutral';
          iconSet = neutralIcons;
        }

        const layer = Math.floor(Math.random() * 3);

        return {
          id: i,
          x: Math.random() * size,
          y: Math.random() * size,
          layer,
          type,
          icon: iconSet[Math.floor(Math.random() * iconSet.length)],
          activity: Math.random()
        };
      });

      setDataIcons(newDataIcons);
      setGoodDataCount(newDataIcons.filter(icon => icon.type === 'good').length);
      setBadDataCount(newDataIcons.filter(icon => icon.type === 'bad').length);
    };

    regen();
    window.addEventListener("resize", regen);
    return () => window.removeEventListener("resize", regen);
  }, [networkOn]);

  return (
    <main className="relative min-h-screen bg-[#07090c] text-zinc-200 font-mono overflow-hidden">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">Nick Dudz</h1>
          <p className="mt-1 text-sm text-zinc-400">Projects, Experiments, & Creations - Test Version</p>
        </header>
        <div className="text-center">
          <p>If you can see this, the basic page is working!</p>
          <p>Good Data: {goodDataCount} | Bad Data: {badDataCount}</p>
        </div>
      </div>
    </main>
  );
}