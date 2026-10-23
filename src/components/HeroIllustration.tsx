import React from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

interface TurbineProps {
  x: number;
  base: number;
  h: number;
  color: string;
  spin?: boolean;
  dur?: number;
  phase?: number;
}

const Turbine: React.FC<TurbineProps> = ({
  x,
  base,
  h,
  color,
  spin,
  dur = 3.2,
  phase = 0,
}) => {
  const hubY = base - h;
  const L = h * 0.52;
  const blade = `M0,0 C ${L * 0.07},${-L * 0.3} ${L * 0.05},${-L * 0.82} 0,${-L} C ${-L * 0.035},${-L * 0.8} ${-L * 0.06},${-L * 0.3} 0,0 Z`;

  return (
    <g>
      {/* Tapered tower */}
      <polygon
        points={`${x - h * 0.028},${base} ${x + h * 0.028},${base} ${x + h * 0.012},${hubY} ${x - h * 0.012},${hubY}`}
        fill="#E2E8F0"
        stroke="#CBD5E1"
        strokeWidth="0.6"
      />
      {/* Nacelle */}
      <rect
        x={x - h * 0.02}
        y={hubY - h * 0.03}
        width={h * 0.09}
        height={h * 0.055}
        rx={h * 0.02}
        fill="#F1F5F9"
        stroke="#CBD5E1"
        strokeWidth="0.6"
      />
      {/* Rotor hub and 3 blades */}
      <g transform={`translate(${x},${hubY})`}>
        <g transform={`rotate(${phase})`}>
          {spin && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`${phase}`}
              to={`${phase + 360}`}
              dur={`${dur}s`}
              repeatCount="indefinite"
            />
          )}
          {[0, 120, 240].map((a) => (
            <path
              key={a}
              d={blade}
              transform={`rotate(${a})`}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth="1.1"
            />
          ))}
        </g>
        <circle r={h * 0.028} fill={color} />
      </g>
    </g>
  );
};

