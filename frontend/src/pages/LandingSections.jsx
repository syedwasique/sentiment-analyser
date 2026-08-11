import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import {
  Zap,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Globe,
  Cpu,
  HeartPulse,
  Scale,
  Activity,
  Terminal,
  MessageSquare,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

gsap.registerPlugin(ScrollTrigger);

// Data structure for the 6 core capability feature cards
const CAPABILITY_CARDS = [
  {
    id: 'psychological-indicators',
    icon: HeartPulse,
    title: 'Psychological State Indicators',
    description: (
      <>
        Multi-signal detection for <strong>Depression, Anxiety, Stress, Anger, and Happiness</strong> derived independently from transformer logits + NRC Lexicon scoring.
      </>
    ),
  },
  {
    id: 'sarcasm-detection',
    icon: Zap,
    title: 'Sarcasm & Irony Detection',
    description: (
      <>
        Implemented efficient sarcasm detection to identify context-dependent expressions and improve overall sentiment analysis accuracy.
      </>
    ),
  },
  {
    id: 'risk-evaluation',
    icon: ShieldAlert,
    title: 'Risk Level Evaluation',
    description: (
      <>
        Calculates composite psychological risk levels (High, Medium, Low, None) to assist researchers in prioritizing high-risk social media posts.
      </>
    ),
  },
  {
    id: 'roberta-engine',
    icon: Cpu,
    title: 'Fine-Tuned RoBERTa Engine',
    description: (
      <>
        Trained on specialized social media dataset annotations for high accuracy across complex mental health language patterns.
      </>
    ),
  },
  {
    id: 'realtime-performance',
    icon: Activity,
    title: 'Real-Time Performance',
    description: (
      <>
        Optimized model loading with pre-initialized torch runtime serving predictions under 45ms per request.
      </>
    ),
  },
];

/**
 * LandingSections.jsx - Rich informational and interactive sections below the scroll animation
 */
export const LandingSections = () => {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();
  const ctaRef = useRef(null);
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);
  const credibilityRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Grand Hero CTA entrance
      if (ctaRef.current) {
        gsap.fromTo(
          ctaRef.current,
          { y: 60, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: ctaRef.current,
              start: 'top 85%',
            },
          }
        );
      }

      // Feature Section Header Entrance
      if (featuresRef.current) {
        gsap.fromTo(
          featuresRef.current.querySelector('.gsap-features-header'),
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: featuresRef.current,
              start: 'top 85%',
            },
          }
        );
      }

      // Steps Stagger Reveal
      if (stepsRef.current) {
        gsap.fromTo(
          stepsRef.current.querySelectorAll('.gsap-step-card'),
          { scale: 0.94, opacity: 0, y: 30 },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: stepsRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      // Credibility Section Reveal
      if (credibilityRef.current) {
        gsap.fromTo(
          credibilityRef.current,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: credibilityRef.current,
              start: 'top 85%',
            },
          }
        );
      }
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div className="relative z-30 bg-background text-foreground overflow-hidden">
      {/* ============================================================
          CORE CAPABILITIES - INFINITE AUTO-SCROLLING HORIZONTAL MARQUEE
         ============================================================ */}
      <section id="features" ref={featuresRef} className="py-24 bg-secondary/40 border-y border-border overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 mb-14 text-center gsap-features-header">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-cyan-400 uppercase mb-3">
              Core Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Multi-Layer Psychological NLP Pipeline
            </h3>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              Combining deep learning embeddings with lexical emotion scoring to surface mental health risk indicators.
            </p>
          </div>
        </div>

        {/* Horizontal Marquee Container with Left & Right Gradient Fade Masks */}
        <div className="relative w-full marquee-wrapper overflow-hidden py-4">
          {/* Left Edge Gradient Fade */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 md:w-44 bg-gradient-to-r from-background via-background/90 to-transparent z-20" />

          {/* Right Edge Gradient Fade */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 md:w-44 bg-gradient-to-l from-background via-background/90 to-transparent z-20" />

          {/* Scrolling Track (Duplicated array for seamless continuous loop) */}
          <div className="animate-marquee-infinite flex gap-6 px-3">
            {[...CAPABILITY_CARDS, ...CAPABILITY_CARDS].map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={`${card.id}-${idx}`}
                  className="w-[300px] sm:w-[360px] md:w-[390px] flex-shrink-0 p-6 sm:p-8 rounded-3xl bg-card border border-border hover:border-cyan-500/50 transition-all duration-300 hover:shadow-2xl group/card cursor-pointer select-none"
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 text-cyan-400 group-hover/card:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2.5 group-hover/card:text-cyan-400 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works (3-Step Visual) */}
      <section id="how-it-works" ref={stepsRef} className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-cyan-400 uppercase mb-3">
            Workflow Engine
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            How MindPulse Analyzes Text
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="gsap-step-card p-8 rounded-2xl bg-card border border-border relative shadow-sm">
            <div className="text-xs font-mono text-cyan-400 font-bold mb-4 flex items-center justify-between">
              <span>STEP 01</span>
              <span className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">1</span>
            </div>
            <h4 className="text-xl font-bold text-foreground mb-3">Text Input & Tokenization</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Social media posts or clinical text extracts are tokenized using Byte-Pair Encoding (BPE) for RoBERTa.
            </p>
            <div className="p-3 rounded-lg bg-secondary/80 font-mono text-xs text-foreground border border-border">
              &gt; "Feel exhausted and anxious all day..."
            </div>
          </div>

          {/* Step 2 */}
          <div className="gsap-step-card p-8 rounded-2xl bg-card border border-border relative shadow-sm">
            <div className="text-xs font-mono text-cyan-400 font-bold mb-4 flex items-center justify-between">
              <span>STEP 02</span>
              <span className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">2</span>
            </div>
            <h4 className="text-xl font-bold text-foreground mb-3">Hybrid Inference Execution</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Executes parallel analysis across RoBERTa Transformer logits, CardiffNLP Irony model, and NRC 10-emotion lexicon scoring.
            </p>
            <div className="p-3 rounded-lg bg-secondary/80 font-mono text-xs text-cyan-300 border border-border">
              [RoBERTa: 88%] [NRC Fear: 0.9] [Irony: False]
            </div>
          </div>

          {/* Step 3 */}
          <div className="gsap-step-card p-8 rounded-2xl bg-card border border-border relative shadow-sm">
            <div className="text-xs font-mono text-cyan-400 font-bold mb-4 flex items-center justify-between">
              <span>STEP 03</span>
              <span className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">3</span>
            </div>
            <h4 className="text-xl font-bold text-foreground mb-3">Diagnostic Breakdown & Risk</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Generates independent psychological dimension levels (High/Medium/Low) and composite risk flags.
            </p>
            <div className="p-3 rounded-lg bg-secondary/80 font-mono text-xs text-teal-300 border border-border">
              Risk: High | Anxiety: High | Depression: Med
            </div>
          </div>
        </div>
      </section>

      {/* Credibility & Scientific Validation */}
      <section id="validation" ref={credibilityRef} className="py-20 px-6 bg-secondary/30 border-t border-border">
        <div className="max-w-5xl mx-auto rounded-3xl bg-card border border-border p-8 sm:p-12 relative overflow-hidden shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Academic Validation
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Validated in Collaboration with University Psychology Department Researchers
          </h3>

          <p className="text-muted-foreground leading-relaxed mb-6">
            MindPulse was developed as a University Final Year Project (FYP) to bridge computational NLP and mental health analytics. The multi-signal scoring formulas (combining model class probabilities with NRC emotion lexicons and keyword negation flags) were benchmarked against domain expert guidelines.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-6">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground">
                <strong className="text-foreground">Multi-Signal Formula:</strong> Prevents reliance on single model logits by integrating lexical term intensity.
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground">
                <strong className="text-foreground">Sarcasm Mitigation:</strong> Reduces false positive depression flags caused by sarcastic social posts.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-16 px-6 bg-secondary/50 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.4)] flex-shrink-0">
              <img
                src="/logo.png"
                alt="MindPulse Logo"
                className="w-full h-full object-contain scale-[1.7] drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
              />
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground tracking-tight">MindPulse AI Console</span>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Natural Language Psychological Diagnostics & Sentiment Analysis Tool.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white text-sm font-semibold transition-all flex items-center space-x-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Explore Tweets</span>
            </a>
            <Button onClick={() => navigate('/dashboard')} variant="glow">
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MindPulse. Final Year Project — Psychology & Computer Science Research.
        </div>
      </footer>
    </div>
  );
};
