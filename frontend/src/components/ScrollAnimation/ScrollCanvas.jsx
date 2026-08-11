import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { generateFramePaths, preloadFrames, TOTAL_FRAMES } from './FrameLoader';
import { Overlay } from './Overlay';
import { Brain, Activity } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollCanvas.jsx - Full-viewport 3D Frame Sequence Canvas
 * Driven by GSAP ScrollTrigger scrub with zero lag.
 */
export const ScrollCanvas = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // High-performance refs (never trigger react re-renders during scroll)
  const imagesRef = useRef([]);
  const currentFrameRef = useRef(0);
  const rafIdRef = useRef(null);
  const scrollTriggerRef = useRef(null);

  // UI state for preloader and overlay progress
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  /**
   * Draws a specific frame onto the canvas with cover-fit scaling
   */
  const drawFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    // Calculate aspect ratio cover scale & center offsets
    const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const drawX = (canvasWidth - drawWidth) / 2;
    const drawY = (canvasHeight - drawHeight) / 2;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }, []);

  /**
   * Request animation frame wrapper to avoid redundant redraws
   */
  const requestFrameDraw = useCallback((frameIndex) => {
    currentFrameRef.current = frameIndex;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      drawFrame(frameIndex);
    });
  }, [drawFrame]);

  /**
   * Handle Window Resizing with High-DPI Retina support
   */
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set internal canvas resolution to match DPR for sharp rendering
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Redraw current frame at new resolution
    drawFrame(currentFrameRef.current);
  }, [drawFrame]);

  /**
   * 1. Preload all animation frames on mount
   */
  useEffect(() => {
    let isMounted = true;
    const framePaths = generateFramePaths(TOTAL_FRAMES);

    preloadFrames(framePaths, (loaded, total, percent) => {
      if (isMounted) {
        setLoadingProgress(percent);
      }
    })
      .then((loadedImages) => {
        if (!isMounted) return;
        imagesRef.current = loadedImages;
        setIsLoading(false);

        // Initial setup and draw first frame
        handleResize();
        requestFrameDraw(0);
      })
      .catch((err) => {
        console.error('[ScrollCanvas] Preload error:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [handleResize, requestFrameDraw]);

  /**
   * 2. Initialize GSAP ScrollTrigger after frames are loaded
   */
  useEffect(() => {
    if (isLoading || imagesRef.current.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // Initial resize setup
    handleResize();
    window.addEventListener('resize', handleResize);

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1, // Buttery smooth 1-second scrub lag
      onUpdate: (self) => {
        const progress = Math.min(1, Math.max(0, self.progress));
        setScrollProgress(progress);

        // Map progress (0 to 1) to frame index (0 to TOTAL_FRAMES - 1)
        const frameIndex = Math.min(
          TOTAL_FRAMES - 1,
          Math.floor(progress * TOTAL_FRAMES)
        );

        requestFrameDraw(frameIndex);
      },
    });

    scrollTriggerRef.current = trigger;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isLoading, handleResize, requestFrameDraw]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full bg-black"
      style={{ height: '480vh' }} // Tall scroll container for comfortable exploration
    >
      {/* Sticky Fullscreen Canvas Viewport */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover block"
          style={{ width: '100vw', height: '100vh' }}
        />

        {/* Cinematic Vignette Shadows */}
        <div className="absolute inset-0 pointer-events-none bg-radial-vignette opacity-40" />

        {/* Layered UI Overlay (Nav, Hero, Milestones, Scroll Indicator) */}
        <Overlay 
          scrollProgress={scrollProgress} 
          isLoading={isLoading} 
        />

        {/* High-End Loading Screen while Preloading Frames */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white px-6">
            {/* Glowing Logo Badge */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center p-3 text-cyan-400 shadow-[0_0_60px_rgba(6,182,212,0.5)]">
                <img 
                  src="/logo.png" 
                  alt="MindPulse Logo" 
                  className="w-full h-full object-contain animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 shadow-md">
                <Activity className="w-4 h-4 animate-spin" />
              </div>
            </div>

            {/* Title & Status */}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Initializing MindPulse AI
            </h2>
            <p className="text-sm font-mono text-cyan-300/80 mb-8 flex items-center space-x-2">
              <span>PRELOADING CINEMATIC NEURAL FRAMES</span>
              <span className="text-white font-bold">{loadingProgress}%</span>
            </p>

            {/* Glowing Cyan-Teal-Blue Progress Bar */}
            <div className="w-full max-w-md h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 transition-all duration-150 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)]"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <div className="mt-4 text-xs font-mono text-slate-500">
              Loaded {Math.round((loadingProgress / 100) * TOTAL_FRAMES)} / {TOTAL_FRAMES} frames
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
