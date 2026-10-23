import React, { useState, useMemo } from 'react';
import { Wind, Eye, EyeOff, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { EngineResult } from '../../engine';
import { COLORS, getTurbineColor } from '../../utils/colors';

interface Step6PredictedWindProps {
  result: EngineResult;
}

export const Step6PredictedWind: React.FC<Step6PredictedWindProps> = ({ result }) => {
  const { report, outage, screening, grid } = result;

  // Active series visibility toggles
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const tName of report.targetTurbines) {
      initial[tName] = true;
    }
    for (const p of report.chosenParks) {
      initial[`Park_${p}`] = true;
    }
    return initial;
  });

  const toggleSeries = (key: string) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Build chart dataset for outage interval
  const chartData = useMemo(() => {
    const stampsCount = outage.stampsCount;
    // We can sample ~120 to 180 points for smooth performance
    const step = Math.max(1, Math.floor(stampsCount / 144));
    const data: Record<string, any>[] = [];

    for (let i = 0; i < stampsCount; i += step) {
      const tau = outage.startIndex + i;
      const ts = report.outageDates[i];
      const entry: Record<string, any> = { timestamp: ts };

      // Target turbines predicted wind
      for (const tName of report.targetTurbines) {
        const est = report.turbines[tName];
        if (est) {
          const ws = est.predictedWindOutage[i];
          entry[tName] = !Number.isNaN(ws) ? Number(ws.toFixed(2)) : null;
        }
      }

      // Reference park means
      for (const p of report.chosenParks) {
        const pSeries = screening.parkMeans[p];
        if (pSeries) {
          const ws = pSeries[tau];
          entry[`Park_${p}`] = !Number.isNaN(ws) ? Number(ws.toFixed(2)) : null;
        }
      }

      data.push(entry);
    }

    return data;
  }, [outage, report, screening]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Wind className="w-5 h-5 text-blue-600" />
            <span>Step 6 &bull; Reconstructed 10-Minute Wind Speeds During Outage</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized predicted wind speeds for each affected turbine throughout the {outage.durationHours.toFixed(1)} h downtime window ({outage.startDateStr} to {outage.endDateStr}).
          </p>
        </div>
      </div>

      {/* Series Toggle Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Layers className="w-4 h-4" />
          <span>Toggle Visible Series (Turbines & Reference Parks)</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Target Turbines */}
          {report.targetTurbines.map((tName, idx) => {
            const isVisible = visibleSeries[tName] !== false;
            const color = getTurbineColor(idx, true);
            return (
              <button
                key={tName}
                onClick={() => toggleSeries(tName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                  isVisible
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-400 dark:border-blue-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: isVisible ? color : '#94A3B8' }}
                />
                <span>Target {tName}</span>
                {isVisible ? <Eye className="w-3.5 h-3.5 ml-1" /> : <EyeOff className="w-3.5 h-3.5 ml-1" />}
              </button>
            );
          })}

          {/* Reference Parks */}
          {report.chosenParks.map((p) => {
            const key = `Park_${p}`;
            const isVisible = visibleSeries[key] !== false;
            const color = p === 'H' ? COLORS.parkH : p === 'O' ? COLORS.parkO : COLORS.navy;
            return (
              <button
                key={key}
                onClick={() => toggleSeries(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                  isVisible
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: isVisible ? color : '#94A3B8' }}
                />
                <span>Neighbour Park {p} (Mean)</span>
                {isVisible ? <Eye className="w-3.5 h-3.5 ml-1" /> : <EyeOff className="w-3.5 h-3.5 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Reconstructed Wind Line Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            10-Minute Wind Speed Trajectory (Projector-Ready View)
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {outage.startDateStr} &rarr; {outage.endDateStr}
          </span>
        </div>

        <div className="h-96 w-full pt-2">
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
                domain={['auto', 'auto']}
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
                formatter={(val: any) => [`${val} m/s`]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ fontSize: '13px', fontWeight: 600 }}
              />

              {/* Target Turbines Lines */}
              {report.targetTurbines.map((tName, idx) => {
                if (visibleSeries[tName] === false) return null;
                const strokeColor = getTurbineColor(idx, true);
                return (
                  <Line
                    key={tName}
                    type="monotone"
                    dataKey={tName}
                    name={`Target ${tName} (Pred)`}
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                );
              })}

              {/* Reference Park Means */}
              {report.chosenParks.map((p) => {
                const key = `Park_${p}`;
                if (visibleSeries[key] === false) return null;
                const color = p === 'H' ? COLORS.parkH : p === 'O' ? COLORS.parkO : COLORS.navy;
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={`Neighbour Park ${p} (Actual)`}
                    stroke={color}
                    strokeWidth={1.8}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
