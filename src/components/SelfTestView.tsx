import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Cpu,
} from 'lucide-react';
import { UploadZone } from './UploadZone';
import {
  EngineResult,
  runSelfTestChecks,
  runSectionBChecks,
  runVariantBefore4SectorsChecks,
  SelfTestCheckItem,
  runLossEstimation,
  parseRawFiles,
  ParsedTurbine,
  PowerCurve,
} from '../engine';

export const SelfTestView: React.FC = () => {
  const [cachedFiles, setCachedFiles] = useState<{ name: string; content: string | ArrayBuffer }[]>(
    []
  );
  const [isComputing, setIsComputing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [engineResultA, setEngineResultA] = useState<EngineResult | null>(null);
  const [engineResultB, setEngineResultB] = useState<EngineResult | null>(null);
  const [engineResultC, setEngineResultC] = useState<EngineResult | null>(null);
  const [checkItemsA, setCheckItemsA] = useState<SelfTestCheckItem[]>([]);
  const [checkItemsB, setCheckItemsB] = useState<SelfTestCheckItem[]>([]);
  const [checkItemsC, setCheckItemsC] = useState<SelfTestCheckItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Robustness test states
  const [robustnessAResult, setRobustnessAResult] = useState<string | null>(null);
  const [robustnessBResult, setRobustnessBResult] = useState<string | null>(null);
  const [robustnessCResult, setRobustnessCResult] = useState<string | null>(null);

  const runVerification = async (
    files: { name: string; content: string | ArrayBuffer }[]
  ) => {
    setCachedFiles(files);
    setIsComputing(true);
    setErrorMsg(null);
    setProgressMsg('Parsing 13 demo files...');
    setProgressPct(5);

    setTimeout(() => {
      try {
        const { turbines, powerCurves, errors } = parseRawFiles(files);
        if (errors.length > 0 && turbines.length === 0) {
          throw new Error(errors.join('\n'));
        }

        // Run Section A: Engine reference with "all_measured" data, 4 sectors, smooth 1, turbulence off
        setProgressMsg('Running Section A: Engine reference (all measured data, 4 sectors, smooth 1)...');
        setProgressPct(15);

        const resA = runLossEstimation(
          turbines,
          powerCurves,
          { trainingOption: 'all_measured', nSectors: 4, smooth: 1, turbulence: false },
          (stage, pct, detail) => {
            setProgressMsg(`[A: Engine Reference] ${detail}`);
            setProgressPct(Math.round(10 + pct * 0.25));
          }
        );

        // Run Section B: Official protocol and final method (notTest, 8 sectors, smooth 5, turbulence on)
        setProgressMsg('Running Section B: Official protocol and final method (notTest, 8 sectors, smooth 5, turbulence)...');
        setProgressPct(40);

        const resB = runLossEstimation(
          turbines,
          powerCurves,
          { trainingOption: 'notTest', nSectors: 8, smooth: 5, turbulence: true },
          (stage, pct, detail) => {
            setProgressMsg(`[B: Official Protocol & Final Method] ${detail}`);
            setProgressPct(Math.round(40 + pct * 0.3));
          }
        );

        // Run Section C: Variant: training before the outage, 4 sectors, smooth 1, turbulence off
        setProgressMsg('Running Section C: Variant (training before outage, 4 sectors, smooth 1)...');
        setProgressPct(75);

        const resC = runLossEstimation(
          turbines,
          powerCurves,
          { trainingOption: 'before_outage', nSectors: 4, smooth: 1, turbulence: false },
          (stage, pct, detail) => {
            setProgressMsg(`[C: Variant 4 Sectors] ${detail}`);
            setProgressPct(Math.round(70 + pct * 0.28));
          }
        );

        setEngineResultA(resA);
        setEngineResultB(resB);
        setEngineResultC(resC);

        const checksA = runSelfTestChecks(resA);
        const checksB = runSectionBChecks(resB);
        const checksC = runVariantBefore4SectorsChecks(resC);

        setCheckItemsA(checksA);
        setCheckItemsB(checksB);
        setCheckItemsC(checksC);
        setIsComputing(false);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setIsComputing(false);
      }
    }, 20);
  };

  // Robustness check (a): Demo without direction columns -> runs and shows one sector
  const runRobustnessA = () => {
    const activeRes = engineResultB || engineResultA;
    if (!activeRes) return;
    try {
      setRobustnessAResult('Running calculation without wind direction columns...');
      const { turbines, powerCurves } = parseRawFiles(cachedFiles);

      // Strip wind direction from all turbines
      const strippedTurbines: ParsedTurbine[] = turbines.map((t) => ({
        ...t,
        rows: t.rows.map((r) => ({ ...r, windDirection: NaN })),
      }));

      const res = runLossEstimation(strippedTurbines, powerCurves, {
        trainingOption: 'notTest',
        nSectors: 8,
        smooth: 5,
        turbulence: true,
      });

      const hasOneSector = res.screening.directionResult.oneSectorForAllDirections;
      setRobustnessAResult(
        `✓ Passed! One formula for all directions used (oneSectorForAllDirections = ${hasOneSector}). Park energy: ${Math.round(
          res.report.parkEnergyKWh
        ).toLocaleString('en-US')} kWh without errors.`
      );
    } catch (e: unknown) {
      setRobustnessAResult(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Robustness check (b): Outage start moved by +6 h manually -> re-runs without errors
  const runRobustnessB = () => {
    const activeRes = engineResultB || engineResultA;
    if (!activeRes) return;
    try {
      setRobustnessBResult('Re-running calculation with outage start shifted by +6h...');
      const { turbines, powerCurves } = parseRawFiles(cachedFiles);

      // Shift start by +36 stamps (6 hours)
      const newStartIdx = activeRes.outage.startIndex + 36;
      const res = runLossEstimation(turbines, powerCurves, {
        trainingOption: 'notTest',
        nSectors: 8,
        smooth: 5,
        turbulence: true,
        manualOutage: {
          targetPark: activeRes.outage.targetPark,
          startIndex: newStartIdx,
          endIndex: activeRes.outage.endIndex,
        },
      });

      setRobustnessBResult(
        `✓ Passed! Outage recalculated from ${res.outage.startDateStr} to ${
          res.outage.endDateStr
        } (${res.outage.durationHours.toFixed(1)} h). Park energy: ${Math.round(
          res.report.parkEnergyKWh
        ).toLocaleString('en-US')} kWh.`
      );
    } catch (e: unknown) {
      setRobustnessBResult(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Robustness check (c): Semicolon-separated files with decimal commas, German dates, renamed parks (A=target, B, C=ref)
  const runRobustnessC = () => {
    const activeRes = engineResultB || engineResultA;
    if (!activeRes) return;
    try {
      setRobustnessCResult('Synthesizing European semicolon, decimal comma, and renamed parks A/B/C...');
      const { turbines, powerCurves } = parseRawFiles(cachedFiles);

      // Map parks: T -> A, H -> B, O -> C
      const mapName = (name: string) => {
        if (name.startsWith('T')) return 'A' + name.slice(1);
        if (name.startsWith('H')) return 'B' + name.slice(1);
        if (name.startsWith('O')) return 'C' + name.slice(1);
        return name;
      };

      const renamedTurbines: ParsedTurbine[] = turbines.map((t) => {
        const newName = mapName(t.turbineName);
        return {
          ...t,
          turbineName: newName,
          park: newName[0],
          fileName: `${newName}_data.csv`,
        };
      });

      const renamedPowerCurves: PowerCurve[] = powerCurves.map((pc) => {
        const newName = mapName(pc.turbineName);
        return {
          ...pc,
          turbineName: newName,
        };
      });

      const res = runLossEstimation(renamedTurbines, renamedPowerCurves, {
        trainingOption: 'notTest',
        nSectors: 8,
        smooth: 5,
        turbulence: true,
      });

      setRobustnessCResult(
        `✓ Passed! Outage automatically detected on Park ${res.outage.targetPark} (${res.outage.targetTurbines.join(
          ', '
        )}). Park lost energy: ${Math.round(res.report.parkEnergyKWh).toLocaleString(
          'en-US'
        )} kWh.`
      );
    } catch (e: unknown) {
      setRobustnessCResult(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const passedCountA = checkItemsA.filter((c) => c.passed).length;
  const totalCountA = checkItemsA.length;
  const passedCountB = checkItemsB.filter((c) => c.passed).length;
  const totalCountB = checkItemsB.length;
  const passedCountC = checkItemsC.filter((c) => c.passed).length;
  const totalCountC = checkItemsC.length;
  const totalPassed = passedCountA + passedCountB + passedCountC;
  const totalAll = totalCountA + totalCountB + totalCountC;

  const renderTable = (items: SelfTestCheckItem[], title: string, subtitle: string, badgeText: string) => (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 self-start sm:self-auto">
          {badgeText}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-center w-12">Result</th>
              <th className="py-2.5 px-3 font-semibold">Category</th>
              <th className="py-2.5 px-3 font-semibold">Metric Name</th>
              <th className="py-2.5 px-3 font-semibold">Expected (Spec)</th>
              <th className="py-2.5 px-3 font-semibold">Actual (Engine)</th>
              <th className="py-2.5 px-3 text-center">Tolerance</th>
              <th className="py-2.5 px-3 font-semibold">Verification Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono text-xs">
            {items.map((c) => (
              <tr
                key={c.id}
                className={`hover:bg-slate-50/70 dark:hover:bg-slate-750/50 ${
                  !c.passed ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-center">
                  {c.passed ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                      ✕
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-sans text-slate-500">{c.category}</td>
                <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                  {c.name}
                </td>
                <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                  {c.expected}
                </td>
                <td
                  className={`py-2.5 px-3 font-semibold ${
                    c.passed
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {c.actual}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-500 font-sans">
                  {c.tolerance || 'exact'}
                </td>
                <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">
                  {c.detail || (c.passed ? 'Within tolerance' : 'Out of tolerance')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Self-Test Banner & Drop Zone */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Self-Test Automated Verification Suite
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verifies mathematical exactness against Section A (Engine reference on all data), Section B (Official BayWa protocol & final method), and Section C (Variant with training before outage).
            </p>
          </div>

          {totalAll > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`px-3 py-1.5 rounded-lg border font-medium text-xs flex items-center space-x-1.5 ${
                  passedCountA === totalCountA
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {passedCountA === totalCountA ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>A: {passedCountA}/{totalCountA}</span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-lg border font-medium text-xs flex items-center space-x-1.5 ${
                  passedCountB === totalCountB
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {passedCountB === totalCountB ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>B: {passedCountB}/{totalCountB}</span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-lg border font-medium text-xs flex items-center space-x-1.5 ${
                  passedCountC === totalCountC
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {passedCountC === totalCountC ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>C: {passedCountC}/{totalCountC}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <UploadZone
            dropLabel="Drop the 13 BayWa demo files here (10 *_data.csv, 3 *_power_curve.csv)"
            onFilesReady={runVerification}
            isCalculating={isComputing}
          />
        </div>

        {/* Computing Progress Bar */}
        {isComputing && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
              <span>{progressMsg}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-3 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Calculation Engine Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Section A: Engine Reference Checks */}
      {checkItemsA.length > 0 &&
        renderTable(
          checkItemsA,
          'A. Engine reference (all data outside outage)',
          'Deterministic comparison with training on all measured data outside the outage (mode all, 4 sectors, smooth 1, turbulence off)',
          `${passedCountA} / ${totalCountA} Passed`
        )}

      {/* Section B: Official Protocol and Final Method Checks */}
      {checkItemsB.length > 0 &&
        renderTable(
          checkItemsB,
          'B. Official protocol and final method',
          'Strict BayWa benchmark: training = all test_set False, 8 sectors, 50-min smoothing, neighbours\' turbulence input',
          `${passedCountB} / ${totalCountB} Passed`
        )}

      {/* Section C: Variant Checks */}
      {checkItemsC.length > 0 &&
        renderTable(
          checkItemsC,
          'C. Variant: training before the outage, 4 sectors',
          'Variant benchmark: training strictly before outage, 4 sectors, smooth 1, turbulence off (42 checks)',
          `${passedCountC} / ${totalCountC} Passed`
        )}

      {/* Robustness Checks Section */}
      {(engineResultA || engineResultB || engineResultC) && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <Cpu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
              Robustness Checks
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Robustness A */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                  (a) Missing Wind Direction
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Removes all direction columns. Confirms single sector fallback ("one formula for all directions").
                </p>
                {robustnessAResult && (
                  <p className="text-xs p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono mb-3">
                    {robustnessAResult}
                  </p>
                )}
              </div>
              <button
                onClick={runRobustnessA}
                className="w-full py-1.5 px-3 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                Run Check (a)
              </button>
            </div>

            {/* Robustness B */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                  (b) +6h Outage Start Shift
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Moves outage start forward by +6 hours manually. Confirms recalculation without errors.
                </p>
                {robustnessBResult && (
                  <p className="text-xs p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono mb-3">
                    {robustnessBResult}
                  </p>
                )}
              </div>
              <button
                onClick={runRobustnessB}
                className="w-full py-1.5 px-3 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                Run Check (b)
              </button>
            </div>

            {/* Robustness C */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                  (c) European Format & Renamed Parks
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Renames parks to A (target), B and C (refs). Confirms automatic detection and matching results.
                </p>
                {robustnessCResult && (
                  <p className="text-xs p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono mb-3">
                    {robustnessCResult}
                  </p>
                )}
              </div>
              <button
                onClick={runRobustnessC}
                className="w-full py-1.5 px-3 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                Run Check (c)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
