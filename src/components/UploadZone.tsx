import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, RefreshCw, FolderOpen } from 'lucide-react';
import { extractTurbineName } from '../engine';

export interface LoadedFile {
  name: string;
  size: number;
  content: string | ArrayBuffer;
  type: 'turbine' | 'power_curve';
  turbineName: string;
  park: string;
}

interface UploadZoneProps {
  onFilesReady: (files: { name: string; content: string | ArrayBuffer }[]) => void;
  isCalculating: boolean;
  dropLabel?: string;
  compact?: boolean;
  autoRun?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesReady,
  isCalculating,
  dropLabel = 'Drag & drop turbine SCADA and power-curve files here',
  compact = false,
  autoRun = false,
}) => {
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    setReadError(null);
    const newFiles: LoadedFile[] = [];
    let ignoredCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lowerName = file.name.toLowerCase();
      const isXlsx = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
      const isCsv = lowerName.endsWith('.csv') || lowerName.endsWith('.txt');

      if (!isXlsx && !isCsv) {
        ignoredCount++;
        continue; // ignore unsupported files
      }

      const isPowerCurve =
        lowerName.includes('power_curve') ||
        lowerName.includes('powercurve') ||
        lowerName.includes('kennlinie') ||
        lowerName.includes('curve') ||
        lowerName.includes('pc');

      const { turbineName, park } = extractTurbineName(file.name);

      try {
        const content = await new Promise<string | ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result!);
          reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
          if (isXlsx) {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file);
          }
        });

        newFiles.push({
          name: file.name,
          size: file.size,
          content,
          type: isPowerCurve ? 'power_curve' : 'turbine',
          turbineName,
          park,
        });
      } catch (err: unknown) {
        setReadError(err instanceof Error ? err.message : String(err));
      }
    }

    if (ignoredCount > 0 && newFiles.length === 0) {
      setReadError(
        'No supported CSV or Excel files found. Please upload .csv or .xlsx files.'
      );
      return;
    }

    if (newFiles.length > 0) {
      const mergedMap = new Map<string, LoadedFile>();
      for (const f of loadedFiles) mergedMap.set(f.name, f);
      for (const f of newFiles) mergedMap.set(f.name, f);
      const allFiles = Array.from(mergedMap.values());
      setLoadedFiles(allFiles);

      // If autoRun is requested and we have files, automatically trigger calculation
      if (autoRun && allFiles.length > 0) {
        const hasTurbines = allFiles.some((f) => f.type === 'turbine');
        const hasPowerCurves = allFiles.some((f) => f.type === 'power_curve');
        if (hasTurbines && hasPowerCurves) {
          onFilesReady(allFiles.map((f) => ({ name: f.name, content: f.content })));
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (name: string) => {
    setLoadedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const clearAll = () => {
    setLoadedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRun = () => {
    if (loadedFiles.length === 0) return;
    onFilesReady(loadedFiles.map((f) => ({ name: f.name, content: f.content })));
  };

  const turbineFiles = loadedFiles.filter((f) => f.type === 'turbine');
  const powerCurveFiles = loadedFiles.filter((f) => f.type === 'power_curve');

  return (
    <div className="space-y-4">
      {/* Drop Zone Box */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-150 group ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[0.99]'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-blue-50/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.txt,.xlsx,.xls,.CSV,.TXT,.XLSX,.XLS"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{dropLabel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports CSV (semicolons, commas, tabs) and Excel (.xlsx) files
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 shadow-xs cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Browse computer...</span>
          </button>
        </div>
      </div>

      {readError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center space-x-2 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{readError}</span>
        </div>
      )}

      {/* Loaded files breakdown */}
      {loadedFiles.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Selected Files ({loadedFiles.length})
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
                {turbineFiles.length} SCADA series
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium">
                {powerCurveFiles.length} Power curves
              </span>
            </div>
            <button
              onClick={clearAll}
              disabled={isCalculating}
              className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors self-end sm:self-auto cursor-pointer"
            >
              Clear all
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {loadedFiles.map((file) => (
              <span
                key={file.name}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    file.type === 'power_curve' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                />
                <span className="font-semibold">{file.turbineName}</span>
                <span className="text-slate-400 font-mono text-[10px]">({file.name})</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.name);
                  }}
                  disabled={isCalculating}
                  className="hover:text-red-500 ml-1 text-slate-400 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Validation note */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {turbineFiles.length > 0 && powerCurveFiles.length > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" />
                  <span>Ready to estimate: turbine data and power curves loaded.</span>
                </span>
              ) : powerCurveFiles.length === 0 ? (
                <span className="text-amber-600 dark:text-amber-400">
                  ⚠️ Please also upload power curves (*_power_curve.csv) for the target turbines.
                </span>
              ) : (
                <span>Please upload turbine time-series files (*_data.csv).</span>
              )}
            </div>

            <button
              onClick={handleRun}
              disabled={isCalculating || loadedFiles.length === 0}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Run Loss Estimation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
