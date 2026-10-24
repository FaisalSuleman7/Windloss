import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles, Database } from 'lucide-react';

export interface TourStep {
  sidebarStep: number;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    sidebarStep: 1,
    title: '1. Start',
    description:
      'Drop all turbine files (the offline park and its neighbours) plus the power curves of the offline turbines. CSV or Excel; names like T1_data.csv. Or try the BayWa demo.',
  },
  {
    sidebarStep: 2,
    title: '2. Data',
    description:
      'Availability of every turbine, plots of wind, direction, temperature and pressure (switch series on/off), and wind roses per park or per turbine.',
  },
  {
    sidebarStep: 3,
    title: '3. Outage',
    description:
      'The longest block where every turbine of one park is missing while the neighbours keep measuring. You can edit start and end, choose the training data and the air-density option.',
  },
  {
    sidebarStep: 4,
    title: '4. References',
    description:
      'Neighbours with enough data and a correlation of at least 0.5 are kept; every combination of neighbour parks is tested on past periods and the most accurate one wins.',
  },
  {
    sidebarStep: 5,
    title: '5. Method',
    description:
      "One small formula per turbine and wind direction, with the neighbours' delays. Accuracy is measured on test periods of the same length where the true values are known.",
  },
  {
    sidebarStep: 6,
    title: '6. Predicted wind',
    description:
      'The predicted 10-minute wind of each offline turbine during the whole outage, next to the measured wind of the neighbour parks.',
  },
  {
    sidebarStep: 7,
    title: '7. Energy loss',
    description:
      'Lost kWh per turbine and for the park, with an 80 % range taken from the measured test errors, and the result with and without air density.',
  },
  {
    sidebarStep: 8,
    title: '8. E-mail & downloads',
    description:
      'A ready-to-send e-mail for the insurer, CSV files of the predictions and a printable audit report — all filled from the numbers above.',
  },
];

interface GuidedTourProps {
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onLoadDemo?: () => void;
  hasData: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  onLoadDemo,
  hasData,
}) => {
  const step = TOUR_STEPS[currentStepIndex];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  if (!step) return null;

  const progressPercent = ((currentStepIndex + 1) / TOUR_STEPS.length) * 100;

  return (
    // Docked bottom-right: fixed bottom-4 right-4, no backdrop, no blur overlay
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[420px] pointer-events-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-blue-600 dark:border-blue-500 rounded-2xl shadow-2xl p-5 space-y-3.5"
        >
          {/* Thin progress bar across top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="h-full bg-blue-600 dark:bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4" />
              <span>
                Guided Tour &bull; Step {currentStepIndex + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <button
              onClick={onSkip}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer transition-colors"
              title="Close Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Body */}
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {step.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Load demo prompt if on step 1 without data */}
          {!hasData && currentStepIndex === 0 && onLoadDemo && (
            <div className="p-3 bg-blue-50/90 dark:bg-blue-950/60 rounded-xl border border-blue-200/80 dark:border-blue-900/80 flex items-center justify-between gap-2">
              <span className="text-[11px] text-blue-900 dark:text-blue-200 font-medium leading-tight">
                Load demo data now to see real calculations throughout the tour:
              </span>
              <button
                onClick={onLoadDemo}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 cursor-pointer shadow-xs transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Load Demo Data</span>
              </button>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={onSkip}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center space-x-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={onPrev}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={onNext}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-1 cursor-pointer shadow-sm transition-colors"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
