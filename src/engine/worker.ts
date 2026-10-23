/**
 * Web Worker for running the wind loss calculation engine off the main UI thread.
 */
import {
  parseRawFiles,
  runLossEstimation,
  CalculationOptions,
  ParsedTurbine,
  PowerCurve,
} from './index';

self.onmessage = async (e: MessageEvent) => {
  const data = e.data;

  try {
    if (data.type === 'RUN_FROM_FILES') {
      const { files, options } = data as {
        files: { name: string; content: string | ArrayBuffer }[];
        options?: CalculationOptions;
      };

      self.postMessage({
        type: 'PROGRESS',
        stage: 'parsing',
        percent: 5,
        detail: `Parsing ${files.length} input files...`,
      });

      const { turbines, powerCurves, errors } = parseRawFiles(files);
      if (errors.length > 0 && turbines.length === 0) {
        self.postMessage({
          type: 'ERROR',
          error: errors.join('\n'),
        });
        return;
      }

      const result = runLossEstimation(
        turbines,
        powerCurves,
        options,
        (stage, percent, detail) => {
          self.postMessage({ type: 'PROGRESS', stage, percent, detail });
        }
      );

      // Append any parsing errors to result warnings
      if (errors.length > 0) {
        result.warnings.push(...errors);
      }

      self.postMessage({ type: 'SUCCESS', result });
    } else if (data.type === 'RUN_FROM_PARSED') {
      const { turbines, powerCurves, options } = data as {
        turbines: ParsedTurbine[];
        powerCurves: PowerCurve[];
        options?: CalculationOptions;
      };

      const result = runLossEstimation(
        turbines,
        powerCurves,
        options,
        (stage, percent, detail) => {
          self.postMessage({ type: 'PROGRESS', stage, percent, detail });
        }
      );

      self.postMessage({ type: 'SUCCESS', result });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'ERROR', error: errorMsg });
  }
};
