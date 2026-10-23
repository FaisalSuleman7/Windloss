import React from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Database } from 'lucide-react';

export interface TourStep {
  sidebarStep: number;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    sidebarStep: 1,
    title: '1. Start & File Ingestion',
    description:
      'Upload turbine SCADA time-series files (*_data.csv) and target turbine power curves. The engine supports CSV (semicolons, commas) and Excel formats.',
  },
  {
    sidebarStep: 3,
    title: '2. Automatic Outage Detection',
    description:
      'The engine automatically detects simultaneous downtime across a park while checking that reference parks remained operating. Boundaries are fully editable.',
  },
  {
    sidebarStep: 4,
    title: '3. Turbine Screening & Park Selection',
    description:
      'Candidate reference turbines are screened for ≥50% coverage and r ≥ 0.50 correlation. Non-empty park combinations are backtested to pick the best reference.',
  },
  {
    sidebarStep: 5,
    title: '4. Mathematical Method & Accuracy',
    description:
      'Calculates wind transit delays (lags), direction sector OLS regressions with Bayesian shrinkage, and cross-validates accuracy on historical windows.',
  },
  {
    sidebarStep: 6,
    title: '5. Reconstructed Wind Speeds',
    description:
      'Interactive 10-minute wind speed time series during the outage for each target turbine, with interactive toggles to compare against neighboring parks.',
  },
  {
    sidebarStep: 7,
    title: '6. Lost Energy & 80% Uncertainty Range',
    description:
      'Applies 21-node Gauss-Hermite integration to compute expected power (accounting for prediction spread σ) and exact 1/6h energy integration.',
  },
  {
    sidebarStep: 8,
    title: '7. Ready-to-File Insurance Claim',
    description:
      'Generates a formal business-interruption claim email formatted with all calculated figures, 80% error ranges, and air density sensitivity notes.',
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
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-4">
      {/* Semi-transparent backdrop with click to skip */}
      <div
        onClick={onSkip}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] pointer-events-auto transition-opacity"
      />

      {/* Floating Tooltip Card */}
      <div className="relative pointer-events-auto bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 rounded-2xl shadow-2xl p-6 max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Guided Tour &bull; Step {currentStepIndex + 1} of {TOUR_STEPS.length}</span>
          </div>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            title="Skip Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {step.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {step.description}
          </p>
        </div>

        {!hasData && currentStepIndex === 0 && onLoadDemo && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
            <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">
              Load demo data now to see real calculations throughout the tour:
            </span>
            <button
              onClick={onLoadDemo}
              className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 cursor-pointer shadow-xs"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Demo Data</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onSkip}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center space-x-2">
            {currentStepIndex > 0 && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center space-x-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={onNext}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-1 cursor-pointer shadow-sm"
            >
              <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export { TOUR_STEPS };
