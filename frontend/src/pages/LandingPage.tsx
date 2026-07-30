import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HomeHero } from '@/components/sections/HomeHero';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Zap,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Globe,
  Cpu,
  HeartPulse,
  Scale,
  Layers,
  Activity,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const featuresRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const credibilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    // GSAP ScrollTrigger Animations
    const ctx = gsap.context(() => {
      // Feature Cards Reveal
      if (featuresRef.current) {
        gsap.fromTo(
          featuresRef.current.querySelectorAll('.gsap-feature-card'),
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: featuresRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      // Steps Reveal
      if (stepsRef.current) {
        gsap.fromTo(
          stepsRef.current.querySelectorAll('.gsap-step-card'),
          { scale: 0.95, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.7,
            stagger: 0.15,
            ease: 'back.out(1.4)',
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
          { y: 30, opacity: 0 },
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
      cancelAnimationFrame(rafId);
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-foreground">MindPulse</span>
              <span className="text-xs text-brand font-mono ml-2 px-2 py-0.5 rounded bg-brand/10 border border-brand/20">
                v2.4 AI
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#validation" className="hover:text-foreground transition-colors">Validation</a>
            <a href="#tech" className="hover:text-foreground transition-colors">Model Specs</a>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate('/dashboard')} variant="glow">
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Clinical Light Hero Block */}
      <HomeHero />

      {/* Quick Stats Grid */}
      <section className="py-8 px-6 max-w-6xl mx-auto -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-card border border-border shadow-lg">
          <div className="text-center border-r border-border/60 last:border-0 pr-4">
            <div className="text-2xl font-bold text-foreground font-mono">RoBERTa</div>
            <div className="text-xs text-muted-foreground mt-1">Fine-tuned Transformer</div>
          </div>
          <div className="text-center border-r border-border/60 last:border-0 pr-4">
            <div className="text-2xl font-bold text-brand font-mono">10-Dim</div>
            <div className="text-xs text-muted-foreground mt-1">NRC Emotion Lexicon</div>
          </div>
          <div className="text-center border-r border-border/60 last:border-0 pr-4">
            <div className="text-2xl font-bold text-brand-foreground font-mono">&lt; 45ms</div>
            <div className="text-xs text-muted-foreground mt-1">Inference Latency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground font-mono">Roman Urdu</div>
            <div className="text-xs text-muted-foreground mt-1">Bilingual Processing</div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" ref={featuresRef} className="py-24 px-6 bg-secondary/40 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-brand uppercase mb-3">
              Core Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Multi-Layer Psychological NLP Pipeline
            </h3>
            <p className="text-muted-foreground mt-3">
              Combining deep learning embeddings with lexical emotion scoring to surface mental health risk indicators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="gsap-feature-card p-6 rounded-2xl bg-card border border-border hover:border-brand/40 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 text-brand group-hover:scale-105 transition-transform">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Psychological State Indicators</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Multi-signal detection for <strong>Depression, Anxiety, Stress, Anger, and Happiness</strong> derived independently from transformer logits + NRC Lexicon scoring.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="gsap-feature-card p-6 rounded-2xl bg-card border border-border hover:border-brand/40 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 text-brand group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Sarcasm & Irony Detection</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Integrated <code>cardiffnlp/twitter-roberta-base-irony</code> model to flag sarcastic expressions that typically distort plain sentiment analyzers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="gsap-feature-card p-6 rounded-2xl bg-card border border-border hover:border-brand/40 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 text-brand group-hover:scale-105 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Roman Urdu & Multilingual</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pre-processed keyword detection for Roman Urdu emotion terms (e.g. <em>pareshan, udaas, ghussa, tang</em>) alongside English text.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="gsap-feature-card p-6 rounded-2xl bg-card border border-border hover:border-brand/40 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 text-brand group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Risk Level Evaluation</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Calculates composite psychological risk levels (High, Medium, Low, None) to assist researchers in prioritizing high-risk social media posts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="gsap-feature-card p-6 rounded-2xl bg-card border border-border hover:border-brand/40 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 text-brand group-hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Fine-Tuned RoBERTa Engine</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Trained on specialized social media dataset annotations for high accuracy across complex mental health language patterns.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="gsap-feature-card p-6 rounded-2xl bg-card border border-border hover:border-brand/40 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 text-brand group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Real-Time Performance</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Optimized model loading with pre-initialized torch runtime serving predictions under 45ms per request.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3-Step Visual) */}
      <section id="how-it-works" ref={stepsRef} className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-brand uppercase mb-3">
            Workflow Engine
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            How MindPulse Analyzes Text
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="gsap-step-card p-8 rounded-2xl bg-card border border-border relative shadow-sm">
            <div className="text-xs font-mono text-brand font-bold mb-4 flex items-center justify-between">
              <span>STEP 01</span>
              <span className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">1</span>
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
            <div className="text-xs font-mono text-brand font-bold mb-4 flex items-center justify-between">
              <span>STEP 02</span>
              <span className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">2</span>
            </div>
            <h4 className="text-xl font-bold text-foreground mb-3">Hybrid Inference Execution</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Executes parallel analysis across RoBERTa Transformer logits, CardiffNLP Irony model, and NRC 10-emotion lexicon scoring.
            </p>
            <div className="p-3 rounded-lg bg-secondary/80 font-mono text-xs text-brand-foreground border border-border">
              [RoBERTa: 88%] [NRC Fear: 0.9] [Irony: False]
            </div>
          </div>

          {/* Step 3 */}
          <div className="gsap-step-card p-8 rounded-2xl bg-card border border-border relative shadow-sm">
            <div className="text-xs font-mono text-brand font-bold mb-4 flex items-center justify-between">
              <span>STEP 03</span>
              <span className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">3</span>
            </div>
            <h4 className="text-xl font-bold text-foreground mb-3">Diagnostic Breakdown & Risk</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Generates independent psychological dimension levels (High/Medium/Low) and composite risk flags.
            </p>
            <div className="p-3 rounded-lg bg-secondary/80 font-mono text-xs text-brand border border-border">
              Risk: High | Anxiety: High | Depression: Med
            </div>
          </div>
        </div>
      </section>

      {/* Credibility & Scientific Validation */}
      <section id="validation" ref={credibilityRef} className="py-20 px-6 bg-secondary/30 border-t border-border">
        <div className="max-w-5xl mx-auto rounded-3xl bg-card border border-border p-8 sm:p-12 relative overflow-hidden shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold text-brand uppercase tracking-wider">
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
              <CheckCircle2 className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground">
                <strong className="text-foreground">Multi-Signal Formula:</strong> Prevents reliance on single model logits by integrating lexical term intensity.
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground">
                <strong className="text-foreground">Sarcasm Mitigation:</strong> Reduces false positive depression flags caused by sarcastic social posts.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Spec */}
      <section id="tech" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-brand uppercase mb-3">
            Technical Architecture
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Built on Fine-Tuned Transformer Models
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Layers className="w-6 h-6 text-brand" />
              <h4 className="text-xl font-bold text-foreground">Sentiment Model Architecture</h4>
            </div>
            <ul className="space-y-3 text-sm font-mono">
              <li className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Base Model:</span>
                <span className="text-foreground font-semibold">twitter-roberta-base-sentiment</span>
              </li>
              <li className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Fine-Tuning Domain:</span>
                <span className="text-foreground font-semibold">Mental Health Social Media Posts</span>
              </li>
              <li className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Lexicon Integration:</span>
                <span className="text-foreground font-semibold">NRC Emotion Lexicon (10 dimensions)</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Classes:</span>
                <span className="text-brand font-semibold">Anxious, Depressed, Happy, Neutral</span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6 text-brand" />
              <h4 className="text-xl font-bold text-foreground">Irony & Sarcasm Subsystem</h4>
            </div>
            <ul className="space-y-3 text-sm font-mono">
              <li className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Sarcasm Model:</span>
                <span className="text-foreground font-semibold">cardiffnlp/twitter-roberta-base-irony</span>
              </li>
              <li className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Roman Urdu Keywords:</span>
                <span className="text-foreground font-semibold">Custom Regex & Phrase Dictionary</span>
              </li>
              <li className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Response Format:</span>
                <span className="text-foreground font-semibold">JSON REST API via Flask</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Inference Runtime:</span>
                <span className="text-brand-foreground font-semibold">PyTorch CPU & CUDA ready</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-16 px-6 bg-secondary/50 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Brain className="w-6 h-6 text-brand" />
              <span className="text-xl font-bold text-foreground">MindPulse AI Console</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Natural Language Psychological Diagnostics & Sentiment Analysis Tool.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate('/dashboard')} variant="glow">
              <span>Open Interactive Dashboard</span>
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
