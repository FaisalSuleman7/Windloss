import React from 'react';
import { Wind, Database, Sparkles, ShieldCheck, CheckCircle2, Users } from 'lucide-react';
import { COLORS } from '../utils/colors';

interface TopBarProps {
  onLoadDemo: () => void;
  onStartTour: () => void;
  onOpenSelfTest: () => void;
  onOpenAbout: () => void;
  isSelfTestOpen: boolean;
  isAboutOpen: boolean;
  isDemoActive: boolean;
  isCalculating: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onLoadDemo,
  onStartTour,
  onOpenSelfTest,
  onOpenAbout,
  isSelfTestOpen,
  isAboutOpen,
  isDemoActive,
  isCalculating,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: COLORS.navy }}
          >
            <Wind className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="hidden sm:inline text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Wind Outage Loss Estimator
              </span>
              <span className="sm:hidden text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight whitespace-nowrap">
                Wind Loss
              </span>
              {isDemoActive && (
                <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Demo: BayWa r.e. hackathon data</span>
                </span>
              )}
            </div>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
              Deterministic loss reconstruction for business-interruption claims
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Demo Data button */}
          <button
            onClick={onLoadDemo}
            disabled={isCalculating}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Load or drop BayWa demo dataset"
          >
            <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Load demo data</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* Guided Tour button */}
          <button
            onClick={onStartTour}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            title="Start step-by-step guided tour"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Start guided tour</span>
            <span className="sm:hidden">Tour</span>
          </button>

          {/* About & Team button */}
          <button
            onClick={onOpenAbout}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isAboutOpen
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
            }`}
            title="About the tool, team, and hackathon highlights"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">About &amp; Team</span>
            <span className="sm:hidden">About</span>
          </button>

          {/* Self-test button */}
          <button
            onClick={onOpenSelfTest}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isSelfTestOpen
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}
            title="Open automated verification suite"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Self-test</span>
          </button>
        </div>
      </div>

      {/* Mobile Demo Banner */}
      {isDemoActive && (
        <div className="sm:hidden bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/40 px-4 py-1 text-center text-xs font-semibold text-amber-800 dark:text-amber-300">
          Demo: BayWa r.e. hackathon data active
        </div>
      )}
    </header>
  );
};
