# Wind Outage Loss Estimator

A browser-based calculation engine and verification app that estimates electricity production loss during wind park communication and grid outages for business-interruption insurance claims.

Runs **100% in the client browser** with no external server, API, or AI/LLM calls. All heavy computation runs off the main thread inside a Web Worker with live progress reporting.

---

## Getting Started

### 1. Installation

Install project dependencies:

```bash
npm install
```

### 2. Development Server

Start the local Vite development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Unit Tests

Run the Vitest test suite covering every engine module:

```bash
npm test
```

To run in watch mode:

```bash
npx vitest
```

---

## Architecture & Calculation Engine (`src/engine/`)

The calculation engine is implemented as pure TypeScript functions in `src/engine/` with **zero React imports**, designed for full reusability and deterministic reproducibility:

1. **`linalg.ts`**:
   - Pearson correlation (pairwise complete)
   - Sample standard deviation ($ddof = 1$)
   - OLS linear regression solved via Cholesky decomposition of normal equations $(X^T X)\beta = X^T y$
   - Percentile calculation using NumPy default linear interpolation
2. **`parse.ts`**:
   - Multi-format ingestion (CSV with `;`, `,`, or `\t`, plus Excel `.xlsx`)
   - Header-based delimiter detection
   - European decimal comma conversion (`5,3` $\rightarrow$ `5.3`)
   - ISO and German day-first (`DD.MM.YYYY`) timestamp parsing to local Berlin wall-clock time
   - 10-minute floor rounding and duplicate timestamp averaging
   - Strict validation ($< 5\%$ readable wind speeds or $> 20\%$ unreadable timestamps trigger explicit named errors)
3. **`grid.ts`**:
   - Common 10-minute time grid from earliest to latest timestamps
   - Aligned `Float64Array` matrices with `NaN` representation for missing data (never converting missing values to 0)
4. **`outage.ts`**:
   - Automatic detection of longest run ($\ge 6\text{ h}$, i.e. 36 stamps) where all park turbines are down and $\ge 50\%$ of other park turbines have values
   - Target park assignment
   - Interactive manual start/end boundary override
   - Training mask generation ("all measured data" vs "only before the outage")
5. **`references.ts`**:
   - Screening of non-target turbines (outage coverage $\ge 50\%$ and Pearson correlation $r \ge 0.50$)
   - Park mean series calculation $Park_P(t)$
   - Circular mean wind direction $\theta(t) = \text{atan2}(\text{mean }\sin, \text{mean }\cos)$ in degrees mod 360
   - Direction sector assignment: $0 = \text{N}$, $1 = \text{E}$, $2 = \text{S}$, $3 = \text{W}$ (or fallback single sector)
6. **`model.ts`**:
   - Optimal lag search $k \in \{-6, \dots, +6\}$ maximizing Pearson $r$ between $Park_P(\tau - k)$ and $v_t(\tau)$
   - Global OLS regression
   - Sector-specific OLS with Bayesian shrinkage blending $w = n_s / (n_s + 300)$
   - Missing reference park feature imputation: $(\sum_{\text{all}} a_P) \cdot (\sum_{\text{present}} a_P X_P / \sum_{\text{present}} a_P) + c$
   - Residual error spread $\sigma_{\text{bin}}$ binned by $\lfloor\hat{v}\rfloor \in [0, 14]$ with $\sigma_{\text{global}}$ fallback
7. **`power.ts`**:
   - Linear interpolation of turbine power curves $P(v)$
   - 21-node Gauss-Hermite numerical integration for expected power:
     $$E[P] = \frac{1}{\sqrt{\pi}} \sum_{i=0}^{20} w_i \cdot P(\max(0, \hat{v} + \sqrt{2}\sigma x_i))$$
   - Energy summation in kWh with exact factor $\text{STEP\_H} = 1/6$
8. **`backtest.ts`**:
   - Sliding window evaluation with window length $L = \text{outage duration}$
   - Step size $L + 12\text{ h}$ and 12 h exclusion buffers
   - Backtest metrics (wind RMSE, power RMSE, $\Delta E\%$)
   - Automatic reference park combination ranking by selection score
9. **`report.ts`**:
   - Final loss estimate and $80\%$ uncertainty intervals:
     $$\left[\frac{E}{1 + d_{90}/100},\; \frac{E}{1 + d_{10}/100}\right]$$
   - Barometric pressure sensitivity analysis using ideal gas law $\rho(t) = (p_{\text{ref}}(t) + \Delta p) \cdot 100 / (287.05 \cdot (T_{\text{ref}}(t) + 273.15))$ and wind speed density correction $v \cdot (\rho / 1.225)^{1/3}$
