/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AlertCircle,
  Database,
  X,
  Upload,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { useLossCalculation } from './hooks/useLossCalculation';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { GuidedTour, TOUR_STEPS } from './components/GuidedTour';
import { SelfTestView } from './components/SelfTestView';
import { UploadZone } from './components/UploadZone';

// 9 Step Components
import { Step1Start } from './components/steps/Step1Start';
import { Step2Data } from './components/steps/Step2Data';
import { Step3Outage } from './components/steps/Step3Outage';
import { Step4References } from './components/steps/Step4References';
import { Step5Method } from './components/steps/Step5Method';
import { Step6PredictedWind } from './components/steps/Step6PredictedWind';
import { Step7EnergyLoss } from './components/steps/Step7EnergyLoss';
import { Step8Email } from './components/steps/Step8Email';
import { Step9Downloads } from './components/steps/Step9Downloads';

import { TrainingDataOption, CalculationOptions } from './engine';

export default function App() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSelfTestOpen, setIsSelfTestOpen] = useState<boolean>(false);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [showDemoDropModal, setShowDemoDropModal] = useState<boolean>(false);
  const [cachedRawFiles, setCachedRawFiles] = useState<{ name: string; content: string | ArrayBuffer }[]>([]);
  const [trainingOption, setTrainingOption] = useState<TrainingDataOption>('all_measured');

  // Guided tour state
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);

  const {
    isCalculating,
    progress,
    result,
    error,
    calculate,
    setError,
  } = useLossCalculation();

  // Completed steps tracking
  const completedSteps = React.useMemo(() => {
    const set = new Set<number>();
    if (cachedRawFiles.length > 0 || result) {
      set.add(1);
    }
    if (result) {
      for (let s = 2; s <= 9; s++) {
        set.add(s);
      }
    }
    return set;
  }, [cachedRawFiles, result]);

  // Automatic Guided Tour start on first visit
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('wind_estimator_tour_seen');
    if (!hasSeenTour) {
      setIsTourActive(true);
      setTourStepIndex(0);
    }
  }, []);

  // Automatically advance to Step 2 (Data) when calculation produces results
  useEffect(() => {
    if (result && activeStep === 1) {
      setActiveStep(2);
    }
  }, [result, activeStep]);

  const handleFilesReady = (files: { name: string; content: string | ArrayBuffer }[]) => {
    setCachedRawFiles(files);
    // Check if these are demo files
    const fileNames = files.map((f) => f.name.toLowerCase());
    const isBayWaDemo =
      fileNames.some((n) => n.startsWith('t1') || n.includes('t1_data')) &&
      fileNames.some((n) => n.startsWith('h1') || n.includes('h1_data'));
    if (isBayWaDemo) {
      setIsDemoActive(true);
    }

    calculate(files, { trainingOption });
  };

  // Demo Data loader: check /demo/manifest.json, otherwise open drop zone modal
  const handleLoadDemoData = useCallback(async () => {
    try {
      const response = await fetch('/demo/manifest.json');
      if (response.ok) {
        const fileNames = (await response.json()) as string[];
        const fetchedFiles: { name: string; content: string | ArrayBuffer }[] = [];

        for (const fName of fileNames) {
          const res = await fetch(`/demo/${fName}`);
          if (!res.ok) throw new Error(`Could not fetch /demo/${fName}`);
          const text = await res.text();
          fetchedFiles.push({ name: fName, content: text });
        }

        if (fetchedFiles.length > 0) {
          setIsDemoActive(true);
          setCachedRawFiles(fetchedFiles);
          calculate(fetchedFiles, { trainingOption });
          return;
        }
      }
    } catch {
      // /demo/ does not exist or network unavailable: open demo drop modal as specified
    }

    setShowDemoDropModal(true);
  }, [calculate, trainingOption]);

  const handleDemoFilesDropped = (files: { name: string; content: string | ArrayBuffer }[]) => {
    setShowDemoDropModal(false);
    setIsDemoActive(true);
    handleFilesReady(files);
  };

  const handleUpdateOptions = (
    manualOutage?: { targetPark: string; startIndex: number; endIndex: number },
    newTrainingOption?: TrainingDataOption,
    manualParks?: string[]
  ) => {
    if (newTrainingOption) {
      setTrainingOption(newTrainingOption);
    }

    if (cachedRawFiles.length === 0) return;

    const options: CalculationOptions = {
      manualOutage,
      manualParkCombination: manualParks,
      trainingOption: newTrainingOption || trainingOption,
    };

    calculate(cachedRawFiles, options);
  };

  // Guided Tour handlers
  const handleStartTour = () => {
    setIsSelfTestOpen(false);
    setIsTourActive(true);
    setTourStepIndex(0);
    setActiveStep(TOUR_STEPS[0].sidebarStep);
  };

  const handleNextTourStep = () => {
    if (tourStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = tourStepIndex + 1;
      setTourStepIndex(nextIdx);
      setActiveStep(TOUR_STEPS[nextIdx].sidebarStep);
    } else {
      setIsTourActive(false);
      localStorage.setItem('wind_estimator_tour_seen', 'true');
    }
  };

  const handlePrevTourStep = () => {
    if (tourStepIndex > 0) {
      const prevIdx = tourStepIndex - 1;
      setTourStepIndex(prevIdx);
      setActiveStep(TOUR_STEPS[prevIdx].sidebarStep);
    }
  };

  const handleSkipTour = () => {
    setIsTourActive(false);
    localStorage.setItem('wind_estimator_tour_seen', 'true');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <TopBar
        onLoadDemo={handleLoadDemoData}
        onStartTour={handleStartTour}
        onOpenSelfTest={() => setIsSelfTestOpen((prev) => !prev)}
        isSelfTestOpen={isSelfTestOpen}
        isDemoActive={isDemoActive}
        isCalculating={isCalculating}
      />

      {/* Main Workspace */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex flex-col md:flex-row">
        {/* Left Sidebar */}
        {!isSelfTestOpen && (
          <Sidebar
            activeStep={activeStep}
            onSelectStep={(stepId) => setActiveStep(stepId)}
            completedSteps={completedSteps}
            hasData={result !== null}
          />
        )}

        {/* Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Computation Progress Banner */}
          {isCalculating && progress && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-sm animate-pulse">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
                <span className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>{progress.detail}</span>
                </span>
                <span>{progress.percent} %</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Engine Error Notice */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Calculation Notice</p>
                <p className="text-xs mt-0.5 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* Render Self-Test View if Open */}
          {isSelfTestOpen ? (
            <div className="space-y-4">
              <button
                onClick={() => setIsSelfTestOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Loss Estimator Steps</span>
              </button>
              <SelfTestView />
            </div>
          ) : (
            /* Render 9 Steps */
            <div>
              {activeStep === 1 && (
                <Step1Start
                  result={result}
                  onFilesReady={handleFilesReady}
                  onLoadDemo={handleLoadDemoData}
                  onNavigateStep={(s) => setActiveStep(s)}
                  isCalculating={isCalculating}
                  isDemoActive={isDemoActive}
                />
              )}

              {activeStep === 2 && (
                result ? (
                  <Step2Data result={result} />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}

              {activeStep === 3 && (
                result ? (
                  <Step3Outage
                    result={result}
                    onUpdateOptions={handleUpdateOptions}
                    isCalculating={isCalculating}
                  />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}

              {activeStep === 4 && (
                result ? (
                  <Step4References
                    result={result}
                    onUpdateParkCombination={(parks) => handleUpdateOptions(undefined, undefined, parks)}
                    isCalculating={isCalculating}
                  />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}

              {activeStep === 5 && (
                result ? (
                  <Step5Method result={result} />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}

              {activeStep === 6 && (
                result ? (
                  <Step6PredictedWind result={result} />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}

              {activeStep === 7 && (
                result ? (
                  <Step7EnergyLoss result={result} />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}

              {activeStep === 8 && (
                result ? (
                  <Step8Email result={result} />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}

              {activeStep === 9 && (
                result ? (
                  <Step9Downloads result={result} />
                ) : (
                  <NoDataNotice onGoToStart={() => setActiveStep(1)} onLoadDemo={handleLoadDemoData} />
                )
              )}
            </div>
          )}
        </main>
      </div>

      {/* Guided Tour Tooltip */}
      {isTourActive && !isSelfTestOpen && (
        <GuidedTour
          currentStepIndex={tourStepIndex}
          onNext={handleNextTourStep}
          onPrev={handlePrevTourStep}
          onSkip={handleSkipTour}
          onLoadDemo={handleLoadDemoData}
          hasData={result !== null}
        />
      )}

      {/* Demo Drop Zone Modal (if /demo/ was not found on server) */}
      {showDemoDropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                <Database className="w-5 h-5 text-amber-500" />
                <span>Load BayWa r.e. Demo Dataset</span>
              </div>
              <button
                onClick={() => setShowDemoDropModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Drop the 13 BayWa demo files here (10 *_data.csv and 3 *_power_curve.csv). The engine will automatically run and enable all 9 steps.
            </p>

            <UploadZone
              dropLabel="Drop the 13 BayWa demo files here"
              onFilesReady={handleDemoFilesDropped}
              isCalculating={isCalculating}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 text-xs text-slate-500 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Wind Outage Loss Estimator &bull; Business-Interruption Calculation Core</span>
        <span>100% Client-Side In-Browser Execution &bull; Zero External AI/API Calls</span>
      </footer>
    </div>
  );
}

/**
 * Friendly placeholder when a user navigates to step 2-9 before uploading data
 */
function NoDataNotice({
  onGoToStart,
  onLoadDemo,
}: {
  onGoToStart: () => void;
  onLoadDemo: () => void;
}) {
  return (
    <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center max-w-md mx-auto my-12 space-y-4 shadow-sm">
      <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-full w-12 h-12 mx-auto text-blue-600 flex items-center justify-center">
        <Upload className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          No Turbine Data Loaded Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload your turbine SCADA files in Step 1 or load the BayWa demo data to view this step.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
        <button
          onClick={onLoadDemo}
          className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
        >
          Load Demo Data
        </button>
        <button
          onClick={onGoToStart}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
        >
          Go to Step 1: Start
        </button>
      </div>
    </div>
  );
}
