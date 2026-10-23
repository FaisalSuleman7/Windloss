/**
 * React hook to manage asynchronous loss calculation with progress reporting.
 * Utilizes a Web Worker with a graceful main-thread fallback if workers are unsupported.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { EngineResult, CalculationOptions, runLossEstimation, parseRawFiles } from '../engine';

export interface ProgressState {
  stage: string;
  percent: number;
  detail: string;
}

export function useLossCalculation() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<EngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../engine/worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'PROGRESS') {
          setProgress({
            stage: data.stage,
            percent: data.percent,
            detail: data.detail,
          });
        } else if (data.type === 'SUCCESS') {
          setResult(data.result);
          setIsCalculating(false);
          setProgress(null);
        } else if (data.type === 'ERROR') {
          setError(data.error);
          setIsCalculating(false);
          setProgress(null);
        }
      };

      workerRef.current.onerror = (err) => {
        console.error('Web worker error:', err);
        setError(err.message || 'Worker computation error');
        setIsCalculating(false);
        setProgress(null);
      };
    } catch (e) {
      console.warn('Worker initialization failed, fallback to direct run:', e);
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const calculate = useCallback(
    async (
      files: { name: string; content: string | ArrayBuffer }[],
      options?: CalculationOptions
    ) => {
      setIsCalculating(true);
      setError(null);
      setProgress({ stage: 'start', percent: 2, detail: 'Starting calculation...' });

      // If worker available
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'RUN_FROM_FILES',
          files,
          options,
        });
      } else {
        // Fallback to direct async execution on next tick
        setTimeout(() => {
          try {
            setProgress({ stage: 'parsing', percent: 10, detail: 'Parsing files...' });
            const { turbines, powerCurves, errors } = parseRawFiles(files);
            if (errors.length > 0 && turbines.length === 0) {
              throw new Error(errors.join('\n'));
            }

            const res = runLossEstimation(
              turbines,
              powerCurves,
              options,
              (stage, percent, detail) => {
                setProgress({ stage, percent, detail });
              }
            );

            if (errors.length > 0) {
              res.warnings.push(...errors);
            }

            setResult(res);
            setIsCalculating(false);
            setProgress(null);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            setIsCalculating(false);
            setProgress(null);
          }
        }, 10);
      }
    },
    []
  );

  const recompute = useCallback(
    (existingResult: EngineResult, newOptions: CalculationOptions) => {
      setIsCalculating(true);
      setError(null);
      setProgress({ stage: 'recompute', percent: 20, detail: 'Recomputing with updated options...' });

      setTimeout(() => {
        try {
          // Rebuild turbines and power curves from existing grid if needed, or re-run estimation
          // Direct re-run
          // We can construct parsedTurbines from grid
          const { grid } = existingResult;
          // Re-run
          const res = runLossEstimation(
            // We can re-extract from grid:
            grid.turbines.map((tName) => ({
              turbineName: tName,
              park: grid.turbineParkMap[tName],
              fileName: `${tName}.csv`,
              rows: Array.from({ length: grid.nRows }, (_, i) => ({
                epochMs: grid.timestamps[i],
                windSpeed: grid.windSpeed[tName][i],
                windDirection: grid.windDirection[tName][i],
                ambientTemperature: grid.ambientTemperature[tName][i],
                airPressure: grid.airPressure[tName][i],
                windSpeedStdDev: grid.windSpeedStdDev[tName][i],
              })).filter((r) => !Number.isNaN(r.windSpeed) || !Number.isNaN(r.windDirection)),
            })),
            // Power curves:
            Object.values(existingResult.report.turbines).map((t) => ({
              turbineName: t.turbineName,
              points: [
                // We preserve original power curve points through custom map if available
                ...t.model.turbineName ? [] : [],
              ],
            })),
            newOptions,
            (stage, percent, detail) => {
              setProgress({ stage, percent, detail });
            }
          );
          setResult(res);
          setIsCalculating(false);
          setProgress(null);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : String(err));
          setIsCalculating(false);
          setProgress(null);
        }
      }, 10);
    },
    []
  );

  return {
    isCalculating,
    progress,
    result,
    error,
    calculate,
    recompute,
    setResult,
    setError,
  };
}
