import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { analyzeText, type AnalysisResponse } from '../api/analyze';
import { Button } from '@/components/ui/button';

// Sample Presets for Quick Testing
const PRESETS = [
  {
    label: 'Anxiety & Stress',
    text: 'I am so overwhelmed by work and upcoming deadlines. I feel constant dread in my chest and cannot sleep at night.',
    category: 'anxiety',
  },
  {
    label: 'Depression Indicator',
    text: 'Everything feels completely pointless and heavy. I have zero energy to even get out of bed or talk to anyone.',
    category: 'depression',
  },
  {
    label: 'Sarcastic Post',
    text: 'Oh, absolutely brilliant! Another server crash right before my final presentation. Just wonderful quality service.',
    category: 'sarcasm',
  },
  {
    label: 'Roman Urdu',
    text: 'Aaj kal bohot udaas aur pareshan rehta hun. Kuch bhi accha nahi lag raha, boht ziada tension hai.',
    category: 'roman_urdu',
  },
  {
    label: 'Happy Achievement',
    text: 'Just passed my final thesis defense with top honors! So grateful and excited for the future!',
    category: 'happy',
  },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'probabilities' | 'features' | 'json'>('diagnostics');
  const [copied, setCopied] = useState<boolean>(false);

  const handleAnalyze = async (overrideText?: string) => {
    const textToSubmit = overrideText !== undefined ? overrideText : inputText;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeText(textToSubmit);
      setResult(data);
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

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper colors for psychological indicators
  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'High':
        return 'bg-red-500/10 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
    }
  };

  // Prepare Chart Data
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
      {/* Top Console Header */}
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
            <span className="font-bold text-sm tracking-tight text-foreground">MindPulse Diagnostics Console</span>
          </div>
        </div>

        {/* Project Selector & Status */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded bg-secondary border border-border text-muted-foreground font-mono">
            <FolderTree className="w-3.5 h-3.5 text-brand" />
            <span>mindpulse-ai-prod</span>
          </div>
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">API v2.4 Active</span>
          </div>
        </div>
      </header>

      {/* Breadcrumb Subnav */}
      <div className="bg-secondary/40 border-b border-border px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-2 font-mono">
          <span className="text-brand">Vertex AI</span>
          <span>/</span>
          <span>Natural Language</span>
          <span>/</span>
          <span className="text-foreground">Psychological Diagnostics Console</span>
        </div>
        <div className="font-mono text-muted-foreground hidden md:block">
          Model: <code>twitter-roberta-base-sentiment</code>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-brand" />
                <span>Text Analysis Input</span>
              </label>
              <span className="text-xs font-mono text-muted-foreground">{inputText.length} chars</span>
            </div>

            {/* Input Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste social media post, journal entry, or text here (Supports English & Roman Urdu)..."
              rows={6}
              className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-sans resize-none transition-all"
            />

            {/* Presets */}
            <div className="mt-4">
              <span className="text-xs text-muted-foreground font-mono mb-2 block">Quick Sample Presets:</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetSelect(preset.text)}
                    className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground font-mono transition-colors text-left"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Button */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setInputText('')}
                className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
                disabled={loading || !inputText}
              >
                Clear Input
              </button>
              <Button
                onClick={() => handleAnalyze()}
                disabled={loading || !inputText.trim()}
                variant="glow"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Model...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Analyze Text</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Output Dashboard & Tabs */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-200 text-red-700 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-1">Backend Communication Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Loading Skeleton State */}
          {loading && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm animate-pulse space-y-6">
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 bg-secondary rounded-lg" />
                <div className="h-6 w-24 bg-secondary rounded-full" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-secondary rounded-xl" />
                ))}
              </div>
              <div className="h-48 bg-secondary rounded-xl" />
            </div>
          )}

          {/* Empty State */}
          {!loading && !result && !error && (
            <div className="bg-card border border-border rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[380px]">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Awaiting Input Text</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Enter text on the left or select a sample preset to trigger RoBERTa + NRC emotion analysis.
              </p>
            </div>
          )}

          {/* Results Workspace */}
          {!loading && result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Psychological Risk Alert Callout (Calm & Informative) */}
              {(result.risk_level === 'High' || result.risk_level === 'Medium' || result.flagged) && (
                <div
                  className={`p-4 rounded-xl border flex items-start space-x-3.5 shadow-sm ${
                    result.risk_level === 'High'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-sky-50 border-sky-200 text-sky-900'
                  }`}
                >
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                  <div className="text-xs sm:text-sm leading-relaxed">
                    <strong className="font-semibold block mb-0.5">
                      Elevated Risk Indicators Detected ({result.risk_level} Risk Level)
                    </strong>
                    <span>
                      The multi-signal pipeline identified elevated psychological stress/depression indicators in this post. If you or someone you know is experiencing distress, free confidential support is available via national crisis lines (e.g. 988).
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Tabs Header */}
              <div className="bg-card border border-border rounded-2xl p-1.5 flex items-center space-x-1 font-mono text-xs shadow-sm">
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                    activeTab === 'diagnostics'
                      ? 'bg-brand text-primary-foreground font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Diagnostics</span>
                </button>
                <button
                  onClick={() => setActiveTab('probabilities')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                    activeTab === 'probabilities'
                      ? 'bg-brand text-primary-foreground font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Probabilities</span>
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                    activeTab === 'features'
                      ? 'bg-brand text-primary-foreground font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Sarcasm & Features</span>
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                    activeTab === 'json'
                      ? 'bg-brand text-primary-foreground font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>JSON Payload</span>
                </button>
              </div>

              {/* TAB 1: Sentiment & Diagnostics */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-4">
                  {/* Top Sentiment Summary Card */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          result.sentiment === 'Positive'
                            ? 'bg-emerald-500/10 border border-emerald-200 text-emerald-600'
                            : result.sentiment === 'Negative'
                            ? 'bg-red-500/10 border border-red-200 text-red-600'
                            : 'bg-secondary border border-border text-foreground'
                        }`}
                      >
                        {result.sentiment === 'Positive' ? (
                          <Smile className="w-6 h-6" />
                        ) : result.sentiment === 'Negative' ? (
                          <Frown className="w-6 h-6" />
                        ) : (
                          <Meh className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">
                          Overall Sentiment
                        </span>
                        <span className="text-xl font-bold text-foreground tracking-tight">
                          {result.sentiment}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="text-xs font-mono text-muted-foreground block">Confidence Score</span>
                        <span className="text-lg font-bold font-mono text-brand">
                          {Math.round(result.sentiment_score * 100)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-muted-foreground block">Risk Evaluation</span>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold border ${getLevelBadgeClass(
                            result.risk_level
                          )}`}
                        >
                          {result.risk_level} Risk
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5 Psychological State Indicators */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Object.entries(result.psychological_states).map(([stateKey, level]) => (
                      <div
                        key={stateKey}
                        className="bg-card border border-border rounded-xl p-3.5 text-center flex flex-col justify-between"
                      >
                        <span className="text-xs font-mono capitalize text-muted-foreground">{stateKey}</span>
                        <span
                          className={`mt-2 py-1 px-2 rounded-lg text-xs font-mono font-bold border ${getLevelBadgeClass(
                            level
                          )}`}
                        >
                          {level}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Radar Diagnostic Graph */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <h4 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-brand" />
                      <span>Psychological Dimension Profile (5-Axis)</span>
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={getPsychologicalChartData()}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
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
                </div>
              )}

              {/* TAB 2: Class Probabilities */}
              {activeTab === 'probabilities' && (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                  <h4 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-brand" />
                    <span>RoBERTa Model Class Distribution</span>
                  </h4>

                  <div className="space-y-4">
                    {Object.entries(result.all_scores).map(([className, score]) => {
                      const pct = Math.round(score * 100);
                      return (
                        <div key={className} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-foreground">{className}</span>
                            <span className="text-brand font-bold">{pct}%</span>
                          </div>
                          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden border border-border">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full bg-brand rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-56 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getClassProbabilitiesData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
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
              )}

              {/* TAB 3: Sarcasm & Features */}
              {activeTab === 'features' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-brand" />
                      <h4 className="text-sm font-bold text-foreground">Sarcasm & Irony Detector</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Powered by <code>cardiffnlp/twitter-roberta-base-irony</code> to identify sarcastic distortion.
                    </p>
                    <div className="pt-2">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                          result.is_sarcastic
                            ? 'bg-purple-500/10 text-purple-700 border-purple-200'
                            : 'bg-secondary text-muted-foreground border-border'
                        }`}
                      >
                        {result.is_sarcastic ? '⚡ Sarcasm / Irony Flagged' : '✓ Plain Expression (No Sarcasm)'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center space-x-3">
                      <Flame className="w-5 h-5 text-amber-500" />
                      <h4 className="text-sm font-bold text-foreground">Lexicon & Multilingual Signals</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Evaluates 10 NRC emotion terms + Roman Urdu emotion lexicon matches.
                    </p>
                    <div className="pt-2">
                      <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-secondary text-foreground border border-border">
                        Predicted Base Label: {result.predicted_label}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: JSON Payload */}
              {activeTab === 'json' && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">Raw Flask API Response</span>
                    <button
                      onClick={handleCopyJson}
                      className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground font-mono transition-colors flex items-center space-x-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-secondary/80 border border-border font-mono text-xs text-foreground overflow-x-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
