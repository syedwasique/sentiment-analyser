import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';
import {
  Brain,
  Zap,
  ArrowLeft,
  Check,
  Copy,
  FolderTree,
  RefreshCw,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
  Activity,
  Flame,
  FileText,
  Info,
  Terminal,
  BarChart3,
  FileDown,
  Loader2,
  X,
  ExternalLink,
  Download,
  HelpCircle,
  Sparkles,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  Wind,
  ShieldAlert,
  History,
  CheckSquare,
  Sun,
  Compass,
  Mic,
  MicOff,
  TrendingUp,
  Pause,
  Play,
} from 'lucide-react';
import { analyzeText, fetchPdfReportBlob, type AnalysisResponse, type KeywordFlags } from '../api/analyze';
import { Button } from '@/components/ui/button';

// Sample Presets for Quick Testing
const PRESETS = [
  {
    label: 'Depression',
    text: "Honestly, lately I feel completely detached from everything. I spend hours staring at walls. I can't find energy to do basic chores, and sleep doesn't help. I just feel incredibly hopeless about the future, like nothing will ever get better.",
    category: 'depression',
  },
  {
    label: 'Happy',
    text: 'Just received my promotion today! Hard work really pays off. Excited to start this new journey with the team, thanks everyone for the support!',
    category: 'happy',
  },
  {
    label: 'Anxiety',
    text: "My heart has been racing all day. I have this constant knot in my stomach and I keep expecting something terrible to happen, even though nothing is wrong. I can't focus on work and my hands won't stop shaking.",
    category: 'anxiety',
  },
  {
    label: 'Anger',
    text: 'I am absolutely furious right now. I want to punch something. Nobody listens and everything is just falling apart. I have zero patience left for this nonsense.',
    category: 'anger',
  },
  {
    label: 'Sarcasm',
    text: "Oh fantastic, another panic attack right before my presentation! /s Just what I needed. Living the dream with 2 hours of sleep and non-stop anxiety. Sounded much better in my head.",
    category: 'sarcasm',
  },
  {
    label: 'Burnout',
    text: "Completely exhausted. Working 14-hour days for the last 3 weeks. I feel like my brain is fried and I have zero patience left. I can't even remember the last time I relaxed or slept a full 8 hours.",
    category: 'burnout',
  },
];

const FLAG_DEFS: { key: keyof KeywordFlags; label: string; icon: string }[] = [
  { key: 'has_burnout_term',         label: 'Burnout Indicator',       icon: '🔥' },
  { key: 'has_anger_term',           label: 'Hostility Indicator',     icon: '⚡' },
  { key: 'has_distress_term',        label: 'Distress Marker',         icon: '⚠️' },
  { key: 'has_negation_of_positive', label: 'Negation Trigger',        icon: '🚫' },
  { key: 'has_ru_dep',               label: 'Roman Urdu Depression',   icon: '🌧️' },
  { key: 'has_ru_anx',               label: 'Roman Urdu Anxiety',      icon: '😰' },
  { key: 'has_explicit_anxiety',     label: 'Panic Keywords',          icon: '💥' },
];

