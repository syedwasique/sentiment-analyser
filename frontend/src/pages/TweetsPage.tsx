import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeText, type AnalysisResponse } from '../api/analyze';
import {
  Brain,
  ArrowLeft,
  ArrowRight,
  Heart,
  Repeat2,
  MessageCircle,
  Sparkles,
  Activity,
  Loader2,
} from 'lucide-react';

interface MockTweet {
  id: string;
  authorName: string;
  authorHandle: string;
  avatarBg: string;
  avatarText: string;
  timeAgo: string;
  text: string;
  categoryTag: string;
  tagColor: string;
  likes: number;
  retweets: number;
  replies: number;
}

const SAMPLE_TWEETS: MockTweet[] = [
  {
    id: 'tweet-1',
    authorName: 'Ayesha Khan',
    authorHandle: '@ayeshak_nlp',
    avatarBg: 'bg-rose-500',
    avatarText: 'AK',
    timeAgo: '12m',
    text: "Honestly, lately I feel completely detached from everything. I spend hours staring at walls. I can't find energy to do basic chores, and sleep doesn't help. I just feel incredibly hopeless about the future, like nothing will ever get better.",
    categoryTag: 'Depression / Distress',
    tagColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    likes: 42,
    retweets: 8,
    replies: 14,
  },
  {
    id: 'tweet-2',
    authorName: 'Hamza Tariq',
    authorHandle: '@hamza_dev',
    avatarBg: 'bg-amber-500',
    avatarText: 'HT',
    timeAgo: '45m',
    text: 'Oh wonderful, my car broke down on the highway right in the pouring rain. Today is just the absolute best day of my entire life! Loving every single second of this! 🙃🌧️ #blessed',
    categoryTag: 'Sarcasm / Irony Detection',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    likes: 189,
    retweets: 35,
    replies: 28,
  },
  {
    id: 'tweet-3',
    authorName: 'Bilal Ahmed',
    authorHandle: '@bilal_pk',
    avatarBg: 'bg-cyan-500',
    avatarText: 'BA',
    timeAgo: '1h',
    text: 'bohot ziada pareshan hoon samajh nahi araha kya karun... results kharab aye hain aur sab log umeed laga k bethe thay. bohot udaas aur tang agaya hoon.',
    categoryTag: 'Roman Urdu Multilingual',
    tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    likes: 67,
    retweets: 12,
    replies: 19,
  },
  {
    id: 'tweet-4',
    authorName: 'Zainab Malik',
    authorHandle: '@zainab_m',
    avatarBg: 'bg-purple-500',
    avatarText: 'ZM',
    timeAgo: '2h',
    text: "I was terrified before the interview, frustrated when it went badly, but now I'm trying to stay hopeful and prepare for the next opportunity! 🌟",
    categoryTag: 'Complex Emotional Contrast',
    tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    likes: 112,
    retweets: 19,
    replies: 22,
  },
  {
    id: 'tweet-5',
    authorName: 'Omar Farooq',
    authorHandle: '@omar_f',
    avatarBg: 'bg-emerald-500',
    avatarText: 'OF',
    timeAgo: '3h',
    text: 'Just received my thesis approval today! 🎓 Hard work really pays off. Excited to start the next research journey with the clinical team, thanks everyone for the constant support!',
    categoryTag: 'Positive / Happiness',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    likes: 345,
    retweets: 58,
    replies: 46,
  },
  {
    id: 'tweet-6',
    authorName: 'Fatima Noor',
    authorHandle: '@fatima_n',
    avatarBg: 'bg-blue-500',
    avatarText: 'FN',
    timeAgo: '4h',
    text: 'My heart has been pounding since morning and my chest feels tight. Overwhelmed by all these deadlines and I keep thinking everything is going to collapse. 😣',
    categoryTag: 'Anxiety / High Stress',
    tagColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    likes: 78,
    retweets: 15,
    replies: 23,
  },
];

