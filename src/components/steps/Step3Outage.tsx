import React, { useMemo, useState } from 'react';
import {
  CalendarX,
  Settings2,
  Calendar,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import { EngineResult, TrainingDataOption } from '../../engine';
import { COLORS, makeParkColors } from '../../utils/colors';
import { DensityToggle } from '../DensityToggle';

interface Step3OutageProps {
  result: EngineResult;
  onUpdateOptions: (
    manualOutage?: { targetPark: string; startIndex: number; endIndex: number },
    trainingOption?: TrainingDataOption
  ) => void;
  isCalculating: boolean;
  useDensity?: boolean;
  onToggleDensity?: (useDensity: boolean) => void;
}

export const Step3Outage: React.FC<Step3OutageProps> = ({
  result,
  onUpdateOptions,
  isCalculating,
  useDensity = false,
  onToggleDensity,
}) => {
  const { grid, outage, report, screening } = result;

  const [startStr, setStartStr] = useState(outage.startDateStr);
  const [endStr, setEndStr] = useState(outage.endDateStr);
  const [selectedPark, setSelectedPark] = useState(outage.targetPark);
  const [activeTraining, setActiveTraining] = useState<TrainingDataOption>(
    (report.trainingOption as TrainingDataOption) || 'all_measured'
  );

  const refParkNames = useMemo(() => {
    return Object.keys(screening.parkMeans).sort();
  }, [screening.parkMeans]);

  const parkColor = useMemo(() => {
    return makeParkColors(refParkNames, outage.targetPark);
  }, [refParkNames, outage.targetPark]);

  const handleApplyChange = () => {
    let sIdx = 0;
    let eIdx = grid.nRows - 1;

    for (let i = 0; i < grid.nRows; i++) {
      if (grid.dateStrings[i] <= startStr) sIdx = i;
      if (grid.dateStrings[i] <= endStr) eIdx = i;
    }

    if (eIdx <= sIdx) {
      alert('End timestamp must be strictly after start timestamp.');
      return;
    }

    onUpdateOptions(
      { targetPark: selectedPark, startIndex: sIdx, endIndex: eIdx },
      activeTraining
    );
  };

  const handleTrainingChange = (opt: TrainingDataOption) => {
    setActiveTraining(opt);
    onUpdateOptions(undefined, opt);
  };

  // Build chart data around the outage (+/- 48 hours buffer) with step = 1
  const chartData = useMemo(() => {
    const bufferStamps = 6 * 48; // 48 hours = 288 stamps
    const startIdx = Math.max(0, outage.startIndex - bufferStamps);
    const endIdx = Math.min(grid.nRows - 1, outage.endIndex + bufferStamps);

    const step = 1; // plot every stamp (step = 1)
    const data: Record<string, any>[] = [];

    for (let i = startIdx; i <= endIdx; i += step) {
      const ts = grid.dateStrings[i];
      const targetVal = screening.targetParkMean[i];
      const entry: Record<string, any> = {
        timestamp: ts,
        targetWind: !Number.isNaN(targetVal) ? Number(targetVal.toFixed(2)) : null,
      };

      for (const p of refParkNames) {
        const series = screening.parkMeans[p];
        const val = series ? series[i] : null;
        entry[`park_${p}`] = val !== null && !Number.isNaN(val) ? Number(val.toFixed(2)) : null;
      }

      data.push(entry);
    }

    return data;
  }, [grid, outage, screening, refParkNames]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CalendarX className="w-5 h-5 text-blue-600" />
            <span>Step 3 &bull; Outage Detection & Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automatic identification of the longest consecutive period (≥6 h) where target park turbines were down and neighbouring parks were active.
          </p>
        </div>
      </div>

      {/* Outage Configuration Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Outage Parameters & Boundaries (Editable)
            </h3>
          </div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {outage.durationHours.toFixed(1)} h &bull; {outage.stampsCount.toLocaleString('en-US')} stamps
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
              Target Park
            </label>
            <select
              value={selectedPark}
              onChange={(e) => setSelectedPark(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            >
              {Array.from(new Set(Object.values(grid.turbineParkMap))).map((p) => (
                <option key={p} value={p}>
                  Park {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
              Outage Start
            </label>
            <input
              type="text"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
              Outage End
            </label>
            <input
              type="text"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Affected Turbines: <strong className="text-slate-800 dark:text-slate-200">{outage.targetTurbines.join(', ')}</strong>
          </div>
          <button
            onClick={handleApplyChange}
            disabled={isCalculating}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isCalculating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Recalculating...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply & Re-estimate Outage</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Training Data Option Radio Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Training Data Selection
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select which historical data periods are utilized to fit model coefficients.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1 */}
          <div
            onClick={() => handleTrainingChange('all_measured')}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              activeTraining === 'all_measured'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                All measured data
              </span>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  activeTraining === 'all_measured'
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-400'
                }`}
              >
                {activeTraining === 'all_measured' && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Default. Maximum statistical power across all non-outage periods.
            </p>
          </div>

          {/* Option 2 */}
          <div
            onClick={() => handleTrainingChange('before_outage')}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              activeTraining === 'before_outage'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Data before outage only
              </span>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  activeTraining === 'before_outage'
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-400'
                }`}
              >
                {activeTraining === 'before_outage' && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Uses only measured timestamps strictly preceding the detected outage interval.
            </p>
          </div>
        </div>
      </div>

      {/* Air Density Selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-wider uppercase text-xs">
            AIR DENSITY (TEMPERATURE &amp; PRESSURE)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose whether headline energy loss numbers reflect standard density (1.225 kg/m³) or site-specific density reconstructed from neighbouring parks.
          </p>
        </div>

        <DensityToggle
          result={result}
          useDensity={useDensity}
          onToggle={onToggleDensity || (() => {})}
        />
      </div>

      {/* Outage Timeline Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Parks Wind Speed Around Outage Window (&plusmn;48 h context)
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {outage.startDateStr} &rarr; {outage.endDateStr}
          </span>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} opacity={0.6} />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12, fill: '#475569' }}
                interval="preserveStartEnd"
                label={{
                  value: 'Timestamp (Local Time)',
                  position: 'insideBottom',
                  offset: -15,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />

              <YAxis
                tick={{ fontSize: 12, fill: '#475569' }}
                label={{
                  value: 'Wind Speed (m/s)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#1E293B',
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />

              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ fontSize: '13px', fontWeight: 600 }}
              />

              {/* Shaded Outage Period */}
              <ReferenceArea
                x1={outage.startDateStr}
                x2={outage.endDateStr}
                fill={COLORS.outage}
                fillOpacity={0.25}
                stroke={COLORS.outage}
                strokeOpacity={0.8}
                label={{
                  value: `Outage (${outage.durationHours.toFixed(1)}h)`,
                  position: 'insideTop',
                  fill: '#831843',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />

              {/* Target Park line */}
              <Line
                type="monotone"
                dataKey="targetWind"
                name={`Target Park ${outage.targetPark} (offline)`}
                stroke={COLORS.target}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />

              {/* Reference Park lines */}
              {refParkNames.map((p) => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={`park_${p}`}
                  name={`Park ${p} mean (neighbour)`}
                  stroke={parkColor(p)}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
