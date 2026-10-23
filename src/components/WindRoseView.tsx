import React, { useState, useMemo } from 'react';
import { Compass } from 'lucide-react';
import { Grid, OutageInfo } from '../engine';
import { getParkColor, getParkSpeedBinColors } from '../utils/colors';

interface WindRoseViewProps {
  grid: Grid;
  outage: OutageInfo;
}

const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

const SPEED_BINS = [
  { min: 0, max: 3, label: '0–3 m/s' },
  { min: 3, max: 6, label: '3–6 m/s' },
  { min: 6, max: 9, label: '6–9 m/s' },
  { min: 9, max: 12, label: '9–12 m/s' },
  { min: 12, max: Infinity, label: '≥12 m/s' },
];

const GREY_SPEED_RAMP = ['#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#334155'];

interface RoseItemData {
  id: string;
  name: string;
  park: string;
  validCount: number;
  avgDirectionDeg: number;
  // 16 sectors, each having 5 speed bin percentages of total time
  sectors: number[][]; // [sectorIndex][binIndex] = percent of total
  sectorTotals: number[]; // total percent per sector
}

export const WindRoseView: React.FC<WindRoseViewProps> = ({ grid, outage }) => {
  const [mode, setMode] = useState<'park' | 'turbine'>('park');

  // Compute wind roses per turbine
  const turbineRoses = useMemo<RoseItemData[]>(() => {
    return grid.turbines.map((tName) => {
      const p = grid.turbineParkMap[tName] || 'Unknown';
      const dirSeries = grid.windDirection[tName];
      const speedSeries = grid.windSpeed[tName];

      const counts: number[][] = Array.from({ length: 16 }, () => new Array(5).fill(0));
      let validCount = 0;
      let sumSin = 0;
      let sumCos = 0;

      for (let i = 0; i < grid.nRows; i++) {
        const d = dirSeries ? dirSeries[i] : NaN;
        const s = speedSeries ? speedSeries[i] : NaN;

        if (!Number.isNaN(d) && !Number.isNaN(s) && s >= 0) {
          validCount++;
          const rad = (d * Math.PI) / 180;
          sumSin += Math.sin(rad);
          sumCos += Math.cos(rad);

          // Sector index: 0 is North (-11.25 to +11.25)
          const normDeg = ((d % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normDeg + 11.25) % 360) / 22.5);

          // Speed bin index
          let binIdx = 0;
          if (s >= 12) binIdx = 4;
          else if (s >= 9) binIdx = 3;
          else if (s >= 6) binIdx = 2;
          else if (s >= 3) binIdx = 1;
          else binIdx = 0;

          counts[sectorIdx][binIdx]++;
        }
      }

      let avgDeg = 0;
      if (validCount > 0) {
        avgDeg = (Math.atan2(sumSin / validCount, sumCos / validCount) * 180) / Math.PI;
        avgDeg = ((avgDeg % 360) + 360) % 360;
      }

      const sectors: number[][] = Array.from({ length: 16 }, () => new Array(5).fill(0));
      const sectorTotals: number[] = new Array(16).fill(0);

      if (validCount > 0) {
        for (let sec = 0; sec < 16; sec++) {
          let sTot = 0;
          for (let b = 0; b < 5; b++) {
            const pct = (counts[sec][b] / validCount) * 100;
            sectors[sec][b] = pct;
            sTot += pct;
          }
          sectorTotals[sec] = sTot;
        }
      }

      return {
        id: tName,
        name: `Turbine ${tName}`,
        park: p,
        validCount,
        avgDirectionDeg: Math.round(avgDeg),
        sectors,
        sectorTotals,
      };
    });
  }, [grid]);

  // Compute wind roses per park (pooling all turbines in that park)
  const parkRoses = useMemo<RoseItemData[]>(() => {
    const parks = Array.from(new Set(Object.values(grid.turbineParkMap))).sort();

    return parks.map((p) => {
      const turbinesInP = grid.turbines.filter((t) => grid.turbineParkMap[t] === p);
      const counts: number[][] = Array.from({ length: 16 }, () => new Array(5).fill(0));
      let validCount = 0;
      let sumSin = 0;
      let sumCos = 0;

      for (const tName of turbinesInP) {
        const dirSeries = grid.windDirection[tName];
        const speedSeries = grid.windSpeed[tName];

        for (let i = 0; i < grid.nRows; i++) {
          const d = dirSeries ? dirSeries[i] : NaN;
          const s = speedSeries ? speedSeries[i] : NaN;

          if (!Number.isNaN(d) && !Number.isNaN(s) && s >= 0) {
            validCount++;
            const rad = (d * Math.PI) / 180;
            sumSin += Math.sin(rad);
            sumCos += Math.cos(rad);

            const normDeg = ((d % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normDeg + 11.25) % 360) / 22.5);

            let binIdx = 0;
            if (s >= 12) binIdx = 4;
            else if (s >= 9) binIdx = 3;
            else if (s >= 6) binIdx = 2;
            else if (s >= 3) binIdx = 1;
            else binIdx = 0;

            counts[sectorIdx][binIdx]++;
          }
        }
      }

      let avgDeg = 0;
      if (validCount > 0) {
        avgDeg = (Math.atan2(sumSin / validCount, sumCos / validCount) * 180) / Math.PI;
        avgDeg = ((avgDeg % 360) + 360) % 360;
      }

      const sectors: number[][] = Array.from({ length: 16 }, () => new Array(5).fill(0));
      const sectorTotals: number[] = new Array(16).fill(0);

      if (validCount > 0) {
        for (let sec = 0; sec < 16; sec++) {
          let sTot = 0;
          for (let b = 0; b < 5; b++) {
            const pct = (counts[sec][b] / validCount) * 100;
            sectors[sec][b] = pct;
            sTot += pct;
          }
          sectorTotals[sec] = sTot;
        }
      }

      const isTarget = p === outage.targetPark;

      return {
        id: p,
        name: `Park ${p}${isTarget ? ' (target)' : ''}`,
        park: p,
        validCount,
        avgDirectionDeg: Math.round(avgDeg),
        sectors,
        sectorTotals,
      };
    });
  }, [grid, outage.targetPark]);

  // Keep the same 20% outer ring for all roses as specified
  const commonMaxPercent = 20;

  const activeRoses = mode === 'park' ? parkRoses : turbineRoses;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Title & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Wind roses: where the wind comes from (share of time)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Directional distribution partitioned into 16 sectors (22.5° each), stacked by speed bins.
          </p>
        </div>

        {/* Per park | Per turbine toggle */}
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('park')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'park'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Per park
          </button>
          <button
            type="button"
            onClick={() => setMode('turbine')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'turbine'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Per turbine
          </button>
        </div>
      </div>

      {/* Speed Bin Legend: neutral grey ramp */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/70">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {GREY_SPEED_RAMP.map((color, idx) => (
              <span
                key={idx}
                className="w-4 h-4 rounded-xs border border-slate-300 dark:border-slate-600 inline-block"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="font-mono text-slate-700 dark:text-slate-300 font-medium text-xs">
            0-3, 3-6, 6-9, 9-12, &gt;=12 m/s - darker = faster
          </span>
        </div>
      </div>

      {/* Grid of Wind Roses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {activeRoses.map((rose) => (
          <WindRoseSVG
            key={rose.id}
            data={rose}
            maxPercent={commonMaxPercent}
            parkColor={getParkColor(rose.park)}
          />
        ))}
      </div>

      {/* Note under wind roses */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <strong>All roses use the same scale ({commonMaxPercent}% outer ring).</strong> If one turbine's rose is turned compared with its neighbours, its wind vane is probably not aligned to north; this is why the method takes the direction from the average of the reference turbines.
      </div>
    </div>
  );
};

interface WindRoseSVGProps {
  data: RoseItemData;
  maxPercent: number;
  parkColor: string;
}

function WindRoseSVG({ data, maxPercent, parkColor }: WindRoseSVGProps) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const R = 90; // maximum radius in px

  const { avgDirectionDeg, validCount, sectors, name } = data;

  const binColors = useMemo(
    () => getParkSpeedBinColors(data.park, parkColor),
    [data.park, parkColor]
  );

  // 4 Concentric circles (1/4, 2/4, 3/4, 4/4)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // End point of circular mean dashed line
  const radAvg = (avgDirectionDeg * Math.PI) / 180;
  const xAvgEnd = cx + R * Math.sin(radAvg);
  const yAvgEnd = cy - R * Math.cos(radAvg);

  return (
    <div className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-[280px]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none"
      >
        {/* Background concentric rings */}
        {rings.map((factor, idx) => {
          const rRing = R * factor;
          const labelVal = Math.round(factor * maxPercent);
          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r={rRing}
                fill="none"
                stroke="#E2E8F0"
                strokeDasharray="2 3"
                strokeWidth={1}
                className="dark:stroke-slate-800"
              />
              {/* Ring percentage label */}
              <text
                x={cx}
                y={cy - rRing + 8}
                fontSize="8"
                fontWeight="500"
                fill="#94A3B8"
                textAnchor="middle"
              >
                {labelVal}%
              </text>
            </g>
          );
        })}

        {/* 16 Radial grid lines */}
        {Array.from({ length: 8 }).map((_, i) => {
          const ang = (i * 22.5 * Math.PI) / 180;
          const x1 = cx + R * Math.sin(ang);
          const y1 = cy - R * Math.cos(ang);
          const x2 = cx - R * Math.sin(ang);
          const y2 = cy + R * Math.cos(ang);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#F1F5F9"
              strokeWidth={1}
              className="dark:stroke-slate-800/60"
            />
          );
        })}

        {/* Stacked Wedges for 16 sectors */}
        {sectors.map((binPcts, secIdx) => {
          const centerAngle = secIdx * 22.5;
          const startAngle = centerAngle - 11.25;
          const endAngle = centerAngle + 11.25;
          const secName = COMPASS_16[secIdx];

          let cumPercent = 0;

          return binPcts.map((pct, binIdx) => {
            if (pct <= 0) return null;

            const rInner = (cumPercent / maxPercent) * R;
            cumPercent += pct;
            const rOuter = (cumPercent / maxPercent) * R;

            const radStart = (startAngle * Math.PI) / 180;
            const radEnd = (endAngle * Math.PI) / 180;

            const x1 = cx + rOuter * Math.sin(radStart);
            const y1 = cy - rOuter * Math.cos(radStart);
            const x2 = cx + rOuter * Math.sin(radEnd);
            const y2 = cy - rOuter * Math.cos(radEnd);
            const x3 = cx + rInner * Math.sin(radEnd);
            const y3 = cy - rInner * Math.cos(radEnd);
            const x4 = cx + rInner * Math.sin(radStart);
            const y4 = cy - rInner * Math.cos(radStart);

            const pathD =
              rInner === 0
                ? `M ${cx} ${cy} L ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} Z`
                : `M ${x4} ${y4} L ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;

            const binLabel = SPEED_BINS[binIdx].label;
            const binColor = binColors[binIdx];

            return (
              <path
                key={binIdx}
                d={pathD}
                fill={binColor}
                stroke="#FFFFFF"
                strokeWidth={0.5}
                className="transition-opacity hover:opacity-80"
              >
                <title>{`${secName}, ${binLabel}: ${pct.toFixed(1)} % of time`}</title>
              </path>
            );
          });
        })}

        {/* Compass Cardinal Labels */}
        <text
          x={cx}
          y={cy - R - 6}
          fontSize="11"
          fontWeight="bold"
          fill="#475569"
          textAnchor="middle"
          className="dark:fill-slate-300"
        >
          N
        </text>
        <text
          x={cx}
          y={cy + R + 14}
          fontSize="11"
          fontWeight="bold"
          fill="#475569"
          textAnchor="middle"
          className="dark:fill-slate-300"
        >
          S
        </text>
        <text
          x={cx + R + 12}
          y={cy + 4}
          fontSize="11"
          fontWeight="bold"
          fill="#475569"
          textAnchor="start"
          className="dark:fill-slate-300"
        >
          E
        </text>
        <text
          x={cx - R - 12}
          y={cy + 4}
          fontSize="11"
          fontWeight="bold"
          fill="#475569"
          textAnchor="end"
          className="dark:fill-slate-300"
        >
          W
        </text>

        {/* Dashed line for average direction in park colour */}
        {validCount > 0 && (
          <line
            x1={cx}
            y1={cy}
            x2={xAvgEnd}
            y2={yAvgEnd}
            stroke={parkColor}
            strokeWidth={2.5}
            strokeDasharray="4 3"
          >
            <title>{`Average direction: ${avgDirectionDeg}°`}</title>
          </line>
        )}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={2} fill="#1E293B" className="dark:fill-slate-200" />
      </svg>

      {/* Description below rose */}
      <div className="mt-2 text-center">
        <div className="font-bold text-xs text-slate-900 dark:text-white">{name}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          average direction {avgDirectionDeg}° &bull; {validCount.toLocaleString('en-US')} values
        </div>
      </div>
    </div>
  );
}