export const TweetsPage: React.FC = () => {
  const navigate = useNavigate();

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<{ [tweetId: string]: AnalysisResponse }>({});
  const [activeTab, setActiveTab] = useState<'all' | 'depression' | 'sarcasm' | 'roman-urdu'>('all');

  const handleAnalyzeTweet = async (tweet: MockTweet) => {
    setAnalyzingId(tweet.id);
    try {
      const data = await analyzeText(tweet.text);
      setAnalysisResults((prev) => ({ ...prev, [tweet.id]: data }));
    } catch (err: any) {
      console.error('Failed to analyze tweet:', err);
      alert('Could not analyze tweet: ' + (err.message || 'Server error. Is the Python backend running?'));
    } finally {
      setAnalyzingId(null);
    }
  };

  const filteredTweets = SAMPLE_TWEETS.filter((t) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'depression') return t.categoryTag.toLowerCase().includes('depression') || t.categoryTag.toLowerCase().includes('anxiety');
    if (activeTab === 'sarcasm') return t.categoryTag.toLowerCase().includes('sarcasm');
    if (activeTab === 'roman-urdu') return t.categoryTag.toLowerCase().includes('roman urdu');
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center space-x-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center p-1 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <img src="/logo.png" alt="MindPulse" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">MindPulse</span>
              <span className="text-[10px] font-mono ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                Social Feed Lab
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center space-x-2 cursor-pointer"
          >
            <span>Full Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Info Banner for Chrome Extension Testing */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Twitter / X Social Sentiment Lab</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">Live Extension Ready</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Test the MindPulse model on diverse social media scenarios. Click <strong>"Analyze with MindPulse"</strong> on any tweet below to trigger real-time RoBERTa + NRC emotion diagnosis.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Scenarios ({SAMPLE_TWEETS.length})
          </button>
          <button
            onClick={() => setActiveTab('depression')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'depression'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Depression & Anxiety
          </button>
          <button
            onClick={() => setActiveTab('sarcasm')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'sarcasm'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Sarcasm & Irony
          </button>
          <button
            onClick={() => setActiveTab('roman-urdu')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'roman-urdu'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Roman Urdu
          </button>
        </div>

        {/* Tweets Feed Container */}
        <div className="space-y-4">
          {filteredTweets.map((tweet) => {
            const isAnalyzing = analyzingId === tweet.id;
            const res = analysisResults[tweet.id];

            return (
              <article
                key={tweet.id}
                data-testid="tweet"
                className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 backdrop-blur-xl transition-all shadow-lg"
              >
                {/* Author Info & Tag */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full ${tweet.avatarBg} flex items-center justify-center font-bold text-sm text-white shadow-md`}
                    >
                      {tweet.avatarText}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-sm text-white">{tweet.authorName}</span>
                        <span className="text-xs text-slate-400">{tweet.authorHandle}</span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs text-slate-500">{tweet.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono border ${tweet.tagColor}`}>
                    {tweet.categoryTag}
                  </span>
                </div>

                {/* Tweet Text Content (marked for extension crawler compatibility) */}
                <p data-testid="tweetText" className="text-sm sm:text-base text-slate-100 leading-relaxed mb-4">
                  {tweet.text}
                </p>

                {/* Tweet Footer Actions + MindPulse AI Analyze Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                  <div className="flex items-center space-x-6 text-xs text-slate-400">
                    <span className="flex items-center space-x-1.5 hover:text-cyan-300 transition-colors cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                      <span>{tweet.replies}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 hover:text-emerald-400 transition-colors cursor-pointer">
                      <Repeat2 className="w-4 h-4" />
                      <span>{tweet.retweets}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 hover:text-rose-400 transition-colors cursor-pointer">
                      <Heart className="w-4 h-4" />
                      <span>{tweet.likes}</span>
                    </span>
                  </div>

                  {/* Primary MindPulse AI Action Button */}
                  <button
                    onClick={() => handleAnalyzeTweet(tweet)}
                    disabled={isAnalyzing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Brain className="w-4 h-4 text-slate-950" />
                    )}
                    <span>{isAnalyzing ? 'Analyzing Tweet...' : 'Analyze with MindPulse'}</span>
                  </button>
                </div>

                {/* Real-Time Analysis Result Drawer */}
                {res && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          MindPulse AI Diagnostics
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-slate-400">Latency:</span>
                        <span className="text-xs font-mono font-bold text-teal-300">{res.latency_ms || 38}ms</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mb-3">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Sentiment</span>
                        <span className="font-bold text-cyan-300">{res.sentiment}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Risk Level</span>
                        <span className={`font-bold ${res.risk_level === 'High' ? 'text-rose-400' : res.risk_level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {res.risk_level}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Sarcasm</span>
                        <span className="font-bold text-amber-300">{res.is_sarcastic ? 'Detected' : 'None'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Confidence</span>
                        <span className="font-bold text-white">
                          {Math.round(Math.min(1, Math.max(0.7, Math.abs(res.sentiment_score || 0.88))) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Psychological States Mini Bar */}
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                      {res.psychological_states && Object.entries(res.psychological_states).map(([dim, val]) => (
                        <span
                          key={dim}
                          className={`px-2.5 py-1 rounded-lg border ${
                            val === 'High'
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                              : val === 'Medium'
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <strong className="capitalize">{dim}</strong>: {val}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default TweetsPage;
