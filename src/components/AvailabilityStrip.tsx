import React, { useMemo, useRef, useEffect } from 'react';
import { Grid, OutageInfo } from '../engine';
import { COLORS, getParkColor } from '../utils/colors';

interface AvailabilityStripProps {
  grid: Grid;
  outage: OutageInfo;
}

export const AvailabilityStrip: React.FC<AvailabilityStripProps> = ({ grid, outage }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { turbines, nRows, windSpeed, dateStrings } = grid;

  // Render availability matrix to canvas for optimal rendering speed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const nTurbines = turbines.length;
    const rowHeight = (height - 30) / nTurbines; // bottom 30px for time axis
    const colWidth = width / nRows;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Number of horizontal sampling bins (e.g. 400 bins across grid)
    const bins = Math.min(width, 600);
    const step = Math.max(1, Math.floor(nRows / bins));

    // Draw availability blocks per turbine
    for (let tIdx = 0; tIdx < nTurbines; tIdx++) {
      const tName = turbines[tIdx];
      const ws = windSpeed[tName];
      const y = tIdx * rowHeight;
      const park = grid.turbineParkMap[tName];
      const parkColor = getParkColor(park);

      for (let b = 0; b < bins; b++) {
        const rowStart = b * step;
        const rowEnd = Math.min(nRows, (b + 1) * step);
        const x = (rowStart / nRows) * width;
        const w = Math.max(1, (step / nRows) * width);

        let validCount = 0;
        let totalCount = 0;
        for (let r = rowStart; r < rowEnd; r++) {
          totalCount++;
          if (!Number.isNaN(ws[r])) validCount++;
        }

        const isAvailable = totalCount > 0 && validCount / totalCount >= 0.5;

        ctx.fillStyle = isAvailable ? parkColor : COLORS.outage;
        ctx.fillRect(x, y + 1, w, rowHeight - 2);
      }
    }

    // Draw shaded outage bracket on all rows
    const outageXStart = (outage.startIndex / nRows) * width;
    const outageXWidth = ((outage.endIndex - outage.startIndex + 1) / nRows) * width;

    ctx.strokeStyle = COLORS.outage;
    ctx.lineWidth = 2;
    ctx.strokeRect(outageXStart, 0, Math.max(2, outageXWidth), nTurbines * rowHeight);

    // Bottom time axis ticks
    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    ctx.fillText(dateStrings[0] || '', 4, height - 8);
    ctx.fillText(outage.startDateStr, Math.max(10, outageXStart - 20), height - 8);
    ctx.fillText(dateStrings[nRows - 1] || '', width - 110, height - 8);
  }, [grid, outage, turbines, nRows, windSpeed, dateStrings]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-1">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Timeline Data Availability (10-minute intervals)
        </span>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: COLORS.target }} />
            <span>Target Park T</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: COLORS.parkH }} />
            <span>Ref Park H</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: COLORS.parkO }} />
            <span>Ref Park O</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: COLORS.outage }} />
            <span>Missing / Outage (Pink)</span>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white shadow-xs">
        <div className="grid grid-cols-[80px_1fr] items-center">
          {/* Turbine labels column */}
          <div className="border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 py-1">
            {turbines.map((tName) => (
              <div
                key={tName}
                className="h-[22px] flex items-center px-2 text-xs font-mono font-medium text-slate-700 dark:text-slate-300"
              >
                {tName}
              </div>
            ))}
            <div className="h-[30px] flex items-center px-2 text-[10px] text-slate-400 font-sans">
              Time
            </div>
          </div>

          {/* Canvas strip */}
          <div className="overflow-x-auto">
            <canvas
              ref={canvasRef}
              width={800}
              height={turbines.length * 22 + 30}
              className="w-full h-auto block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
