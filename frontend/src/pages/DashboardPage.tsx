import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
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
  AreaChart,
  Area,
} from 'recharts';
import {
  Zap,
  ArrowLeft,
  Check,
  Copy,
  RefreshCw,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
  Activity,
  Flame,
  FileText,
  Terminal,
  BarChart3,
  FileDown,
  Loader2,
  X,
  ExternalLink,
  Download,
  Sparkles,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  Wind,
  History,
  CheckSquare,
  Sun,
  Compass,
  Mic,
  MicOff,
  TrendingUp,
  LogOut,
  MessageSquare,
  Trash2,
  Play,
  Pause,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

const PSYCH_DIMENSIONS_INFO: Record<string, { title: string; subtitle: string; emoji: string; desc: Record<string, string>; tips: string }> = {
  depression: {
    title: 'Depression & Mood',
    subtitle: 'Evaluates low mood and hopelessness markers.',
    emoji: '😔',
    desc: {
      High: 'Severe low mood or emotional weight detected in phrasing.',
      Medium: 'Moderate depressive indicators present. Noticeable fatigue.',
      Low: 'Minimal to no depressive linguistic markers detected.',
    },
    tips: 'Journaling: Try writing down 3 small positive things that happened today. Grounding: Connect with a trusted friend, even just a simple text.',
  },
  anxiety: {
    title: 'Anxiety & Panic',
    subtitle: 'Evaluates dread, panic, and physical tension keywords.',
    emoji: '😰',
    desc: {
      High: 'High anxiety signals present (apprehension, dread, panic).',
      Medium: 'Moderate anxiety present. Noticeable worry about outcomes.',
      Low: 'Low anxiety signals. Text reflects a calm baseline state.',
    },
    tips: 'Breathwork: The 4-7-8 breathing exercise can quickly reset your nervous system. Grounding: Name 5 things you can see around you.',
  },
  stress: {
    title: 'Stress & Burnout',
    subtitle: 'Evaluates exhaustion and workload pressure.',
    emoji: '😓',
    desc: {
      High: 'Critical stress/burnout markers. Overwhelmed.',
      Medium: 'Elevated stress detected. Managing significant pressure.',
      Low: 'Optimal coping capacity. Normal stress levels.',
    },
    tips: 'Rest: Step away from screens for 15 minutes. Body Reset: Roll your shoulders back and unclench your jaw.',
  },
  anger: {
    title: 'Anger & Hostility',
    subtitle: 'Evaluates frustration, agitation, and outrage.',
    emoji: '😤',
    desc: {
      High: 'Strong frustration, outrage, or aggressive phrasing.',
      Medium: 'Mild to moderate irritation or annoyance expressed.',
      Low: 'No hostility or anger detected.',
    },
    tips: 'Body Reset: Try progressive muscle relaxation or brief intense exercise. Venting: Write down everything making you mad, then rip up the paper.',
  },
  happiness: {
    title: 'Happiness & Positivity',
    subtitle: 'Evaluates joy, gratitude, and emotional resilience.',
    emoji: '😊',
    desc: {
      High: 'Strong positive emotional state. Expresses joy or gratitude.',
      Medium: 'Mild positivity or pleasant sentiment detected.',
      Low: 'Low expression of positivity or satisfaction.',
    },
    tips: 'Mood-Lift: Listen to your favorite upbeat song or take a short walk outside.',
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
  const { currentUser, logout } = useAuth();
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
  const [breathingMethod, setBreathingMethod] = useState<'4-7-8' | 'box'>('4-7-8');
  const [breathingPhase, setBreathingPhase] = useState<string>('Ready');
  const [breathingActive, setBreathingActive] = useState<boolean>(false);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [affirmationIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('checklist');

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mindpulse_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  }, []);

  // Delete History Entry
  const handleDeleteHistory = (id: string) => {
    const newHistory = history.filter((entry) => entry.id !== id);
    setHistory(newHistory);
    localStorage.setItem('mindpulse_history', JSON.stringify(newHistory));
  };

  // CSV Export
  const exportHistoryToCSV = () => {
    if (history.length === 0) return;
    const headers = ['Date', 'Time', 'Text', 'Sentiment', 'Risk', 'Score'];
    const rows = history.map((entry) => [
      entry.date,
      entry.timestamp,
      `"${entry.text.replace(/"/g, '""')}"`,
      entry.sentiment,
      entry.risk,
      entry.score
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mindpulse_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Breathing Cycle Logic
  useEffect(() => {
    if (!breathingActive) {
      setBreathingPhase('Ready');
      return;
    }
    let timer: ReturnType<typeof setTimeout>;

    const run478 = () => {
      setBreathingPhase('Inhale (4s)');
      timer = setTimeout(() => {
        setBreathingPhase('Hold (7s)');
        timer = setTimeout(() => {
          setBreathingPhase('Exhale (8s)');
          timer = setTimeout(() => {
            setCycleCount(c => c + 1);
            if (breathingActive) run478();
          }, 8000);
        }, 7000);
      }, 4000);
    };

    const runBox = () => {
      setBreathingPhase('Inhale (4s)');
      timer = setTimeout(() => {
        setBreathingPhase('Hold (4s)');
        timer = setTimeout(() => {
          setBreathingPhase('Exhale (4s)');
          timer = setTimeout(() => {
            setBreathingPhase('Hold (4s)');
            timer = setTimeout(() => {
              setCycleCount(c => c + 1);
              if (breathingActive) runBox();
            }, 4000);
          }, 4000);
        }, 4000);
      }, 4000);
    };

    if (breathingMethod === '4-7-8') run478();
    else runBox();

    return () => clearTimeout(timer);
  }, [breathingActive, breathingMethod]);

  // Handle Speech Recognition Toggle
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
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
    setResult(null);
    setActiveTab('');

    try {
      const data = await analyzeText(textToSubmit);
      setResult(data);

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

  // Derived state for new features
  const levelToVal = (lvl: string) => (lvl === 'High' ? 90 : lvl === 'Medium' ? 55 : 20);
  
  const wellnessScore = useMemo(() => {
    if (!result) return 0;
    const states = result.psychological_states;
    const negAvg = (
      (100 - levelToVal(states.depression)) +
      (100 - levelToVal(states.anxiety)) +
      (100 - levelToVal(states.stress)) +
      (100 - levelToVal(states.anger))
    ) / 4;
    const hapVal = levelToVal(states.happiness);
    let score = (negAvg * 0.8) + (hapVal * 0.2); // Weighted avg
    
    if (result.sentiment === 'Positive') score += 10;
    if (result.sentiment === 'Negative') score -= 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [result]);

  const dominantState = useMemo(() => {
    if (!result) return null;
    
    // Always align the dominant state with the primary predicted class from the neural network
    const predicted = result.predicted_label;
    if (predicted === 'Anger/Hostility') return 'anger';
    if (predicted === 'Anxious/Stress') return 'anxiety'; // or 'stress' based on context, we'll default to anxiety
    if (predicted === 'Depressed/Sad') return 'depression';
    if (predicted === 'Happy/Positive') return 'happiness';

    // Fallback if neutral or unmapped
    let highestVal = -1;
    let dominant = 'happiness';
    Object.entries(result.psychological_states).forEach(([key, level]) => {
      const val = levelToVal(level);
      if (val > highestVal) {
        highestVal = val;
        dominant = key;
      }
    });
    return dominant;
  }, [result]);

  const autoSummary = useMemo(() => {
    if (!result) return null;
    const states = result.psychological_states;
    const highConcerns = Object.entries(states).filter(([k, v]) => k !== 'happiness' && v === 'High').map(e=>e[0]);
    const medConcerns = Object.entries(states).filter(([k, v]) => k !== 'happiness' && v === 'Medium').map(e=>e[0]);
    const primaryConcern = highConcerns[0] || medConcerns[0] || null;
    
    let paragraph = '';
    if (primaryConcern) {
      paragraph += `The primary emotional signal detected is elevated ${primaryConcern} ${PSYCH_DIMENSIONS_INFO[primaryConcern].emoji}. `;
    } else {
      paragraph += `No significant psychological distress markers were detected. `;
    }

    if (states.happiness === 'High' || states.happiness === 'Medium') {
      paragraph += `Your expression of positivity ${PSYCH_DIMENSIONS_INFO['happiness'].emoji} is a strong protective factor. `;
    } else if (primaryConcern) {
      paragraph += `This may be affecting your overall resilience and mood. `;
    }

    if (primaryConcern === 'anxiety' || primaryConcern === 'stress') {
      paragraph += `We recommend starting with a brief 4-7-8 breathwork cycle below to downregulate your nervous system.`;
    } else if (primaryConcern === 'depression') {
      paragraph += `Consider reaching out to a friend or trying a gentle grounding exercise in the toolkit below.`;
    } else if (primaryConcern === 'anger') {
      paragraph += `A physical reset or journaling your frustrations might help release some of this tension safely.`;
    } else {
      paragraph += `Keep up your current wellness maintenance routine to support your emotional health.`;
    }

    return paragraph;
  }, [result]);

  const toolkitTabs = useMemo(() => {
    if (!result) return [];
    const states = result.psychological_states;
    const tabs = [];
    if (['Medium', 'High'].includes(states.anxiety) || ['Medium', 'High'].includes(states.stress)) tabs.push({ id: 'breathwork', label: 'Breathwork', icon: Wind });
    if (['Medium', 'High'].includes(states.anxiety) || ['Medium', 'High'].includes(states.depression)) tabs.push({ id: 'grounding', label: 'Grounding', icon: Compass });
    if (['Medium', 'High'].includes(states.depression) || ['Medium', 'High'].includes(states.stress)) tabs.push({ id: 'journaling', label: 'Journaling', icon: BookOpen });
    if (['Medium', 'High'].includes(states.anger) || ['Medium', 'High'].includes(states.stress)) tabs.push({ id: 'body', label: 'Body Reset', icon: HeartPulse });
    if (['Low', 'Medium'].includes(states.happiness)) tabs.push({ id: 'mood', label: 'Mood Lift', icon: Sun });
    
    if (tabs.length === 0) {
      tabs.push({ id: 'maintenance', label: 'Wellness Maintenance', icon: CheckSquare });
    }
    return tabs;
  }, [result]);

  useEffect(() => {
    if (toolkitTabs.length > 0 && !activeTab) {
      setActiveTab(toolkitTabs[0].id);
    }
  }, [toolkitTabs, activeTab]);

  const getPsychologicalChartData = () => {
    if (!result) return [];
    return [
      { subject: 'Depression', value: levelToVal(result.psychological_states.depression) },
      { subject: 'Anxiety', value: levelToVal(result.psychological_states.anxiety) },
      { subject: 'Stress', value: levelToVal(result.psychological_states.stress) },
      { subject: 'Anger', value: levelToVal(result.psychological_states.anger) },
      { subject: 'Happiness', value: levelToVal(result.psychological_states.happiness) },
    ];
  };

  const formatPredictedClass = (label: string) => {
    if (label === 'Anger/Hostility') return 'Anger & Hostility';
    if (label === 'Anxious/Stress') return 'Anxiety & Panic';
    if (label === 'Depressed/Sad') return 'Depression & Mood';
    if (label === 'Happy/Positive') return 'Happiness & Positivity';
    return 'Neutral';
  };

  const getClassProbabilitiesData = () => {
    if (!result || !result.all_scores) return [];
    const scores = result.all_scores;
    return [
      { name: 'Anger', probability: Math.round((scores['Anger/Hostility'] || 0) * 100) },
      { name: 'Anxiety', probability: Math.round((scores['Anxious/Stress'] || 0) * 100) },
      { name: 'Depression', probability: Math.round((scores['Depressed/Sad'] || 0) * 100) },
      { name: 'Happiness', probability: Math.round((scores['Happy/Positive'] || 0) * 100) },
      { name: 'Stress', probability: Math.round((scores['Anxious/Stress'] || 0) * 100) },
      { name: 'Neutral', probability: Math.round((scores['Neutral'] || 0) * 100) },
    ];
  };

  const getActiveFlags = () => FLAG_DEFS.filter(f => result?.keyword_flags?.[f.key]);
  const getClearFlags = () => FLAG_DEFS.filter(f => !result?.keyword_flags?.[f.key]);
  
  const moodStats = useMemo(() => {
    let pos = 0, neu = 0, neg = 0;
    let totalScore = 0;
    history.forEach(h => {
      if (h.sentiment === 'Positive') pos++;
      else if (h.sentiment === 'Negative') neg++;
      else neu++;
      totalScore += h.score;
    });
    return {
      pos, neu, neg,
      avg: history.length ? Math.round(totalScore / history.length) : 0
    };
  }, [history]);


  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand/20">
      <svg width="0" height="0">
        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--brand))" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(var(--brand))" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
      </svg>

      {/* Console Top Bar */}
      <header className="h-14 bg-card border-b border-border px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center p-0 overflow-hidden shadow-md flex-shrink-0">
              <img src="/logo.png" alt="MindPulse Logo" className="w-full h-full object-contain scale-[1.7] drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-foreground">MindPulse Mental Health Hub</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button onClick={() => setShowAnalyticsModal(true)} className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold flex items-center space-x-1.5 transition-all">
            <TrendingUp className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Weekly Analytics</span>
          </button>
          <button onClick={() => { setBreathingActive(false); setCycleCount(0); setShowBreathingModal(true); }} className="px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand font-semibold flex items-center space-x-1.5 transition-all shadow-sm">
            <Wind className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guided Breathing</span>
          </button>
          <button onClick={() => setShowHistoryModal(true)} className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium flex items-center space-x-1.5 transition-all">
            <History className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Log ({history.length})</span>
          </button>
          <button onClick={() => navigate('/tweets')} className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-semibold flex items-center space-x-1.5 transition-all shadow-sm">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explore Tweets</span>
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          {currentUser && (
            <div className="flex items-center space-x-1.5">
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-secondary/80 border border-border text-xs">
                {currentUser.photoURL && <img src={currentUser.photoURL} alt="User" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover border border-brand/30" />}
                <div className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold">
                  {currentUser.isGuest ? 'G' : (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
                <span className="max-w-[80px] sm:max-w-[120px] truncate font-medium text-foreground">
                  {currentUser.isGuest ? 'Guest User' : currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
              </div>
              <button onClick={async () => { await logout(); navigate('/signin'); }} className="p-1.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors border border-transparent hover:border-red-500/20">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="bg-secondary/30 border-b border-border px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-2 font-mono">
          <span className="text-brand">MindPulse Engine</span><span>/</span>
          <span className="text-foreground font-semibold">Diagnostic Analytics Dashboard</span>
        </div>
        <div className="font-mono text-muted-foreground hidden md:block">
          Features: <code>Voice Journaling • 5-Dimension Psychological Assessment • Weekly Mood Analytics</code>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-brand" />
              <span>Input Text or Speak Aloud for Diagnostics</span>
            </label>
            <button onClick={toggleRecording} className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all border ${isRecording ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-md' : 'bg-brand/10 text-brand border-brand/30 hover:bg-brand/20'}`}>
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isRecording ? 'Listening... Stop Recording' : 'Voice Journaling (Mic)'}</span>
            </button>
          </div>
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type or click 'Voice Journaling' above to speak your thoughts aloud..." rows={4} className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-sans resize-none transition-all" />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono mr-1">Presets:</span>
              {PRESETS.map((preset, idx) => (
                <button key={idx} onClick={() => handlePresetSelect(preset.text)} className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground font-mono transition-colors">
                  + {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleRandomSample} className="text-xs text-brand hover:text-brand/80 font-mono transition-colors flex items-center gap-1" disabled={loading}>
                <RefreshCw className="w-3.5 h-3.5" /> Random Sample
              </button>
              <Button onClick={() => handleAnalyze()} disabled={loading || !inputText.trim()} variant="glow" className="h-9 px-5 text-xs font-semibold">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Analyzing...</span></> : <><Zap className="w-4 h-4" /><span>Run Full Analysis</span></>}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-200 text-red-700 text-sm flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div><strong className="block font-semibold mb-1">Backend Server Error</strong><span>{error}</span></div>
          </div>
        )}

        {/* Shimmer Loading Skeleton */}
        {loading && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] dark:via-white/5" />
            <div className="h-6 w-64 bg-secondary rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-secondary rounded-2xl" />
              <div className="h-64 bg-secondary rounded-2xl" />
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="bg-card border border-border rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[340px]">
            <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center overflow-hidden shadow-md mb-4">
              <img
                src="/mindpulse logo.png"
                alt="MindPulse Logo"
                className="w-full h-full object-contain scale-[1.7] drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]"
              />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Ready for Dual-Engine Analysis</h3>
            <p className="text-sm text-muted-foreground max-w-md">Enter custom text above or click **"Voice Journaling"** to speak your thoughts. The system will evaluate **Sentiment & Tone** alongside **Psychological & Emotional States**.</p>
          </div>
        )}

        {!loading && result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6">
            {/* Results Action Header Bar with Wellness Gauge */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                {/* Gauge SVG */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="stroke-secondary" strokeWidth="8" fill="none" />
                    <motion.circle cx="50" cy="50" r="40" stroke={wellnessScore >= 70 ? '#10b981' : wellnessScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="8" fill="none" strokeDasharray="251.2" initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 251.2 - (251.2 * wellnessScore) / 100 }} transition={{ duration: 1.5, ease: "easeOut" }} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{wellnessScore}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Overall Wellness Score
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${wellnessScore >= 70 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : wellnessScore >= 40 ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-red-500/10 text-red-600 border-red-200'}`}>
                      {wellnessScore >= 70 ? 'Optimal' : wellnessScore >= 40 ? 'Moderate' : 'Needs Care'}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-[200px] italic">"{result.text}"</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button onClick={handleDownloadPdf} disabled={pdfDownloading} className="bg-brand text-primary-foreground hover:bg-brand/90 font-semibold text-xs h-9 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-sm">
                  {pdfDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  <span>{pdfDownloading ? 'Generating PDF...' : 'Export PDF'}</span>
                </Button>
              </div>
            </div>

            {/* Auto-Generated Summary Card */}
            <div className="bg-gradient-to-br from-brand/10 via-background to-secondary/30 border border-brand/20 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-brand" /> Auto-Generated Summary
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed font-serif">
                {autoSummary}
              </p>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* COLUMN 1: SENTIMENT ANALYSIS */}
              <div className="space-y-5">
                <div className="bg-card border-b-2 border-brand/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center"><Smile className="w-5 h-5" /></div>
                    <div><h3 className="text-base font-bold text-foreground">1. Sentiment Analysis</h3><p className="text-xs text-muted-foreground">Tone & emotional polarity</p></div>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Sentiment Engine</span>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Primary Sentiment</span>
                    <span className="text-xs font-mono text-brand font-bold">{Math.round(result.sentiment_score * 100)}% Confidence</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${result.sentiment === 'Positive' ? 'bg-emerald-500/10 border border-emerald-200 text-emerald-600' : result.sentiment === 'Negative' ? 'bg-red-500/10 border border-red-200 text-red-600' : 'bg-secondary border border-border text-foreground'}`}>
                      {result.sentiment === 'Positive' ? <Smile className="w-8 h-8" /> : result.sentiment === 'Negative' ? <Frown className="w-8 h-8" /> : <Meh className="w-8 h-8" />}
                    </div>
                    <div>
                      <span className="text-2xl font-black text-foreground tracking-tight block">{result.sentiment}</span>
                      <span className="text-xs font-mono text-muted-foreground block mt-0.5">Predicted Class: <strong className="text-brand">{formatPredictedClass(result.predicted_label)}</strong></span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center space-x-2"><Zap className="w-4 h-4 text-brand" /><span className="text-xs font-semibold text-foreground">Sarcasm & Irony:</span></div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${result.is_sarcastic ? 'bg-purple-500/10 text-purple-700 border-purple-200' : 'bg-emerald-500/10 text-emerald-700 border-emerald-200'}`}>
                      {result.is_sarcastic ? '⚡ Detected' : '✓ Literal'}
                    </span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2"><BarChart3 className="w-4 h-4 text-brand" /><span>Probabilities</span></h4>
                  </div>
                  <div className="h-44 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getClassProbabilitiesData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip cursor={{fill: 'hsl(var(--secondary))'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }} />
                        <Bar dataKey="probability" radius={[6, 6, 0, 0]} animationDuration={1500}>
                          {getClassProbabilitiesData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name.includes('Happy') ? 'url(#emeraldGradient)' : entry.name.includes('Anxiety') ? 'url(#amberGradient)' : entry.name.includes('Depression') || entry.name.includes('Anger') || entry.name.includes('Stress') ? 'url(#redGradient)' : 'url(#brandGradient)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Grouped Linguistic Risk Signals */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Flame className="w-4 h-4 text-amber-500" /> Linguistic Risk Signals</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-red-600 block mb-2 flex items-center gap-1">🔴 Active Signals Detected</span>
                      <div className="flex flex-wrap gap-2">
                        {getActiveFlags().length > 0 ? getActiveFlags().map(({ key, label, icon }) => (
                          <span key={key} className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-red-500/10 text-red-700 border border-red-200">
                            {icon} {label}
                          </span>
                        )) : <span className="text-xs text-muted-foreground italic">No active risk signals.</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-emerald-600 block mb-2 flex items-center gap-1">🟢 Clear / Not Detected</span>
                      <div className="flex flex-wrap gap-2">
                        {getClearFlags().map(({ key, label, icon }) => (
                          <span key={key} className="px-3 py-1 rounded-lg text-xs font-mono font-medium bg-secondary text-muted-foreground border border-border opacity-60">
                            {icon} {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: PSYCHOLOGICAL ANALYSIS */}
              <div className="space-y-5">
                <div className="bg-card border-b-2 border-brand/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center"><HeartPulse className="w-5 h-5" /></div>
                    <div><h3 className="text-base font-bold text-foreground">2. Psychological Analysis</h3><p className="text-xs text-muted-foreground">5 Clinical mental health dimensions</p></div>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-brand/10 text-brand border border-brand/20">Psychological Profile</span>
                </div>

                {/* Enriched Psychological Dimension Cards */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3.5">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Dimension Intensity</span>
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(result.psychological_states).map(([stateKey, level]) => {
                      const info = PSYCH_DIMENSIONS_INFO[stateKey];
                      
                      // Fix: Map stateKey to the raw probabilities for accurate graph sizing
                      let rawScore = 0;
                      if (result.all_scores) {
                        if (stateKey === 'anger') rawScore = result.all_scores['Anger/Hostility'] || 0;
                        else if (stateKey === 'anxiety' || stateKey === 'stress') rawScore = result.all_scores['Anxious/Stress'] || 0;
                        else if (stateKey === 'depression') rawScore = result.all_scores['Depressed/Sad'] || 0;
                        else if (stateKey === 'happiness') rawScore = result.all_scores['Happy/Positive'] || 0;
                      }
                      
                      const isDominant = stateKey === dominantState;
                      const intensityPct = Math.max(levelToVal(level), Math.round(rawScore * 100));
                      
                      let description = info.desc[level] || info.desc['Low'];
                      if (isDominant && level === 'Low') {
                         description = "Small signs of this emotional pattern were detected as the primary linguistic signal, though overall intensity is relatively low.";
                      } else if (level === 'Low' && rawScore >= 0.20) {
                         description = `Mild underlying signs detected, though not elevated enough to be a primary concern.`;
                      }

                      return (
                        <div key={stateKey} className={`bg-background border rounded-xl p-4 space-y-3 relative overflow-hidden transition-all ${isDominant ? 'border-brand shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.01]' : 'border-border'}`}>
                          {isDominant && <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />}
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{info.emoji}</span>
                              <div>
                                <span className="font-bold text-sm text-foreground flex items-center gap-2">
                                  {info.title}
                                  {isDominant && <span className="text-[9px] uppercase tracking-wider bg-brand text-primary-foreground px-1.5 py-0.5 rounded-sm">Dominant</span>}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getLevelBadgeClass(level)}`}>{level}</span>
                          </div>
                          
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden relative z-10">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${intensityPct}%` }} transition={{ duration: 1, ease: 'easeOut' }} className={`h-full rounded-full ${level === 'High' ? 'bg-red-500' : level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed relative z-10">{description}</p>
                          {(level === 'High' || level === 'Medium') && stateKey !== 'happiness' && (
                            <div className="mt-2 p-2 rounded-lg bg-secondary/50 border border-border text-xs relative z-10">
                              <span className="font-semibold text-brand block mb-1">💡 Suggested Tool:</span>
                              <span className="text-muted-foreground">{info.tips}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2"><Activity className="w-4 h-4 text-brand" /><span>Intensity Radar</span></h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getPsychologicalChartData()}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--border))" />
                        <Radar name="Intensity" dataKey="value" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.35} animationDuration={1500} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* CONDITIONAL THERAPY TOOLKIT */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center"><Compass className="w-5 h-5" /></div>
                  <div><h3 className="text-base font-bold text-foreground">Dynamic Therapy Toolkit</h3><p className="text-xs text-muted-foreground">Tailored strategies based on your results</p></div>
                </div>
                <button onClick={() => { setBreathingActive(false); setCycleCount(0); setShowBreathingModal(true); }} className="px-3.5 py-1.5 rounded-xl bg-brand text-primary-foreground text-xs font-semibold hover:bg-brand/90 transition-all flex items-center space-x-1.5 shadow-sm">
                  <Wind className="w-4 h-4" /><span>Start Breathing</span>
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Tabs */}
                <div className="flex md:flex-col gap-2 overflow-x-auto md:w-48 shrink-0">
                  {toolkitTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-brand text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                  ))}
                </div>
                {/* Tab Content */}
                <div className="flex-1 bg-background border border-border rounded-xl p-5 min-h-[200px]">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                      {activeTab === 'breathwork' && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-brand flex items-center gap-2"><Wind className="w-4 h-4"/> Breathwork Focus</h4>
                          <p className="text-sm text-muted-foreground">Elevated anxiety and stress respond well to physiological resets. Try a structured breathing technique.</p>
                          <Button variant="outline" onClick={() => { setBreathingActive(false); setCycleCount(0); setShowBreathingModal(true); }} className="mt-2 text-xs h-8">Open Breathing Visualizer</Button>
                        </div>
                      )}
                      {activeTab === 'grounding' && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-brand flex items-center gap-2"><Compass className="w-4 h-4"/> 5-4-3-2-1 Grounding</h4>
                          <p className="text-sm text-muted-foreground">When thoughts race or mood drops, bring your focus to the physical world:</p>
                          <ul className="text-xs space-y-2 text-foreground ml-4 list-disc marker:text-brand">
                            <li>Acknowledge 5 things you see around you.</li>
                            <li>Acknowledge 4 things you can physically feel.</li>
                            <li>Acknowledge 3 things you can hear.</li>
                            <li>Acknowledge 2 things you can smell.</li>
                            <li>Acknowledge 1 thing you can taste.</li>
                          </ul>
                        </div>
                      )}
                      {activeTab === 'journaling' && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-brand flex items-center gap-2"><BookOpen className="w-4 h-4"/> Cognitive Restructuring</h4>
                          <p className="text-sm text-muted-foreground">To process feelings of being overwhelmed or depressed, try answering these prompts:</p>
                          <div className="bg-secondary/50 p-3 rounded-lg text-xs italic space-y-2 text-foreground/80">
                            <p>1. What is the evidence that my negative thought is 100% true?</p>
                            <p>2. What is a more balanced way to look at this situation?</p>
                            <p>3. If a friend were in my shoes, what would I tell them?</p>
                          </div>
                        </div>
                      )}
                      {activeTab === 'body' && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-brand flex items-center gap-2"><HeartPulse className="w-4 h-4"/> Somatic Release</h4>
                          <p className="text-sm text-muted-foreground">Anger and stress get trapped in muscles. Let's release the kinetic energy.</p>
                          <ul className="text-xs space-y-2 text-foreground ml-4 list-disc marker:text-brand">
                            <li>Progressive Muscle Relaxation (tense and release muscle groups from toes to head).</li>
                            <li>Take a brisk 10-minute walk.</li>
                            <li>Wash your face with cold water to trigger the mammalian dive reflex.</li>
                          </ul>
                        </div>
                      )}
                      {activeTab === 'mood' && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-brand flex items-center gap-2"><Sun className="w-4 h-4"/> Behavioral Activation</h4>
                          <p className="text-sm text-muted-foreground">When happiness is low, action precedes motivation. Do one small thing.</p>
                          <ul className="text-xs space-y-2 text-foreground ml-4 list-disc marker:text-brand">
                            <li>Listen to an upbeat playlist.</li>
                            <li>Text a friend a funny meme.</li>
                            <li>Tidy one small surface (like a desk) for 5 minutes.</li>
                          </ul>
                        </div>
                      )}
                      {activeTab === 'maintenance' && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-brand flex items-center gap-2"><CheckSquare className="w-4 h-4"/> Baseline Maintenance</h4>
                          <p className="text-sm text-muted-foreground">Your emotional state looks optimal. Keep up the good work!</p>
                          <div className="bg-secondary p-3 rounded-lg text-xs text-foreground mt-2">
                            <strong className="block mb-1 text-emerald-600">Daily Reminder:</strong>
                            "{AFFIRMATIONS[affirmationIdx]}"
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* JSON Toggle */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <button onClick={() => setShowJson(!showJson)} className="w-full flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                <div className="flex items-center space-x-2"><FileText className="w-4 h-4 text-brand" /><span>Inspect Raw API Response</span></div>
                <div className="flex items-center space-x-2">{showJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
              </button>
              {showJson && (
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex justify-end"><button onClick={handleCopyJson} className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground font-mono transition-colors flex items-center space-x-1.5">{copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}<span>{copied ? 'Copied!' : 'Copy JSON'}</span></button></div>
                  <pre className="p-4 rounded-xl bg-secondary/80 border border-border font-mono text-xs text-foreground overflow-x-auto max-h-80">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>


      {/* WEEKLY MOOD ANALYTICS MODAL */}
      <AnimatePresence>
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold"><TrendingUp className="w-5 h-5" /></div>
                <div><h3 className="font-bold text-base text-foreground">Weekly Mood Analytics</h3><p className="text-xs text-muted-foreground">Tracking your sentiment scores</p></div>
              </div>
              <button onClick={() => setShowAnalyticsModal(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            {history.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono space-y-2"><Activity className="w-8 h-8 text-brand mx-auto mb-2 opacity-50" /><p className="font-bold text-foreground">No entries yet</p></div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><span className="text-2xl font-bold text-emerald-600">{moodStats.pos}</span><span className="text-[10px] uppercase font-bold text-emerald-600">Positive</span></div>
                    <div className="flex flex-col items-center p-3 bg-secondary rounded-xl border border-border"><span className="text-2xl font-bold text-foreground">{moodStats.neu}</span><span className="text-[10px] uppercase font-bold text-muted-foreground">Neutral</span></div>
                    <div className="flex flex-col items-center p-3 bg-red-500/10 rounded-xl border border-red-500/20"><span className="text-2xl font-bold text-red-600">{moodStats.neg}</span><span className="text-[10px] uppercase font-bold text-red-600">Negative</span></div>
                    <div className="flex flex-col items-center p-3 bg-brand/10 rounded-xl border border-brand/20 ml-4"><span className="text-2xl font-bold text-brand">{moodStats.avg}%</span><span className="text-[10px] uppercase font-bold text-brand">Avg Score</span></div>
                  </div>
                  <Button onClick={exportHistoryToCSV} variant="outline" className="text-xs h-9 font-semibold gap-2"><Download className="w-4 h-4"/> Export CSV</Button>
                </div>

                {history.length > 1 && (
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history.slice().reverse()} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="score" stroke="hsl(var(--brand))" fill="url(#brandGradient)" strokeWidth={3} animationDuration={1500} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* GUIDED BREATHING MODAL */}
      <AnimatePresence>
      {showBreathingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="w-full flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center space-x-2 text-brand"><Wind className="w-5 h-5" /><h3 className="font-bold text-base text-foreground">Guided Breathing</h3></div>
              <button onClick={() => { setBreathingActive(false); setShowBreathingModal(false); }} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex items-center gap-2 bg-secondary p-1 rounded-xl w-full max-w-[200px] mx-auto">
              <button onClick={() => {setBreathingMethod('4-7-8'); setBreathingActive(false);}} className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all ${breathingMethod === '4-7-8' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>4-7-8</button>
              <button onClick={() => {setBreathingMethod('box'); setBreathingActive(false);}} className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all ${breathingMethod === 'box' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>Box</button>
            </div>

            <p className="text-xs text-muted-foreground">
              {breathingMethod === '4-7-8' ? 'Inhale 4s, Hold 7s, Exhale 8s to soothe nervous system.' : 'Inhale 4s, Hold 4s, Exhale 4s, Hold 4s for focus.'}
            </p>

            <div className="relative w-48 h-48 flex items-center justify-center my-2">
              <motion.div
                animate={{
                  scale: breathingActive ? (breathingPhase.includes('Inhale') ? 1.45 : breathingPhase.includes('Hold') ? 1.45 : 1) : 1,
                  opacity: breathingActive ? (breathingPhase.includes('Hold') ? 0.9 : 0.6) : 0.5,
                }}
                transition={{ duration: breathingPhase.includes('Inhale') ? 4 : breathingPhase.includes('Exhale') ? (breathingMethod === '4-7-8' ? 8 : 4) : (breathingMethod === '4-7-8' ? 7 : 4), ease: 'easeInOut' }}
                className={`absolute inset-0 rounded-full border-2 ${breathingMethod === '4-7-8' ? 'bg-brand/20 border-brand' : 'bg-emerald-500/20 border-emerald-500'} ${breathingMethod === 'box' && 'rounded-[30%]'}`}
              />
              <div className="z-10 flex flex-col items-center">
                <span className="text-lg font-extrabold text-foreground tracking-wide uppercase">{breathingActive ? breathingPhase.split(' ')[0] : 'Ready'}</span>
                <span className="text-[10px] text-muted-foreground font-mono mt-1">{breathingActive ? breathingPhase.split(' ')[1] : 'Click Start'}</span>
              </div>
            </div>

            <div className="flex flex-col items-center w-full gap-3">
              <div className="text-xs font-mono font-semibold text-muted-foreground">Cycles Completed: <span className="text-brand text-sm">{cycleCount}</span></div>
              <Button onClick={() => setBreathingActive(!breathingActive)} className={`w-full font-semibold h-10 rounded-xl ${breathingActive ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20' : 'bg-brand text-primary-foreground'}`}>
                {breathingActive ? <Pause className="w-4 h-4 mr-2"/> : <Play className="w-4 h-4 mr-2"/>}
                <span>{breathingActive ? 'Pause' : 'Start'} Exercise</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* MOOD HISTORY LOG MODAL */}
      <AnimatePresence>
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2"><History className="w-5 h-5 text-brand" /><h3 className="font-bold text-base text-foreground">Sentiment & Emotional Log</h3></div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-mono">No past records saved.</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {history.map((entry) => (
                  <div key={entry.id} className="p-3.5 bg-background border border-border rounded-xl flex items-center justify-between text-xs space-x-3 group transition-all hover:border-brand/50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-mono font-bold text-brand">{entry.date} {entry.timestamp}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getLevelBadgeClass(entry.risk)}`}>{entry.risk} Risk</span>
                      </div>
                      <p className="text-foreground/90 italic font-serif">"{entry.text}"</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-secondary text-foreground font-mono font-semibold">{entry.sentiment}</span>
                      <button onClick={() => handleDeleteHistory(entry.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20" title="Delete Entry"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Interactive PDF Report Modal Previewer */}
      <AnimatePresence>
      {pdfModalOpen && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-card z-10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold"><FileText className="w-4 h-4" /></div>
                <div><h3 className="text-sm font-bold text-foreground">MindPulse Report</h3><p className="text-xs text-muted-foreground">Generated PDF Preview</p></div>
              </div>
              <div className="flex items-center space-x-2">
                <a href={pdfPreviewUrl} download="MindPulse_Analysis_Report.pdf" className="px-3 py-1.5 rounded-xl bg-brand text-primary-foreground text-xs font-semibold hover:bg-brand/90 transition-all flex items-center space-x-1.5 shadow-sm"><Download className="w-3.5 h-3.5" /><span>Download</span></a>
                <a href={pdfPreviewUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border text-xs font-medium transition-all flex items-center space-x-1.5"><ExternalLink className="w-3.5 h-3.5" /><span>Open Tab</span></a>
                <button onClick={() => setPdfModalOpen(false)} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 bg-slate-900 relative">
              <object data={pdfPreviewUrl} type="application/pdf" className="w-full h-full border-none">
                <embed src={pdfPreviewUrl} type="application/pdf" className="w-full h-full border-none" />
                <iframe src={pdfPreviewUrl} title="MindPulse PDF Report" className="w-full h-full border-none" />
              </object>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};