export const HeroIllustration: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Main SVG Hero Canvas */}
      <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-b from-sky-50 via-white to-sky-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950">
        <svg
          viewBox="0 0 900 300"
          className="w-full h-auto block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Linear gradient for soft pale hills */}
            <linearGradient id="hillBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="hillGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E6F6F1" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#DCFCE7" stopOpacity="0.6" />
            </linearGradient>

            {/* Navy arrow head marker */}
            <marker
              id="arrowNavy"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 7 3.5, 0 7, 2 3.5" fill="#1E3A8A" />
            </marker>
          </defs>

          {/* Three drifting wind lines with staggered CSS animation delays */}
          <g>
            <path
              d="M 20,48 Q 230,36 450,48 T 880,48"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="wind-line"
              style={{ animationDelay: '0s' }}
            />
            <path
              d="M 30,86 Q 260,74 480,86 T 870,86"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="wind-line"
              style={{ animationDelay: '1.35s' }}
            />
            <path
              d="M 15,124 Q 240,110 460,124 T 885,124"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="wind-line"
              style={{ animationDelay: '2.7s' }}
            />
          </g>

          {/* Two soft hills at the bottom */}
          <path
            d="M -20,300 L -20,230 Q 220,185 460,225 T 920,220 L 920,300 Z"
            fill="url(#hillBlue)"
          />
          <path
            d="M -20,300 L -20,240 Q 280,205 520,235 T 920,230 L 920,300 Z"
            fill="url(#hillGreen)"
          />

          {/* Ground baseline */}
          <line
            x1="0"
            y1="254"
            x2="900"
            y2="254"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />

          {/* Neighbour park H (left, spinning, #E69F00) */}
          <Turbine x={70} base={248} h={118} color="#E69F00" spin={true} dur={3.4} phase={0} />
          <Turbine x={150} base={244} h={102} color="#E69F00" spin={true} dur={3.0} phase={40} />
          <Turbine x={222} base={246} h={110} color="#E69F00" spin={true} dur={3.7} phase={80} />

          {/* Target park (centre, NOT spinning, #0072B2) */}
          <Turbine x={395} base={240} h={128} color="#0072B2" spin={false} phase={15} />
          <Turbine x={470} base={238} h={114} color="#0072B2" spin={false} phase={60} />
          <Turbine x={540} base={240} h={122} color="#0072B2" spin={false} phase={100} />

          {/* Neighbour park O (right, spinning, #009E73) */}
          <Turbine x={720} base={242} h={108} color="#009E73" spin={true} dur={3.2} phase={20} />
          <Turbine x={800} base={246} h={118} color="#009E73" spin={true} dur={3.6} phase={70} />

          {/* Two dashed navy curved arrows from neighbour parks to target park */}
          <path
            d="M245,150 C 290,122 330,122 365,138"
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="2.2"
            strokeDasharray="5,4"
            markerEnd="url(#arrowNavy)"
          />
          <text
            x="305"
            y="116"
            textAnchor="middle"
            fill="#1E3A8A"
            fontSize="12"
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            rebuild its wind
          </text>

          <path
            d="M690,150 C 645,122 605,122 572,138"
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="2.2"
            strokeDasharray="5,4"
            markerEnd="url(#arrowNavy)"
          />
          <text
            x="632"
            y="116"
            textAnchor="middle"
            fill="#1E3A8A"
            fontSize="12"
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            from the neighbours
          </text>

          {/* Pulsing badge "no data · offline" at x 410, y 10, w 120, h 26 */}
          <motion.g
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect
              x="410"
              y="10"
              width="120"
              height="26"
              rx="13"
              fill="#FCE7F3"
              stroke="#CC79A7"
              strokeWidth="1.2"
            />
            <text
              x="470"
              y="27"
              textAnchor="middle"
              fill="#9D174D"
              fontSize="11"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              no data · offline
            </text>
          </motion.g>

          {/* Pill labels at y 266 (height 26, rx 13) */}
          {/* Neighbour park H */}
          <g>
            <rect
              x="66"
              y="266"
              width="160"
              height="26"
              rx="13"
              fill="#FFF7E6"
              stroke="#E69F00"
              strokeWidth="1.5"
            />
            <text
              x="146"
              y="283"
              textAnchor="middle"
              fill="#B45309"
              fontSize="13"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Neighbour park H
            </text>
          </g>

          {/* Target park (offline) */}
          <g>
            <rect
              x="381"
              y="266"
              width="176"
              height="26"
              rx="13"
              fill="#EAF3FB"
              stroke="#0072B2"
              strokeWidth="1.5"
            />
            <text
              x="469"
              y="283"
              textAnchor="middle"
              fill="#0072B2"
              fontSize="13"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Target park (offline)
            </text>
          </g>

          {/* Neighbour park O */}
          <g>
            <rect
              x="680"
              y="266"
              width="160"
              height="26"
              rx="13"
              fill="#E6F6F1"
              stroke="#009E73"
              strokeWidth="1.5"
            />
            <text
              x="760"
              y="283"
              textAnchor="middle"
              fill="#009E73"
              fontSize="13"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Neighbour park O
            </text>
          </g>
        </svg>
      </div>

      {/* 3 Physical & Financial Principle Cards Below the Illustration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Betz Limit */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-3 cursor-default"
        >
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <Activity className="w-4 h-4 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Betz limit
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              No rotor can capture more than 16/27 ≈ 59.3 % of the wind's power.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '59.3%' }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                className="h-full bg-blue-600 rounded-full"
              />
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-0.5">
              <span>0 %</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">59.3 %</span>
              <span>100 %</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Power grows with v³ */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-2 cursor-default"
        >
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400">
              <Zap className="w-4 h-4 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Power grows with v³
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Below rated power P = ½ ρ A v³: 10 % more wind gives about 33 % more power (1.1³ = 1.33),
              so the wind must be rebuilt carefully.
            </p>
          </div>
          <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
            Cubic sensitivity necessitates direction OLS regressions & Gauss-Hermite integration.
          </div>
        </motion.div>

        {/* Card 3: Insurance claim */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-2 cursor-default"
        >
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Insurance claim
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Business-interruption insurance pays for the energy that could not be produced. The tool
              gives the kWh, an honest range and the e-mail.
            </p>
          </div>
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400/90 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/60">
            Audit-ready formal email with 80% confidence interval and downloadable raw CSV exports.
          </div>
        </motion.div>
      </div>
    </div>
  );
};
