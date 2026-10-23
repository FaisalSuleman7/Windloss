import React, { useState, useRef } from 'react';
import {
  Wind,
  ArrowRight,
  Database,
  Upload,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  Sparkles,
  X,
  FolderOpen,
} from 'lucide-react';
import { UploadZone } from '../UploadZone';
import { EngineResult } from '../../engine';

interface Step1StartProps {
  result: EngineResult | null;
  onFilesReady: (files: { name: string; content: string | ArrayBuffer }[]) => void;
  onLoadDemo: () => void;
  onNavigateStep: (stepId: number) => void;
  isCalculating: boolean;
  isDemoActive: boolean;
}

export const Step1Start: React.FC<Step1StartProps> = ({
  result,
  onFilesReady,
  onLoadDemo,
  onNavigateStep,
  isCalculating,
  isDemoActive,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const handleHeroFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = e.target.files;
    const loadedFiles: { name: string; content: string | ArrayBuffer }[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lowerName = file.name.toLowerCase();
      const isXlsx = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
      const isCsv = lowerName.endsWith('.csv') || lowerName.endsWith('.txt');
      if (!isXlsx && !isCsv) continue;

      try {
        const content = await new Promise<string | ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result!);
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          if (isXlsx) {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file);
          }
        });
        loadedFiles.push({ name: file.name, content });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    if (loadedFiles.length > 0) {
      setShowUploadModal(false);
      onFilesReady(loadedFiles);
    }
  };

  const handleOpenUpload = () => {
    // Open modal and immediately trigger file browser
    setShowUploadModal(true);
    setTimeout(() => {
      heroFileInputRef.current?.click();
    }, 50);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Hidden file input for immediate native file picker trigger */}
      <input
        ref={heroFileInputRef}
        type="file"
        multiple
        accept=".csv,.txt,.xlsx,.xls,.CSV,.TXT,.XLSX,.XLS"
        onChange={handleHeroFilesSelected}
        className="hidden"
      />

      {/* Non-expert Hero Statement */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Wind Park Business-Interruption Engine</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Reconstruct lost wind energy with mathematical certainty.
        </h2>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          When a wind park is offline, its own wind sensors are offline too. We rebuild its wind from
          neighbouring parks and convert it to lost energy.
        </p>

        {/* 3-Box Flow */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Box 1 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between h-28">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Step 1</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Wind className="w-5 h-5 text-amber-500" />
              <span>Neighbours' wind</span>
            </span>
            <span className="text-xs text-slate-500">Intact reference park measurements</span>
          </div>

          <div className="hidden md:flex justify-center text-slate-400">
            <ArrowRight className="w-6 h-6" />
          </div>

          {/* Box 2 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between h-28">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Step 2</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-blue-500" />
              <span>Learned relation</span>
            </span>
            <span className="text-xs text-slate-500">Delay sync & direction OLS regression</span>
          </div>

          <div className="hidden md:flex justify-center text-slate-400">
            <ArrowRight className="w-6 h-6" />
          </div>

          {/* Box 3 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between h-28">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Step 3</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Lost kWh</span>
            </span>
            <span className="text-xs text-slate-500">Gauss-Hermite power curve integration</span>
          </div>
        </div>

        {/* Two Big Action Buttons */}
        <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={onLoadDemo}
            disabled={isCalculating}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Database className="w-5 h-5" />
            <span>Try the demo (BayWa data)</span>
          </button>

          <button
            onClick={handleOpenUpload}
            disabled={isCalculating}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            <span>Upload my files</span>
          </button>
        </div>

        {result && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-sm block">
                  Loss estimation ready for Park {result.outage.targetPark} ({result.outage.targetTurbines.join(', ')})
                </span>
                <span>
                  {Math.round(result.report.parkEnergyKWh).toLocaleString('en-US')} kWh lost over{' '}
                  {result.outage.durationHours.toFixed(1)} h.
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigateStep(2)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer self-start sm:self-auto"
            >
              Inspect Data (Step 2) &rarr;
            </button>
          </div>
        )}
      </div>

      {/* How To Use Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-bold text-base">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h3>How to use this estimator</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs inline-flex items-center justify-center mb-1">
              1
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Drop all turbine files and power curves
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drop all turbine time-series files (*_data.csv) and the power curves of affected target turbines (*_power_curve.csv).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs inline-flex items-center justify-center mb-1">
              2
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Check the detected outage
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify the automatically identified start and end timestamps. Adjust manually if needed with live re-calculation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs inline-flex items-center justify-center mb-1">
              3
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Read the energy loss and the e-mail
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review empirical 80% confidence intervals, export predictions to CSV, and copy the ready-to-file insurance claim text.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone on Step 1 Page */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Upload SCADA Data & Power Curves
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select or drop your turbine time-series files and power curves here
            </p>
          </div>
        </div>
        <UploadZone
          onFilesReady={(files) => {
            onFilesReady(files);
          }}
          isCalculating={isCalculating}
          dropLabel="Drop all turbine files (*_data.csv) and power curves (*_power_curve.csv) here"
        />
      </div>

      {/* Upload Modal Dialog */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-base">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Upload SCADA Data Files & Power Curves</span>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Select all turbine time-series files (CSV or Excel) and the power curves of the affected target turbines.
            </p>

            <UploadZone
              dropLabel="Drop files here or click to browse"
              onFilesReady={(files) => {
                setShowUploadModal(false);
                onFilesReady(files);
              }}
              isCalculating={isCalculating}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
