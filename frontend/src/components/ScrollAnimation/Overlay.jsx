import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Sparkles, MessageSquare, UserCheck, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Overlay.jsx - Minimal cinematic UI overlay on top of the scroll canvas.
 * Clean Apple-style presentation: Fully unobstructed view of the 3D scroll canvas.
 * The hero headline and action CTAs appear after the scroll in LandingSections.
 */
export const Overlay = ({ scrollProgress = 0, isLoading = false }) => {
  const navigate = useNavigate();
  const { currentUser, logout, continueAsGuest } = useAuth();
  const [avatarError, setAvatarError] = useState(false);

  // Scroll indicator fades out quickly as soon as scrolling begins
  const scrollIndicatorOpacity = Math.max(0, 1 - scrollProgress * 18);
  
  // Hero fades in towards the end of the scroll (e.g. from progress 0.85 to 1.0)
  const heroOpacity = Math.max(0, Math.min(1, (scrollProgress - 0.85) * 6.66));
  const heroTranslateY = (1 - heroOpacity) * 40;

  const getInitials = (name, email) => {
    if (name && name !== 'Guest Researcher') {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email && !email.includes('guest')) return email.slice(0, 2).toUpperCase();
    return 'G';
  };

  const handleGuestAccess = () => {
    continueAsGuest();
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
      {/* Top Navigation Bar (Always Interactive) */}
      <header className="pointer-events-auto w-full px-6 py-5 flex items-center justify-between transition-all duration-300 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-950/90 border border-cyan-400/40 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shadow-[0_0_25px_rgba(6,182,212,0.45)]">
            <img 
              src="/logo.png" 
              alt="MindPulse Logo" 
              className="w-full h-full object-contain scale-[1.7] drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]" 
            />
          </div>
          <div className="flex items-center">
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-white drop-shadow-lg">
              MindPulse
            </span>
            <span className="text-xs font-mono font-bold ml-3 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              v2.4 AI
            </span>
          </div>
        </div>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-white/70">
          <a 
            href="#hero-section" 
            className="hover:text-cyan-300 transition-colors drop-shadow"
          >
            Overview
          </a>
          <a 
            href="#features" 
            className="hover:text-cyan-300 transition-colors drop-shadow"
          >
            Capabilities
          </a>
          <a 
            href="#how-it-works" 
            className="hover:text-cyan-300 transition-colors drop-shadow"
          >
            Workflow
          </a>
        </nav>

        {/* Right Nav Actions (Auth & Guest State) */}
        <div className="flex items-center space-x-2.5">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-white text-xs sm:text-sm font-semibold hover:border-cyan-400 transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              >
                {currentUser.photoURL && !avatarError ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-5 h-5 rounded-full object-cover border border-cyan-400/40"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                    {getInitials(currentUser.displayName, currentUser.email)}
                  </div>
                )}
                <span className="max-w-[110px] truncate">
                  {currentUser.isGuest ? 'Guest User' : currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
              </button>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-red-950/60 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-300 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Try as Guest Button */}
              <button
                onClick={handleGuestAccess}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/30 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Guest Access</span>
              </button>

              <button
                onClick={() => navigate('/signin')}
                className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all active:scale-95 cursor-pointer"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Middle Space (Unobstructed Canvas View, then Hero Content fades in) */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div 
          className="w-full max-w-4xl transition-opacity duration-[50ms]"
          style={{ 
            opacity: heroOpacity,
            transform: `translateY(${heroTranslateY}px)`,
            pointerEvents: heroOpacity > 0.5 ? 'auto' : 'none'
          }}
        >
          <div className="relative p-8 sm:p-14 text-center">
            <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto">
              {/* Clinical Engine Badge */}
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-mono mb-6 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>HYBRID RoBERTa + NRC LEXICON PSYCHOLOGICAL ENGINE</span>
              </div>

              {/* Grand Hero Title */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-5">
                Decoding Human <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
                  Emotional Discourse
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl font-normal">
                Real-time mental health sentiment analysis, multi-dimensional psychological indicators, and context-aware sarcasm detection powered by transformer deep learning.
              </p>

              {/* Dual Aligned Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                {/* Button 1: Launch Dashboard */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 hover:from-cyan-400 hover:via-teal-300 hover:to-blue-500 text-slate-950 font-extrabold text-base sm:text-lg shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:shadow-[0_0_55px_rgba(6,182,212,0.85)] transition-all flex items-center space-x-3 active:scale-95 cursor-pointer group"
                >
                  <span>Launch Dashboard</span>
                  <ArrowRight className="w-5 h-5 text-slate-950 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Button 2: Explore Tweets */}
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-cyan-500/40 hover:border-cyan-400 text-white font-bold text-base sm:text-lg shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:shadow-[0_0_35px_rgba(6,182,212,0.4)] transition-all flex items-center space-x-3 active:scale-95 cursor-pointer group"
                >
                  <MessageSquare className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Explore Tweets</span>
                </a>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Vignette Gradient & Scroll Indicator */}
      <footer className="w-full pb-8 pt-12 flex flex-col items-center justify-center bg-gradient-to-t from-black/90 via-black/40 to-transparent">
        <div
          className="flex flex-col items-center space-y-2 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: isLoading ? 0 : scrollIndicatorOpacity }}
        >
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-cyan-300/80 drop-shadow">
            Scroll to Explore
          </span>
          <div className="w-8 h-8 rounded-full border border-cyan-400/30 flex items-center justify-center text-cyan-400 animate-bounce bg-cyan-950/40 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </footer>
    </div>
  );
};
