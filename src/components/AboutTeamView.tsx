import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  Linkedin,
  Mail,
  Shield,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TEAM, EVENT, HIGHLIGHTS, TeamMember, HighlightItem } from '../config/about';
import { COLORS } from '../utils/colors';

interface AboutTeamViewProps {
  onBackToSteps: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((p) => p[0].toUpperCase()).slice(0, 3).join('');
}

export const AboutTeamView: React.FC<AboutTeamViewProps> = ({ onBackToSteps }) => {
  // Up to 4 member cards (array is cut at 4)
  const displayTeam = TEAM.slice(0, 4);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Back button */}
      <div>
        <button
          onClick={onBackToSteps}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center space-x-2 cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Loss Estimator Steps</span>
        </button>
      </div>

      {/* About this tool (3 sentences as requested) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 text-blue-600 dark:text-blue-400">
          <Shield className="w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            About this tool
          </h2>
        </div>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          When a wind park is offline, its own wind sensors are offline too, so the energy it could have produced is unknown. This tool rebuilds the 10-minute wind at each affected turbine from neighbouring parks that kept running, using a relation learned from data before the outage, and converts it to power with each turbine's power curve. It gives the lost energy in kWh with an honest 80 % range, and everything runs in your browser - no data is sent to any server.
        </p>
      </section>

      {/* Team Section */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold">The Team</h2>
        </div>

        {displayTeam.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-6">
            {displayTeam.map((member, idx) => (
              <div
                key={idx}
                className="w-full sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-3 transition-transform hover:-translate-y-0.5"
              >
                {/* Photo or Initials */}
                {member.photo && member.photo.trim() !== '' ? (
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-xs"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-xs tracking-wider"
                    style={{ backgroundColor: COLORS.navy }}
                  >
                    {getInitials(member.name)}
                  </div>
                )}

                {/* Name & Details */}
                <div className="space-y-1 w-full">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {member.name}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {member.role}
                  </p>
                  {member.affiliation && member.affiliation.trim() !== '' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {member.affiliation}
                    </p>
                  )}
                </div>

                {/* Optional Social Icons */}
                {(Boolean(member.linkedin && member.linkedin.trim() !== '') ||
                  Boolean(member.email && member.email.trim() !== '')) && (
                  <div className="flex items-center space-x-3 pt-2 text-slate-400 dark:text-slate-500">
                    {member.linkedin && member.linkedin.trim() !== '' && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="LinkedIn Profile"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {member.email && member.email.trim() !== '' && (
                      <a
                        href={`mailto:${member.email}`}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Event Details Section */}
      <section className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-700/60 space-y-3">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-4 h-4" />
          <span>Hackathon &amp; Challenge</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">{EVENT.name}</h3>
          <p className="text-sm font-semibold text-amber-300">
            Challenge: {EVENT.challenge}
          </p>
        </div>
        <div className="pt-2 flex items-center space-x-2 text-xs text-slate-300 font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{EVENT.date}</span>
        </div>
      </section>

      {/* Event Highlights Slider (ITEM 3) */}
      <HighlightsSlider />
    </div>
  );
};

/**
 * Highlights Slider Component
 * Auto-advances every 5s with soft slide/fade.
 * Pauses on hover and when tab is hidden.
 * Supports keyboard arrows, touch swipe, dots, left/right buttons.
 * Respects prefers-reduced-motion.
 * Lazy-loads images and gracefully skips broken images.
 * Hides completely if HIGHLIGHTS is empty or all images fail.
 */
function HighlightsSlider() {
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  // Filter valid highlights that haven't failed to load
  const validHighlights = useMemo(() => {
    return HIGHLIGHTS.filter((_, idx) => !failedIndices.has(idx));
  }, [failedIndices]);

  // Handle image error: mark index as failed and advance if needed
  const handleImageError = useCallback((indexInValid: number) => {
    const originalIndex = HIGHLIGHTS.findIndex(
      (h) => h.src === validHighlights[indexInValid]?.src
    );
    if (originalIndex !== -1) {
      setFailedIndices((prev) => new Set([...prev, originalIndex]));
    }
  }, [validHighlights]);

  // Adjust currentIndex if out of bounds
  useEffect(() => {
    if (validHighlights.length > 0 && currentIndex >= validHighlights.length) {
      setCurrentIndex(0);
    }
  }, [validHighlights.length, currentIndex]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-advance timer (5s)
  useEffect(() => {
    if (validHighlights.length <= 1) return;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
    }

    if (isHovered || isTabHidden) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validHighlights.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [validHighlights.length, isHovered, isTabHidden]);

  // Keyboard navigation
  useEffect(() => {
    if (validHighlights.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + validHighlights.length) % validHighlights.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % validHighlights.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [validHighlights.length]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsHovered(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsHovered(false);
    if (touchStartX.current === null || validHighlights.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 40) {
      // Swipe left -> next
      setCurrentIndex((prev) => (prev + 1) % validHighlights.length);
    } else if (diff < -40) {
      // Swipe right -> prev
      setCurrentIndex((prev) => (prev - 1 + validHighlights.length) % validHighlights.length);
    }
    touchStartX.current = null;
  };

  // If no highlights configured or all failed, hide the entire section (no empty box)
  if (!validHighlights || validHighlights.length === 0) {
    return null;
  }

  const currentItem = validHighlights[currentIndex] || validHighlights[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + validHighlights.length) % validHighlights.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % validHighlights.length);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>Highlights from the event</span>
        </h2>
        {validHighlights.length > 1 && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {currentIndex + 1} / {validHighlights.length}
          </span>
        )}
      </div>

      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 16:9 Image Frame */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentItem.src}
              src={currentItem.src}
              alt={currentItem.caption || 'Event Highlight'}
              loading="lazy"
              onError={() => handleImageError(currentIndex)}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Left Arrow Button */}
          {validHighlights.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer shadow-md"
              aria-label="Previous Highlight"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Right Arrow Button */}
          {validHighlights.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer shadow-md"
              aria-label="Next Highlight"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Caption Below */}
        {currentItem.caption && (
          <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 text-center mt-3 px-2 italic">
            {currentItem.caption}
          </p>
        )}

        {/* Navigation Dots */}
        {validHighlights.length > 1 && (
          <div className="flex items-center justify-center space-x-2 pt-3">
            {validHighlights.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setCurrentIndex(dotIdx)}
                className={`transition-all duration-200 cursor-pointer rounded-full ${
                  dotIdx === currentIndex
                    ? 'w-6 h-2 bg-blue-600 dark:bg-blue-400'
                    : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