const PSYCH_DIMENSIONS_INFO: Record<string, { title: string; subtitle: string; desc: Record<string, string> }> = {
  depression: {
    title: 'Depression & Mood',
    subtitle: 'Evaluates low mood, emotional apathy, and hopelessness markers.',
    desc: {
      High: 'Severe low mood or emotional weight detected in phrasing. Reflects feeling overwhelmed, empty, or hopeless.',
      Medium: 'Moderate depressive indicators present. Reflects noticeable sadness, fatigue, or low emotional energy.',
      Low: 'Minimal to no depressive linguistic markers detected. Baseline emotional mood is stable.',
    },
  },
  anxiety: {
    title: 'Anxiety & Panic',
    subtitle: 'Evaluates dread, racing thoughts, panic, and physical tension keywords.',
    desc: {
      High: 'High anxiety signals present (apprehension, dread, panic, or racing thoughts).',
      Medium: 'Moderate anxiety present. User expresses noticeable worry or nervousness about outcomes.',
      Low: 'Low anxiety signals. Text reflects a calm, manageable baseline state.',
    },
  },
  stress: {
    title: 'Stress & Burnout',
    subtitle: 'Evaluates exhaustion, workload pressure, and coping capacity.',
    desc: {
      High: 'Critical stress/burnout markers. Mentions being overwhelmed or unable to cope with current load.',
      Medium: 'Elevated stress detected. User reports managing significant workload or emotional pressure.',
      Low: 'Optimal coping capacity. Indicates normal, healthy stress levels.',
    },
  },
  anger: {
    title: 'Anger & Hostility',
    subtitle: 'Evaluates frustration, agitation, outrage, and hostile phrasing.',
    desc: {
      High: 'Strong frustration, outrage, or aggressive phrasing detected.',
      Medium: 'Mild to moderate irritation or annoyance expressed in phrasing.',
      Low: 'No hostility or anger detected. Content remains emotionally calm.',
    },
  },
  happiness: {
    title: 'Happiness & Positivity',
    subtitle: 'Evaluates joy, gratitude, contentment, and emotional resilience.',
    desc: {
      High: 'Strong positive emotional state. Expresses joy, gratitude, pride, or achievement.',
      Medium: 'Mild positivity or pleasant sentiment detected.',
      Low: 'Low expression of positivity or satisfaction in input text.',
    },
  },
};

const AFFIRMATIONS = [
  "You are stronger than your stress, and this feeling is temporary.",
  "Taking a step back to breathe is a sign of wisdom, not weakness.",
  "Your feelings are valid, but they do not define your future.",
  "One moment at a time. You have handled difficult times before.",
  "Be gentle with yourself. You are doing the best you can right now.",
  "Rest is productive. Giving your brain peace creates true strength.",
  "You deserve peace, clarity, and kindness from yourself.",
];

