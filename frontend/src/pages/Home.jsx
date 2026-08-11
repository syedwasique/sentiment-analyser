import React, { Suspense, lazy, useEffect } from 'react';
import Lenis from 'lenis';
import { ScrollCanvas } from '../components/ScrollAnimation/ScrollCanvas';

// Lazy-load sections below the canvas for maximum initial performance
const LandingSections = lazy(() =>
  import('./LandingSections').then((module) => ({
    default: module.LandingSections,
  }))
);

/**
 * Home.jsx - MindPulse Homepage with Apple-Style Scroll-Driven Canvas Animation
 */
export const Home = () => {
  useEffect(() => {
    // Initialize Lenis smooth scroll for buttery fluid motion
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="w-full min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      {/* 1. Full-Screen Sticky Scroll Canvas Animation (500vh container) */}
      <ScrollCanvas />

      {/* 2. Content Sections Below Scroll Animation */}
      <Suspense
        fallback={
          <div className="py-24 text-center text-slate-500 font-mono text-sm bg-background">
            Loading MindPulse Intelligence Engine...
          </div>
        }
      >
        <LandingSections />
      </Suspense>
    </main>
  );
};

export default Home;
