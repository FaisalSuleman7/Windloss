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
import { EngineResult, TrainingDataOption, Grid } from '../../engine';
import { COLORS } from '../../utils/colors';

interface Step3OutageProps {
  result: EngineResult;
  onUpdateOptions: (
    manualOutage?: { targetPark: string; startIndex: number; endIndex: number },
    trainingOption?: TrainingDataOption
  ) => void;
  isCalculating: boolean;
}

export const Step3Outage: React.FC<Step3OutageProps> = ({
  result,
  onUpdateOptions,
  isCalculating,
}) => {
  const { grid, outage, report, screening } = result;

  const [startStr, setStartStr] = useState(outage.startDateStr);
  const [endStr, setEndStr] = useState(outage.endDateStr);
  const [selectedPark, setSelectedPark] = useState(outage.targetPark);
  const [activeTraining, setActiveTraining] = useState<TrainingDataOption>(
    (report.trainingOption as TrainingDataOption) || 'all_measured'
  );

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

  // Build chart data around the outage (+/- 48 hours buffer)
  const chartData = useMemo(() => {
    const bufferStamps = 6 * 48; // 48 hours = 288 stamps
    const startIdx = Math.max(0, outage.startIndex - bufferStamps);
    const endIdx = Math.min(grid.nRows - 1, outage.endIndex + bufferStamps);

    const step = Math.max(1, Math.floor((endIdx - startIdx) / 180)); // ~180 sample points for crisp chart
    const data: {
      timestamp: string;
      targetWind: number | null;
      parkH: number | null;
      parkO: number | null;
    }[] = [];

    for (let i = startIdx; i <= endIdx; i += step) {
      const ts = grid.dateStrings[i];
      const targetVal = screening.targetParkMean[i];
      const hVal = screening.parkMeans['H'] ? screening.parkMeans['H'][i] : null;
      const oVal = screening.parkMeans['O'] ? screening.parkMeans['O'][i] : null;

      data.push({
        timestamp: ts,
        targetWind: !Number.isNaN(targetVal) ? Number(targetVal.toFixed(2)) : null,
        parkH: hVal !== null && !Number.isNaN(hVal) ? Number(hVal.toFixed(2)) : null,
        parkO: oVal !== null && !Number.isNaN(oVal) ? Number(oVal.toFixed(2)) : null,
      });
    }

    return data;
  }, [grid, outage, screening]);

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
              disabled={isCalculating}
              className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {grid.parks.map((p) => (
                <option key={p} value={p}>
                  Park {p} ({grid.parkTurbinesMap[p]?.join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
              Start Timestamp (Local)
            </label>
            <input
              type="text"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              disabled={isCalculating}
              placeholder="YYYY-MM-DD HH:MM"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
              End Timestamp (Inclusive)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                disabled={isCalculating}
                placeholder="YYYY-MM-DD HH:MM"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleApplyChange}
                disabled={isCalculating}
                className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Training Data Option */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Training-Data Selection
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                activeTraining === 'all_measured'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="trainingOptionRadio"
                value="all_measured"
                checked={activeTraining === 'all_measured'}
                onChange={() => handleTrainingChange('all_measured')}
                disabled={isCalculating}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  All measured data (Default)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Maximizes training observations using all verified data outside the outage.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                activeTraining === 'before_outage'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="trainingOptionRadio"
                value="before_outage"
                checked={activeTraining === 'before_outage'}
                onChange={() => handleTrainingChange('before_outage')}
                disabled={isCalculating}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Only before the outage
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Restricts regression training strictly to periods before outage start.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Outage Shaded Wind Speed Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Parks Wind Speed Around Outage (Shaded Outage Period #CC79A7)
          </h3>
          <span className="text-xs text-slate-500">
            Shaded interval: {outage.startDateStr} to {outage.endDateStr} ({outage.durationHours.toFixed(1)} h)
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

              {/* Park H line */}
              {screening.parkMeans['H'] && (
                <Line
                  type="monotone"
                  dataKey="parkH"
                  name="Park H Mean (neighbour)"
                  stroke={COLORS.parkH}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={true}
                />
              )}

              {/* Park O line */}
              {screening.parkMeans['O'] && (
                <Line
                  type="monotone"
                  dataKey="parkO"
                  name="Park O Mean (neighbour)"
                  stroke={COLORS.parkO}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={true}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