10. **`worker.ts`**:
    - Dedicated Web Worker for background calculation and live progress reporting

---

## Self-Test Verification Suite

Navigate to the **Self-Test Verification** tab and drop the 13 BayWa demo files (`10 *_data.csv`, `3 *_power_curve.csv`). The page runs the engine with default settings and verifies:

- **Common Grid**: Exactly 13,248 rows
- **Outage Detection**: Target park T, 2026-09-01 00:00 to 2026-09-03 23:50 (72.0 h, exact)
- **Reference Screening**: 7 reference turbines used (exact)
- **Combination Scores**: H+O 8.64 %, H 10.60 %, O 11.69 % ($\pm 0.05$); Chosen: H+O (24 windows exact)
- **Lags**: T1 {H: -2, O: 0}, T2 {H: -3, O: +1}, T3 {H: -2, O: 0} (exact)
- **T1 Coefficients**: N, E, S, W sector coefficients within $\pm 0.002$
- **$\sigma_{\text{global}}$**: T1 1.3028, T2 1.1521, T3 1.1594 ($\pm 0.001$)
- **Predicted Wind**: First 3 outage stamps T1: 8.4187, 8.0881, 8.2920 m/s ($\pm 0.001$)
- **Energy Loss (kWh)**: T1 92,105.2, T2 123,716.9, T3 101,531.7, Park 317,353.8 ($\pm 0.1\%$)
- **Park 80% Range**: 280,181 – 367,170 kWh ($\pm 0.5\%$)
- **Air Density Sensitivity**: $-1.99\%$ ($\pm 0.05$)

Includes interactive tests for all three robustness scenarios:
- **(a)** Missing wind direction columns (falls back cleanly to single sector)
- **(b)** Manual $+6\text{ h}$ outage shift
- **(c)** European format (semicolon, decimal comma, German dates) with renamed parks A, B, C

---

## Features (Update 2 of 3)

### 1. Site Air-Density Option (Bonus Parameters)
- Reconstructs site air density $\rho(t)$ during the outage using barometric pressure and temperature from neighbouring reference parks with barometric altitude offset compensation $\Delta p$.
- Interactive `DensityToggle` component in Step 3 and Step 7 allowing users to toggle between **Standard air density (1.225 kg/m³)** and **Site air density (corrected)**.
- Headline numbers across Energy Loss (Step 7), Claim E-mail (Step 8), and Exports/Audit Report (Step 9) dynamically switch between standard (317,354 kWh) and corrected (311,035 kWh, $-2.0\%$).
- Pure view adapter (`src/utils/view.ts`) ensures the underlying engine calculation remains immutable and unit tests stay green.

### 2. Pre-Model Data Exploration (Step 2)
- **Hourly Means Explorer**: Interactive time-series visualizer across Wind speed (m/s), Wind direction (°), Temperature (°C), and Air pressure (hPa) with outage shading (#CC79A7), park-grouped turbine chips, and circular direction averaging.
- **16-Sector Wind Roses**: Custom SVG compass roses partitioned into 22.5° sectors and stacked by 5 speed bins (0–3, 3–6, 6–9, 9–12, $\ge 12\text{ m/s}$), scaled to a common maximum rounded up to multiples of 4%, with circular average direction dashed vectors (revealing T3's offset vane at 221°).

### 3. Step 9 Comprehensive Exports & A4 Audit Report
- **4 Export Options**:
  1. *Predictions (outage, per turbine)*: 1,296 rows (432 stamps $\times$ 3 turbines) with timestamp, turbine, wind speed, power.
  2. *Predictions (outage, wide + park total)*: 432 rows aligning all turbines with total park power.
  3. *Full period (measured + reconstructed)*: all 13,248 grid rows for each turbine with `in_outage` indicator.
  4. *Summary (per turbine + park)*: turbine lost kWh, mean wind, 80% error bounds, and `power_curve_basis`.
  - Filenames automatically append `_site-density` when site-density mode is active.
- **Formal Print Audit Report**: Optimized for A4 / Letter PDF export via browser print (`window.print()`), with 4 executive KPI cards, per-turbine results, a 720×230 reconstructed wind plot, model parameters and combination scores, measured accuracy metrics, and claim email formulation with `break-inside-avoid` page formatting.

