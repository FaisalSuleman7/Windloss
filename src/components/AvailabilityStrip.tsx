import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Grid, OutageInfo } from '../engine';
import { COLORS, makeParkColors } from '../utils/colors';

interface AvailabilityStripProps {
  grid: Grid;
  outage: OutageInfo;
}

export const AvailabilityStrip: React.FC<AvailabilityStripProps> = ({ grid, outage }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  const { turbines, nRows, windSpeed, timestamps, turbineParkMap } = grid;

  // Reference parks present in dataset
  const allParks = useMemo(() => {
    return Array.from(new Set(Object.values(turbineParkMap))).sort();
  }, [turbineParkMap]);

  const refParks = useMemo(() => {
    return allParks.filter((p) => p !== outage.targetPark);
  }, [allParks, outage.targetPark]);

  const parkColor = useMemo(() => {
    return makeParkColors(allParks, outage.targetPark);
  }, [allParks, outage.targetPark]);

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });

    observer.observe(el);
    if (el.clientWidth > 0) {
      setContainerWidth(el.clientWidth);
    }

    return () => observer.disconnect();
  }, []);

  // Format timestamp helper: MM-DD HH:MM
  const formatMMDDHHMM = (epochMs: number): string => {
    if (Number.isNaN(epochMs)) return '';
    const d = new Date(epochMs);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${min}`;
  };

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labelColWidth = 56;
    const rowHeight = 24;
    const timeAxisHeight = 28;
    const totalHeight = turbines.length * rowHeight + timeAxisHeight;
    const width = Math.max(300, containerWidth);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(totalHeight * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${totalHeight}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalHeight);

    // Label column background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, labelColWidth, turbines.length * rowHeight);

    // Vertical divider after labels
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(labelColWidth - 0.5, 0);
    ctx.lineTo(labelColWidth - 0.5, totalHeight);
    ctx.stroke();

    const dataX = labelColWidth;
    const dataW = Math.max(1, width - labelColWidth);

    // Draw availability blocks per turbine
    for (let tIdx = 0; tIdx < turbines.length; tIdx++) {
      const tName = turbines[tIdx];
      const y = tIdx * rowHeight;
      const isTarget =
        outage.targetTurbines.includes(tName) || tName.startsWith(outage.targetPark);
      const ws = windSpeed[tName];
      const pColor = parkColor(turbineParkMap[tName] || 'UNKNOWN');

      // Turbine label inside canvas
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = isTarget ? '#0072B2' : '#334155';
      ctx.fillText(tName, 8, y + 16);

      // Horizontal subtle line
      ctx.strokeStyle = '#F1F5F9';
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight - 0.5);
      ctx.lineTo(width, y + rowHeight - 0.5);
      ctx.stroke();

      // One block per pixel column
      for (let px = 0; px < dataW; px++) {
        const sStart = Math.floor((px / dataW) * nRows);
        const sEnd = Math.max(sStart + 1, Math.floor(((px + 1) / dataW) * nRows));

        let validCount = 0;
        let totalCount = 0;
        for (let r = sStart; r < sEnd && r < nRows; r++) {
          totalCount++;
          if (!Number.isNaN(ws[r])) {
            validCount++;
          }
        }

        const isMeasured = totalCount > 0 && validCount / totalCount >= 0.5;
        ctx.fillStyle = isMeasured ? pColor : '#CC79A7'; // pink if missing
        ctx.fillRect(dataX + px, y + 1, 1, rowHeight - 2);
      }
    }

    // #9D174D frame around the outage
    const outagePxStart = dataX + (outage.startIndex / nRows) * dataW;
    const outagePxEnd = dataX + ((outage.endIndex + 1) / nRows) * dataW;
    const outagePxW = Math.max(2, outagePxEnd - outagePxStart);

    ctx.strokeStyle = '#9D174D';
    ctx.lineWidth = 2;
    ctx.strokeRect(outagePxStart, 0, outagePxW, turbines.length * rowHeight);

    // Bottom time axis
    const axisY = turbines.length * rowHeight;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY + 0.5);
    ctx.lineTo(width, axisY + 0.5);
    ctx.stroke();

    // Time label on left
    ctx.fillStyle = '#64748B';
    ctx.font = '10px sans-serif';
    ctx.fillText('Time', 8, axisY + 18);

    // First day of each month
    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    let prevMonth = -1;
    for (let r = 0; r < nRows; r += 72) {
      const d = new Date(timestamps[r]);
      const m = d.getUTCMonth();
      if (m !== prevMonth) {
        prevMonth = m;
        const x = dataX + (r / nRows) * dataW;
        ctx.strokeStyle = '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(x + 0.5, axisY);
        ctx.lineTo(x + 0.5, axisY + 5);
        ctx.stroke();

        const monthName = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        ctx.fillText(`${monthName} 1`, x + 2, axisY + 16);
      }
    }

    // Text: outage MM-DD HH:MM → MM-DD HH:MM
    const outageStartMs = timestamps[outage.startIndex];
    const outageEndMs = timestamps[outage.endIndex];
    const outageText = `outage ${formatMMDDHHMM(outageStartMs)} → ${formatMMDDHHMM(outageEndMs)}`;

    ctx.font = 'bold 10px monospace';
    const textWidth = ctx.measureText(outageText).width;
    const textX = Math.max(dataX + 4, Math.min(width - textWidth - 6, outagePxStart));
    ctx.fillStyle = '#9D174D';
    ctx.fillText(outageText, textX, axisY + 25);

    ctx.restore();
  }, [containerWidth, turbines, nRows, windSpeed, timestamps, turbineParkMap, outage, parkColor]);

  return (
    <div className="space-y-3">
      {/* Dynamic Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2 pb-1">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Timeline Data Availability (10-minute intervals)
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {/* Target park */}
          <div className="flex items-center space-x-1.5">
            <span
              className="w-3 h-3 rounded-xs"
              style={{ backgroundColor: parkColor(outage.targetPark) }}
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Target park {outage.targetPark}
            </span>
          </div>

          {/* Reference parks */}
          {refParks.map((p) => (
            <div key={p} className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: parkColor(p) }} />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Reference park {p}
              </span>
            </div>
          ))}

          {/* Missing */}
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#CC79A7' }} />
            <span className="font-medium text-slate-700 dark:text-slate-300">Missing</span>
          </div>
        </div>
      </div>

      {/* Canvas container with ResizeObserver */}
      <div
        ref={containerRef}
        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white shadow-xs"
      >
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
};
