import React from 'react';
import {
  Home,
  TableProperties,
  CalendarX,
  Compass,
  LineChart,
  Wind,
  Zap,
  Mail,
  Download,
  CheckCircle2,
  Circle,
} from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SIDEBAR_STEPS: StepItem[] = [
  { id: 1, label: 'Start', icon: Home },
  { id: 2, label: 'Data', icon: TableProperties },
  { id: 3, label: 'Outage', icon: CalendarX },
  { id: 4, label: 'References', icon: Compass },
  { id: 5, label: 'Method & accuracy', icon: LineChart },
  { id: 6, label: 'Predicted wind', icon: Wind },
  { id: 7, label: 'Energy loss', icon: Zap },
  { id: 8, label: 'Insurance e-mail', icon: Mail },
  { id: 9, label: 'Downloads', icon: Download },
];

interface SidebarProps {
  activeStep: number;
  onSelectStep: (stepId: number) => void;
  completedSteps: Set<number>;
  hasData: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeStep,
  onSelectStep,
  completedSteps,
  hasData,
}) => {
  return (
    <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 flex flex-col space-y-1">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Claim Calculation Steps
      </div>

      <nav className="space-y-1">
        {SIDEBAR_STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const isDone = completedSteps.has(step.id);

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : isDone
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {step.id}
                </span>
                <span className="truncate">{step.label}</span>
              </div>

              {isDone ? (
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-200' : 'text-emerald-500 dark:text-emerald-400'
                  }`}
                />
              ) : (
                <Circle
                  className={`w-3.5 h-3.5 shrink-0 opacity-40 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Helper notice */}
      <div className="mt-auto pt-6 px-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {hasData ? 'Dataset Active' : 'No Data Loaded'}
          </p>
          <p>
            {hasData
              ? 'Results computed across all steps in browser worker.'
              : 'Upload files or load demo dataset in Step 1 to begin.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