interface HistoryEntry {
  id: string;
  timestamp: string;
  date: string;
  text: string;
  sentiment: string;
  risk: string;
  score: number;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showJson, setShowJson] = useState<boolean>(false);
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);

  // Voice Journaling & History States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);

  // Self-Care Toolkit States
  const [showBreathingModal, setShowBreathingModal] = useState<boolean>(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathingActive, setBreathingActive] = useState<boolean>(false);
  const [affirmationIdx, setAffirmationIdx] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mindpulse_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  }, []);

  // 4-7-8 Breathing Cycle Logic
  useEffect(() => {
    if (!breathingActive) return;
    let timer: NodeJS.Timeout;

    const runCycle = () => {
      setBreathingPhase('Inhale');
      timer = setTimeout(() => {
        setBreathingPhase('Hold');
        timer = setTimeout(() => {
          setBreathingPhase('Exhale');
          timer = setTimeout(() => {
            if (breathingActive) runCycle();
          }, 8000);
        }, 7000);
      }, 4000);
    };

    runCycle();
    return () => clearTimeout(timer);
  }, [breathingActive]);

  // Handle Speech Recognition Toggle
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (e: any) {
      alert('Could not start speech recognition: ' + e.message);
    }
  };

  const handleAnalyze = async (overrideText?: string) => {
    const textToSubmit = overrideText !== undefined ? overrideText : inputText;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeText(textToSubmit);
      setResult(data);

      // Save to local history for Weekly Analytics
      const now = new Date();
      const newEntry: HistoryEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        text: textToSubmit.length > 50 ? textToSubmit.slice(0, 50) + '...' : textToSubmit,
        sentiment: data.sentiment,
        risk: data.risk_level,
        score: Math.round(data.sentiment_score * 100),
      };

      const updatedHistory = [newEntry, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      try {
        localStorage.setItem('mindpulse_history', JSON.stringify(updatedHistory));
      } catch { /* ignore */ }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with Flask ML backend.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (presetText: string) => {
    setInputText(presetText);
    handleAnalyze(presetText);
  };

  const handleRandomSample = () => {
    const idx = Math.floor(Math.random() * PRESETS.length);
    const text = PRESETS[idx].text;
    setInputText(text);
    handleAnalyze(text);
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    const payload: Record<string, unknown> = result
      ? (result as unknown as Record<string, unknown>)
      : inputText.trim()
      ? { text: inputText }
      : null as any;
    if (!payload) return;

    setPdfDownloading(true);
    try {
      const pdfBlob = await fetchPdfReportBlob(payload);
      const url = URL.createObjectURL(pdfBlob);

      setPdfPreviewUrl(url);
      setPdfModalOpen(true);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'MindPulse_Analysis_Report.pdf';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 1000);
    } catch (err: any) {
      alert('Failed to generate PDF report: ' + (err.message || 'Server error'));
    } finally {
      setPdfDownloading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'High':
        return 'bg-red-500/10 text-red-700 border-red-200 dark:border-red-900/50';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-900/50';
      default:
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-900/50';
    }
  };

  const getPsychologicalChartData = () => {
    if (!result) return [];
    const levelToVal = (lvl: string) => (lvl === 'High' ? 90 : lvl === 'Medium' ? 55 : 20);
    return [
      { subject: 'Depression', value: levelToVal(result.psychological_states.depression) },
      { subject: 'Anxiety', value: levelToVal(result.psychological_states.anxiety) },
      { subject: 'Stress', value: levelToVal(result.psychological_states.stress) },
      { subject: 'Anger', value: levelToVal(result.psychological_states.anger) },
      { subject: 'Happiness', value: levelToVal(result.psychological_states.happiness) },
    ];
  };

  const getClassProbabilitiesData = () => {
    if (!result || !result.all_scores) return [];
    return Object.entries(result.all_scores).map(([className, score]) => ({
      name: className,
      probability: Math.round(score * 100),
    }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand/20">
      {/* Console Top Bar */}
      <header className="h-14 bg-card border-b border-border px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-brand" />
            <span className="font-bold text-sm tracking-tight text-foreground">MindPulse Mental Health Hub</span>
          </div>
        </div>

        {/* Top Feature Buttons */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setShowAnalyticsModal(true)}
            className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold flex items-center space-x-1.5 transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Weekly Analytics</span>
          </button>

          <button
            onClick={() => setShowBreathingModal(true)}
            className="px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Wind className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guided Breathing</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium flex items-center space-x-1.5 transition-all"
          >
            <History className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Log ({history.length})</span>
          </button>
        </div>
      </header>

      {/* Sub-header Navigation */}
      <div className="bg-secondary/30 border-b border-border px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-2 font-mono">
          <span className="text-brand">MindPulse Engine</span>
          <span>/</span>
          <span className="text-foreground font-semibold">Dual Column Analysis Dashboard</span>
        </div>
        <div className="font-mono text-muted-foreground hidden md:block">
          Features: <code>Voice Journaling • 5-Dimension Psychological Assessment • Weekly Mood Analytics</code>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Input Area with SPEECH TO TEXT VOICE JOURNALING */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-brand" />
              <span>Input Text or Speak Aloud for Diagnostics</span>
            </label>

            {/* Microphone Voice Input Button */}
            <button
              onClick={toggleRecording}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all border ${
                isRecording
                  ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-md'
                  : 'bg-brand/10 text-brand border-brand/30 hover:bg-brand/20'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isRecording ? 'Listening... Stop Recording' : 'Voice Journaling (Mic)'}</span>
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or click 'Voice Journaling' above to speak your thoughts aloud..."
            rows={4}
            className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-sans resize-none transition-all"
          />

          {/* Sample Preset Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono mr-1">Presets:</span>
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset.text)}
                  className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground font-mono transition-colors"
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleRandomSample}
                className="text-xs text-brand hover:text-brand/80 font-mono transition-colors flex items-center gap-1"
                disabled={loading}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Random Sample
              </button>
              <Button
                onClick={() => handleAnalyze()}
                disabled={loading || !inputText.trim()}
                variant="glow"
                className="h-9 px-5 text-xs font-semibold"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Full Analysis</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-200 text-red-700 text-sm flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold mb-1">Backend Server Error</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm animate-pulse space-y-6">
            <div className="h-6 w-64 bg-secondary rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-secondary rounded-2xl" />
              <div className="h-64 bg-secondary rounded-2xl" />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !result && !error && (
          <div className="bg-card border border-border rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[340px]">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Ready for Dual-Engine Analysis</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Enter custom text above or click **"Voice Journaling"** to speak your thoughts. The system will evaluate **Sentiment & Tone** alongside **Psychological & Emotional States**.
            </p>
          </div>
        )}

        {/* Results Section */}
        {!loading && result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Results Action Header Bar */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Diagnostic Results Ready</h3>
                  <p className="text-xs text-muted-foreground">
                    Analyzed Text: <span className="italic font-serif text-foreground/80">"{result.text.length > 60 ? result.text.slice(0, 60) + '...' : result.text}"</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-xs font-mono text-muted-foreground block">Overall Risk</span>
                  <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-mono font-bold border ${getLevelBadgeClass(result.risk_level)}`}>
                    {result.risk_level} Risk
                  </span>
                </div>

                <Button
                  onClick={handleDownloadPdf}
                  disabled={pdfDownloading}
                  className="bg-brand text-primary-foreground hover:bg-brand/90 font-semibold text-xs h-9 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-sm"
                >
                  {pdfDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  <span>{pdfDownloading ? 'Generating PDF...' : 'Export PDF Report'}</span>
                </Button>
              </div>
            </div>

            {/* Psychological Risk Alert Callout */}
            {(result.risk_level === 'High' || result.risk_level === 'Medium' || result.flagged) && (
              <div
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 shadow-sm ${
                  result.risk_level === 'High'
                    ? 'bg-amber-500/10 border-amber-200 text-amber-900 dark:text-amber-200'
                    : 'bg-sky-500/10 border-sky-200 text-sky-900 dark:text-sky-200'
                }`}
              >
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                <div className="text-xs sm:text-sm leading-relaxed">
                  <strong className="font-semibold block mb-0.5">
                    Clinical Alert: {result.risk_level} Psychological Risk Detected
                  </strong>
                  <span>
                    The multi-signal analysis pipeline flagged indicators of emotional distress. If you or someone you know is feeling overwhelmed, confidential support is available 24/7 via helpline 988.
                  </span>
                </div>
              </div>
            )}

            {/* SEPARATE 2-COLUMN DASHBOARD LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* COLUMN 1: SENTIMENT ANALYSIS */}
              <div className="space-y-5">
                {/* Column Header */}
                <div className="bg-card border-b-2 border-brand/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                      <Smile className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        1. Sentiment Analysis
                      </h3>
                      <p className="text-xs text-muted-foreground">Tone, emotional polarity, & sarcasm detection</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-secondary text-brand border border-border">
                    COLUMN A
                  </span>
                </div>

                {/* Explanatory Box */}
                <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed flex items-start space-x-3">
                  <HelpCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block font-semibold mb-0.5">What is Sentiment Analysis?</strong>
                    <span>
                      Evaluates whether the input text expresses an overall <b>Positive</b>, <b>Neutral</b>, or <b>Negative</b> emotional tone, powered by RoBERTa deep learning transformers.
                    </span>
                  </div>
                </div>

                {/* Overall Sentiment Card */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Primary Sentiment Category
                    </span>
                    <span className="text-xs font-mono text-brand font-bold">
                      {Math.round(result.sentiment_score * 100)}% Confidence
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        result.sentiment === 'Positive'
                          ? 'bg-emerald-500/10 border border-emerald-200 text-emerald-600'
                          : result.sentiment === 'Negative'
                          ? 'bg-red-500/10 border border-red-200 text-red-600'
                          : 'bg-secondary border border-border text-foreground'
                      }`}
                    >
                      {result.sentiment === 'Positive' ? (
                        <Smile className="w-8 h-8" />
                      ) : result.sentiment === 'Negative' ? (
                        <Frown className="w-8 h-8" />
                      ) : (
                        <Meh className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <span className="text-2xl font-black text-foreground tracking-tight block">
                        {result.sentiment}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground block mt-0.5">
                        Predicted Model Class: <strong className="text-brand">{result.predicted_label}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Sarcasm & Rhetoric Sub-card */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-brand" />
                      <span className="text-xs font-semibold text-foreground">Sarcasm & Irony Detector:</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                        result.is_sarcastic
                          ? 'bg-purple-500/10 text-purple-700 border-purple-200'
                          : 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {result.is_sarcastic ? '⚡ Sarcasm Detected' : '✓ Literal Expression'}
                    </span>
                  </div>
                </div>

                {/* Model Class Probabilities Distribution */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-brand" />
                      <span>RoBERTa Model Class Probabilities</span>
                    </h4>
                    <span className="text-xs font-mono text-muted-foreground">Distribution</span>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(result.all_scores).map(([className, score]) => {
                      const pct = Math.round(score * 100);
                      return (
                        <div key={className} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-foreground font-medium">{className}</span>
                            <span className="text-brand font-bold">{pct}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden border border-border">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                className.includes('Happy')
                                  ? 'bg-emerald-500'
                                  : className.includes('Depressed') || className.includes('Anxious')
                                  ? 'bg-red-500'
                                  : 'bg-brand'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recharts Bar Graph */}
                  <div className="h-44 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getClassProbabilitiesData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                          {getClassProbabilitiesData().map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.name.includes('Happy')
                                  ? '#10b981'
                                  : entry.name.includes('Depressed') || entry.name.includes('Anxious')
                                  ? '#ef4444'
                                  : 'hsl(var(--brand))'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: PSYCHOLOGICAL ANALYSIS */}
              <div className="space-y-5">
                {/* Column Header */}
                <div className="bg-card border-b-2 border-brand/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        2. Psychological Analysis
                      </h3>
                      <p className="text-xs text-muted-foreground">5 Clinical mental health & emotion dimensions</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-secondary text-brand border border-border">
                    COLUMN B
                  </span>
                </div>

                {/* Explanatory Box */}
                <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed flex items-start space-x-3">
                  <HelpCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block font-semibold mb-0.5">What is Psychological Analysis?</strong>
                    <span>
                      Evaluates 5 distinct psychological dimensions (Depression, Anxiety, Stress, Anger, Happiness) using multi-signal RoBERTa class weights + NRC lexicon emotion features.
                    </span>
                  </div>
                </div>

                {/* 5 Psychological Dimension Cards & Detailed Explanations */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3.5">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>5-Dimension Mental State Breakdown</span>
                    <span>Level & Explanation</span>
                  </h4>

                  <div className="space-y-3">
                    {Object.entries(result.psychological_states).map(([stateKey, level]) => {
                      const info = PSYCH_DIMENSIONS_INFO[stateKey] || {
                        title: stateKey,
                        subtitle: 'Dimension evaluation',
                        desc: { High: 'High indicator', Medium: 'Medium indicator', Low: 'Low indicator' },
                      };
                      const description = info.desc[level] || info.desc['Low'];

                      return (
                        <div key={stateKey} className="bg-background border border-border rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-sm text-foreground block">{info.title}</span>
                              <span className="text-xs text-muted-foreground block">{info.subtitle}</span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getLevelBadgeClass(level)}`}>
                              {level} LEVEL
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground italic border-t border-border/60 pt-2 leading-relaxed">
                            "{description}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5-Axis Radar Intensity Chart */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-brand" />
                    <span>Psychological Dimension Intensity Radar</span>
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getPsychologicalChartData()}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--border))" />
                        <Radar
                          name="Diagnostic Intensity"
                          dataKey="value"
                          stroke="hsl(var(--brand))"
                          fill="hsl(var(--brand))"
                          fillOpacity={0.35}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Extracted Feature Markers */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    Extracted Lexicon & Keyword Feature Markers
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {FLAG_DEFS.map(({ key, label, icon }) => {
                      const active = !!(result.keyword_flags?.[key]);
                      return (
                        <span
                          key={key}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-all ${
                            active
                              ? 'bg-red-500/10 text-red-700 border-red-200 dark:border-red-900/50'
                              : 'bg-secondary text-muted-foreground border-border opacity-50'
                          }`}
                        >
                          {active ? `${icon} ` : ''}{label}
                          {active && <span className="ml-1 text-red-500 font-bold">✓</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* MENTAL HEALTH COPING PLAN & SELF-CARE ACTION HUB */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Personalized Coping & Mental Wellness Hub</h3>
                    <p className="text-xs text-muted-foreground">Tailored evidence-based wellness strategies based on your diagnostic results</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowBreathingModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-brand text-primary-foreground text-xs font-semibold hover:bg-brand/90 transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  <Wind className="w-4 h-4" />
                  <span>Start 4-7-8 Breathing</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Coping Checklist */}
                <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4" />
                    <span>Micro-Self-Care Checklist</span>
                  </h4>
                  <p className="text-xs text-muted-foreground">Complete small grounding steps right now:</p>
                  
                  <div className="space-y-2 text-xs">
                    {[
                      { id: 'water', text: 'Drink a glass of cool water' },
                      { id: 'breathe', text: 'Take 3 slow deep breaths' },
                      { id: 'walk', text: 'Step outside or look out window' },
                      { id: 'stretch', text: 'Unclench jaw and roll shoulders' },
                      { id: 'friend', text: 'Reach out to a trusted contact' },
                    ].map((task) => (
                      <label
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`flex items-center space-x-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          completedTasks[task.id]
                            ? 'bg-emerald-500/10 border-emerald-200 text-emerald-800 line-through'
                            : 'bg-card border-border text-foreground hover:bg-secondary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!completedTasks[task.id]}
                          onChange={() => {}}
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>{task.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Positive Affirmation Card */}
                <div className="bg-background border border-border rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 flex items-center space-x-2 mb-2">
                      <Sun className="w-4 h-4" />
                      <span>Daily Mental Resilience Affirmation</span>
                    </h4>
                    <blockquote className="border-l-2 border-amber-500 pl-3 text-xs text-foreground/90 italic leading-relaxed my-2">
                      "{AFFIRMATIONS[affirmationIdx]}"
                    </blockquote>
                  </div>

                  <button
                    onClick={() => setAffirmationIdx((prev) => (prev + 1) % AFFIRMATIONS.length)}
                    className="w-full py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground font-mono transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-brand" />
                    <span>New Affirmation</span>
                  </button>
                </div>

                {/* Crisis Support Card */}
                <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Immediate Crisis & Support Resources</span>
                  </h4>
                  <p className="text-xs text-muted-foreground">Free, confidential 24/7 compassionate support:</p>

                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between">
                      <div>
                        <strong className="block text-foreground">National Crisis Lifeline</strong>
                        <span className="text-muted-foreground">Call or text anytime</span>
                      </div>
                      <span className="font-mono font-bold text-brand text-sm">988</span>
                    </div>

                    <div className="p-2 rounded-lg bg-card border border-border flex items-center justify-between">
                      <div>
                        <strong className="block text-foreground">Crisis Text Line</strong>
                        <span className="text-muted-foreground">Text HOME to 741741</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 text-sm">741741</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Developer Raw JSON Toggle Box */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <button
                onClick={() => setShowJson(!showJson)}
                className="w-full flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-brand" />
                  <span>Inspect Raw API Response (JSON Payload)</span>
                </div>
                <div className="flex items-center space-x-2">
                  {showJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showJson && (
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex justify-end">
                    <button
                      onClick={handleCopyJson}
                      className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground font-mono transition-colors flex items-center space-x-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-secondary/80 border border-border font-mono text-xs text-foreground overflow-x-auto max-h-80">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* WEEKLY MOOD ANALYTICS MODAL */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-border rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Weekly Mood Analytics & Emotional Trajectory</h3>
                  <p className="text-xs text-muted-foreground">Tracking your sentiment scores across recorded entries</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {history.length < 2 ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono space-y-2">
                <Activity className="w-8 h-8 text-brand mx-auto mb-2 opacity-50" />
                <p className="font-bold text-foreground">Need at least 2 entries to display trend graphs</p>
                <p>Run a few text or voice analyses to unlock your weekly trajectory timeline!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history.slice().reverse()} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--brand))" strokeWidth={3} dot={{ fill: 'hsl(var(--brand))', r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-secondary rounded-xl">
                    <span className="text-muted-foreground block font-mono">Total Entries</span>
                    <span className="font-bold text-lg text-foreground">{history.length}</span>
                  </div>
                  <div className="p-3 bg-secondary rounded-xl">
                    <span className="text-muted-foreground block font-mono">Latest Mood</span>
                    <span className="font-bold text-lg text-brand">{history[0]?.sentiment || 'Neutral'}</span>
                  </div>
                  <div className="p-3 bg-secondary rounded-xl">
                    <span className="text-muted-foreground block font-mono">Latest Risk</span>
                    <span className="font-bold text-lg text-emerald-600">{history[0]?.risk || 'None'}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* GUIDED BREATHING MODAL */}
      {showBreathingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center space-y-6"
          >
            <div className="w-full flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center space-x-2 text-brand">
                <Wind className="w-5 h-5" />
                <h3 className="font-bold text-base text-foreground">Guided 4-7-8 Breathing Circle</h3>
              </div>
              <button
                onClick={() => { setBreathingActive(false); setShowBreathingModal(false); }}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Inhale for 4s, hold for 7s, exhale for 8s to quickly soothe your nervous system.
            </p>

            <div className="relative w-48 h-48 flex items-center justify-center my-4">
              <motion.div
                animate={{
                  scale: breathingActive ? (breathingPhase === 'Inhale' ? 1.45 : breathingPhase === 'Hold' ? 1.45 : 1) : 1,
                  opacity: breathingActive ? (breathingPhase === 'Hold' ? 0.9 : 0.6) : 0.5,
                }}
                transition={{
                  duration: breathingPhase === 'Inhale' ? 4 : breathingPhase === 'Hold' ? 7 : 8,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full bg-brand/20 border-2 border-brand"
              />
              <div className="z-10 flex flex-col items-center">
                <span className="text-xl font-extrabold text-foreground tracking-wide uppercase">
                  {breathingActive ? breathingPhase : 'Ready'}
                </span>
                <span className="text-xs text-muted-foreground font-mono mt-1">
                  {breathingActive
                    ? breathingPhase === 'Inhale'
                      ? 'Deep breath in...'
                      : breathingPhase === 'Hold'
                      ? 'Hold breath...'
                      : 'Slow exhale...'
                    : 'Click Start below'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full">
              <Button
                onClick={() => setBreathingActive(!breathingActive)}
                className="flex-1 bg-brand text-primary-foreground font-semibold h-10 rounded-xl"
              >
                <span>{breathingActive ? 'Pause Exercise' : 'Start Exercise'}</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MOOD HISTORY LOG MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-foreground">Recent Sentiment & Emotional Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                No past analysis records saved yet. Run an analysis above!
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {history.map((entry) => (
                  <div key={entry.id} className="p-3.5 bg-background border border-border rounded-xl flex items-center justify-between text-xs space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-mono font-bold text-brand">{entry.timestamp}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getLevelBadgeClass(entry.risk)}`}>
                          {entry.risk} Risk
                        </span>
                      </div>
                      <p className="text-foreground/90 italic font-serif">"{entry.text}"</p>
                    </div>

                    <span className="px-3 py-1 rounded-lg bg-secondary text-foreground font-mono font-semibold">
                      {entry.sentiment}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Interactive PDF Report Modal Previewer */}
      {pdfModalOpen && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-card z-10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">MindPulse Psychological Assessment Report</h3>
                  <p className="text-xs text-muted-foreground">Generated PDF Report Preview</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={pdfPreviewUrl}
                  download="MindPulse_Analysis_Report.pdf"
                  className="px-3 py-1.5 rounded-xl bg-brand text-primary-foreground text-xs font-semibold hover:bg-brand/90 transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
                <a
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border text-xs font-medium transition-all flex items-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Tab</span>
                </a>
                <button
                  onClick={() => setPdfModalOpen(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900 relative">
              <object
                data={pdfPreviewUrl}
                type="application/pdf"
                className="w-full h-full border-none"
              >
                <embed
                  src={pdfPreviewUrl}
                  type="application/pdf"
                  className="w-full h-full border-none"
                />
                <iframe
                  src={pdfPreviewUrl}
                  title="MindPulse PDF Report"
                  className="w-full h-full border-none"
                />
              </object>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
