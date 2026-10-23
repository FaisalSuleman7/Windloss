import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface WelcomeTourModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({
  isOpen,
  onStartTour,
  onSkip,
}) => {
  // Esc key skips/closes the card
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSkip]);

  if (!isOpen) return null;

  return (
    // Light dimmed background without blur, centering a small card
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSkip();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
            Welcome to the Wind Outage Loss Estimator
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Take a 1-minute tour of the 9 steps?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={onStartTour}
            className="w-full sm:flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Start tour
          </button>
          <button
            onClick={onSkip}
            className="w-full sm:w-auto py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};
