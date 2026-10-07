import { useEffect, useMemo, useState } from "react";
import {
  FOURIER_CUTOFFS,
  FOURIER_MAX_ORDER,
  fourierBasisDiagnostics,
  fourierCoverage,
  fourierCoverageSteps,
  fourierFillSweep,
  type FourierCaseId,
  type FourierCutoff,
  type FourierMode,
  type Settings,
  type Solution,
} from "./physics";

const RESIDUAL_LIMIT = 1e-5;
const W = 740,
  H = 310,
  L = 85,
  T = 25,
  R = 24,
  B = 49;
const fmt = (value: number, digits = 2) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: digits })
    : "—";
const usable = (mode: FourierMode | undefined) =>
  mode &&
  !mode.unstable &&
  Number.isFinite(mode.frequency) &&
  mode.frequency > 0;

function logTicks(min: number, max: number) {
  const ticks: number[] = [];
  for (
    let exponent = Math.floor(Math.log10(min));
    exponent <= Math.ceil(Math.log10(max));
    exponent++
  )
    for (const multiplier of [1, 2, 5]) {
      const value = multiplier * 10 ** exponent;
      if (value >= min && value <= max) ticks.push(value);
    }
  return ticks.length > 7 ? ticks.filter((_, index) => index % 2 === 0) : ticks;
}

function FluidBasisCheck({
  settings,
  n,
  caseId,
}: {
  settings: Settings;
  n: number;
  caseId: FourierCaseId;
}) {
  const [requested, setRequested] = useState(false);
  const [result, setResult] = useState<ReturnType<
    typeof fourierBasisDiagnostics
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!requested) return;
    const timer = setTimeout(() => {
      try {
        setResult(fourierBasisDiagnostics(settings, n, caseId));
      } catch {
        setError(
          "The refined basis could not be solved at this operating point.",
        );
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [requested, settings, n, caseId]);
  return (
    <div className="cryo-fourier-basis">
      <button
        type="button"
        onClick={() => setRequested(true)}
        disabled={requested}
      >
        {requested && !result && !error
          ? "Checking fluid basis…"
          : "Check fluid basis"}
      </button>
      <div aria-live="polite">
        {result ? (
          result.maxResidual > RESIDUAL_LIMIT ||
          !Number.isFinite(result.maxResidual) ? (
            <>
              <strong className="cryo-fourier-warning">
                Numerical solve needs refinement
              </strong>
              <span>
                Relative eigen residual {result.maxResidual.toExponential(1)};
                the basis comparison is unreliable.
              </span>
            </>
          ) : result.matchingAmbiguous ? (
            <>
              <strong className="cryo-fourier-warning">
                Mode correspondence is uncertain
              </strong>
              <span>
                Minimum modal overlap {fmt(result.minMAC * 100, 3)}%; the
                sensitivity comparison needs closer inspection.
              </span>
            </>
          ) : (
            <>
              <strong>4 × 8 → 5 × 10 fluid basis</strong>
              <span>
                Max frequency change{" "}
                {fmt(result.maxFrequencyRelativeDifference * 100, 3)}%{" · "}max
                μ change {fmt(result.maxMassRatioRelativeDifference * 100, 3)}%
              </span>
              <small>
                Minimum modal overlap {fmt(result.minMAC * 100, 3)}% · Relative
                eigen residual {result.maxResidual.toExponential(1)}
              </small>
            </>
          )
        ) : error ? (
          <span>{error}</span>
        ) : (
          <span>
            Compare radial × axial potential terms at the current fill.
          </span>
        )}
        <small>
          This compares the five solved branches at fixed n = {n}; the plots
          display only m = 1. Fluid resolution is separate from angular
          coverage.
        </small>
      </div>
    </div>
  );
}

export default function FourierCoverage({ solution }: { solution: Solution }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(timer);
  }, []);
  return ready ? (
    <FourierCoverageContent solution={solution} />
  ) : (
    <div className="cryo-plot-card cryo-fourier-loading" role="status">
      <span aria-hidden="true" />
      <p>Solving angular families and the selected fill sweep…</p>
    </div>
  );
}

function FourierCoverageContent({ solution }: { solution: Solution }) {
  const [cutoff, setCutoff] = useState<FourierCutoff>(12);
  const [n, setN] = useState(12);
  const [caseId, setCaseId] = useState<FourierCaseId>("mass");
  const [sweepScale, setSweepScale] = useState<"log" | "linear">("log");
  const [minInput, setMinInput] = useState("10");
  const [maxInput, setMaxInput] = useState("2000");
  const minHz = Number(minInput),
    maxHz = Number(maxInput);
  const validBand =
    Number.isFinite(minHz) &&
    Number.isFinite(maxHz) &&
    minHz > 0 &&
    maxHz > minHz;
  const settings = solution.settings;
  const caseLabel =
    caseId === "mass"
      ? "Added mass only"
      : caseId === "pressure"
        ? "Pressure only"
        : "Mass + pressure";
  const operatingColor = caseId === "pressure" ? "#b9d6a5" : "#9cdae3";
  const requestKey = JSON.stringify([
    settings.fluid,
    settings.fill,
    settings.ullagePsi,
    settings.accelerationG,
    cutoff,
    minHz,
    maxHz,
    validBand,
    caseId,
    n,
  ]);
  const [computed, setComputed] = useState<{
    key: string;
    coverage: ReturnType<typeof fourierCoverage> | null;
    sweep: ReturnType<typeof fourierFillSweep>;
    error: string | null;
  } | null>(null);
  const [progress, setProgress] = useState<{
    key: string;
    completed: number;
  } | null>(null);
  const emptySweep = useMemo<ReturnType<typeof fourierFillSweep>>(
    () => ({
      settings,
      n,
      caseId,
      points: [],
      minTrackingMAC: 1,
      trackingAmbiguous: false,
    }),
    [settings, n, caseId],
  );
  useEffect(() => {
    // Yield between angular families so controls remain responsive, and cancel
    // superseded requests without publishing stale chart data.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const steps = validBand
      ? fourierCoverageSteps(settings, {
          cutoff,
          minHz,
          maxHz,
          caseId,
          trackedBranch: 1,
        })
      : null;
    const advance = () => {
      if (cancelled) return;
      try {
        const step = steps?.next();
        if (step && !step.done) {
          setProgress({ key: requestKey, completed: step.value + 1 });
          timer = setTimeout(advance, 0);
          return;
        }
        const nextCoverage = step?.value ?? null;
        const nextSweep = fourierFillSweep(settings, n, caseId, {
          trackedBranch: 1,
        });
        setComputed({
          key: requestKey,
          coverage: nextCoverage,
          sweep: nextSweep,
          error: null,
        });
      } catch {
        setComputed({
          key: requestKey,
          coverage: null,
          sweep: emptySweep,
          error:
            "This operating point could not be solved. Change the fill or operating case to retry.",
        });
      }
    };
    timer = setTimeout(advance, 40);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestKey]);
  const loading = computed?.key !== requestKey;
  const coverage = loading ? null : (computed?.coverage ?? null);
  const sweep = loading ? emptySweep : (computed?.sweep ?? emptySweep);
  const current = sweep.points.find(
    (point) => Math.abs(point.fill - settings.fill) < 1e-9,
  );
  const currentBranch = current?.modes.find((mode) => mode.branch === 1);
  const selectedFamily = coverage?.families.find((family) => family.n === n);
  const firstBranches =
    coverage?.families.map((family) => ({
      family,
      mode: family.modes.find((mode) => mode.branch === 1),
    })) ?? [];
  const inBand = (frequency: number) =>
    frequency >= minHz && frequency <= maxHz;
  const retainedInBand = firstBranches.filter(
    ({ family, mode }) =>
      family.available &&
      family.retained &&
      usable(mode) &&
      inBand(mode!.frequency),
  ).length;
  const aboveCutoffInBand = firstBranches.filter(
    ({ family, mode }) =>
      family.available &&
      !family.retained &&
      usable(mode) &&
      inBand(mode!.frequency),
  ).length;
  const belowBand = firstBranches.filter(
    ({ family, mode }) =>
      family.available && usable(mode) && mode!.frequency < minHz,
  ).length;
  const aboveBand = firstBranches.filter(
    ({ family, mode }) =>
      family.available && usable(mode) && mode!.frequency > maxHz,
  ).length;
  const failedFamilies = firstBranches
    .filter(({ family }) => !family.available)
    .map(({ family }) => family.n);
  const unavailableBranches = firstBranches
    .filter(({ family, mode }) => family.available && !usable(mode))
    .map(({ family }) => family.n);
  const uncertainFamilies = firstBranches
    .filter(({ mode }) => mode?.trackingAmbiguous)
    .map(({ family }) => family.n);
  const incompleteCoverage =
    failedFamilies.length > 0 ||
    unavailableBranches.length > 0 ||
    uncertainFamilies.length > 0 ||
    (coverage !== null &&
      (!Number.isFinite(coverage.maxResidual) ||
        coverage.maxResidual > RESIDUAL_LIMIT));
  const failedFills = sweep.points
    .filter((point) => !point.available)
    .map((point) => point.fill);
  const branches = [1];
  const sweepFrequencies = sweep.points.flatMap((point) =>
    point.modes
      .filter((mode) => mode.branch === 1)
      .flatMap((mode) =>
        usable(mode) ? [mode.frequency, mode.dryFrequency] : [],
      ),
  );
  const sweepMax = Math.max(1, ...sweepFrequencies) * 1.12;
  const sweepMin = sweepFrequencies.length
    ? Math.min(...sweepFrequencies.filter((frequency) => frequency > 0)) / 1.15
    : 1;
  const sx = (fill: number) => L + fill * (W - L - R),
    sy = (frequency: number) =>
      T +
      (1 -
        (sweepScale === "log"
          ? Math.log(frequency / sweepMin) / Math.log(sweepMax / sweepMin)
          : frequency / sweepMax)) *
        (H - T - B);
  const sweepPath = (branch: number) => {
    let connected = false;
    return sweep.points
      .map((point) => {
        const mode = point.modes.find((item) => item.branch === branch);
        if (!usable(mode) || mode!.trackingAmbiguous || !point.available) {
          connected = false;
          return "";
        }
        const segment = `${connected ? "L" : "M"} ${sx(point.fill)} ${sy(mode!.frequency)}`;
        connected = true;
        return segment;
      })
      .join(" ");
  };

  return (
    <div className="cryo-plot-card cryo-fourier">
      <div className="cryo-plot-title">
        <h3>One shell branch across the angular orders.</h3>
        <span>m = 1 / n = 0–20</span>
      </div>
      <p className="cryo-fourier-intro">
        m = 1 is the first tracked dry shell branch in each angular family. Its
        eigenvector mixes five axial trials; higher branches remain in the solve
        and are hidden in this view.
      </p>
      <div className="cryo-fourier-controls">
        <fieldset>
          <legend>Retained angular orders</legend>
          <div className="vl-segment">
            {FOURIER_CUTOFFS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={cutoff === value}
                onClick={() => setCutoff(value)}
              >
                n ≤ {value}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Operating case
          <select
            value={caseId}
            onChange={(event) => setCaseId(event.target.value as FourierCaseId)}
          >
            <option value="mass">Added mass only</option>
            <option value="pressure">Pressure only</option>
            <option value="combined">Mass + pressure</option>
          </select>
        </label>
        <fieldset className="cryo-fourier-band">
          <legend>Frequency band / Hz</legend>
          <div>
            <input
              aria-label="Minimum frequency in Hz"
              type="number"
              min="0.01"
              step="10"
              value={minInput}
              onChange={(event) => setMinInput(event.target.value)}
              aria-invalid={!validBand}
            />
            <span>to</span>
            <input
              aria-label="Maximum frequency in Hz"
              type="number"
              min="0.02"
              step="100"
              value={maxInput}
              onChange={(event) => setMaxInput(event.target.value)}
              aria-invalid={!validBand}
            />
          </div>
        </fieldset>
      </div>
      {loading ? (
        <div className="cryo-fourier-loading" role="status">
          <span aria-hidden="true" />
          <p>
            Solving tracked m = 1 branches and the selected fill sweep…
            {progress?.key === requestKey && (
              <small aria-hidden="true">
                {progress.completed} / {FOURIER_MAX_ORDER + 1} angular families
                solved
              </small>
            )}
          </p>
        </div>
      ) : computed?.error ? (
        <p className="cryo-fourier-invalid" role="status">
          {computed.error}
        </p>
      ) : (
        <>
          {coverage ? (
            <>
              <div
                className={`cryo-fourier-status ${aboveCutoffInBand > 0 || incompleteCoverage ? "has-omissions" : ""}`}
                aria-live="polite"
              >
                <strong>
                  {incompleteCoverage
                    ? `m = 1 check incomplete · ${aboveCutoffInBand} observed in-band branches above n = ${cutoff}`
                    : aboveCutoffInBand > 0
                      ? `${aboveCutoffInBand} m = 1 branches above n = ${cutoff} are in band`
                      : `No additional m = 1 branches in band through n = ${FOURIER_MAX_ORDER}`}
                </strong>
                <span>
                  {retainedInBand} retained m = 1 · {fmt(minHz)}–{fmt(maxHz)} Hz
                </span>
                <small>
                  One cosine representative per n, first tracked dry branch
                  only.
                  {caseId !== "pressure" &&
                    " Partial-fill orders n ≥ 4 use a rigid-surface approximation."}
                  {failedFamilies.length > 0 &&
                    ` Numerical blocks unavailable: n = ${failedFamilies.join(", ")}.`}
                  {unavailableBranches.length > 0 &&
                    ` m = 1 unavailable: n = ${unavailableBranches.join(", ")}${settings.fill === 1 && caseId !== "pressure" ? " (closed-liquid constraint)" : ""}.`}
                  {uncertainFamilies.length > 0 &&
                    ` Uncertain branch identity: n = ${uncertainFamilies.join(", ")}.`}
                  {coverage.maxResidual > RESIDUAL_LIMIT &&
                    " The eigen residual exceeds the numerical quality limit."}
                </small>
              </div>
              <p className="cryo-fourier-band-note">
                Frequencies outside {fmt(minHz)}–{fmt(maxHz)} Hz are hidden:{" "}
                {belowBand} operating m = 1 points below the band and{" "}
                {aboveBand} above it. Higher shell branches can still lie in
                band when m = 1 is hidden.
              </p>
              <svg
                className="cryo-plot cryo-fourier-spectrum"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`First tracked dry shell branch, m equals 1, across circumferential orders zero through twenty. Frequency is on the horizontal logarithmic axis and angular order is on the vertical axis. ${aboveCutoffInBand} operating m equals 1 branches above order ${cutoff} lie between ${minHz} and ${maxHz} Hz. Higher shell branches and frequencies outside this band are hidden.`}
              >
                {(() => {
                  const x = (frequency: number) =>
                    L +
                    (Math.log(frequency / minHz) / Math.log(maxHz / minHz)) *
                      (W - L - R);
                  const y = (order: number) =>
                    T +
                    (1 - (order + 0.5) / (FOURIER_MAX_ORDER + 1)) * (H - T - B);
                  const divider = y(cutoff + 0.5);
                  const candidates = [
                    ...new Set([...logTicks(minHz, maxHz), minHz, maxHz]),
                  ].sort((a, b) => a - b);
                  const ticks = [minHz];
                  for (const frequency of candidates) {
                    if (
                      frequency !== minHz &&
                      frequency !== maxHz &&
                      x(frequency) - x(ticks[ticks.length - 1]) >= 85 &&
                      x(maxHz) - x(frequency) >= 95
                    )
                      ticks.push(frequency);
                  }
                  ticks.push(maxHz);
                  return (
                    <>
                      <rect
                        x={L}
                        y={T}
                        width={W - L - R}
                        height={Math.max(0, divider - T)}
                        fill="#e8be8510"
                      />
                      <line
                        x1={L}
                        x2={W - R}
                        y1={y(n)}
                        y2={y(n)}
                        stroke="#9cdae350"
                        strokeDasharray="2 5"
                      />
                      {ticks.map((frequency) => (
                        <g key={frequency}>
                          <line
                            x1={x(frequency)}
                            x2={x(frequency)}
                            y1={T}
                            y2={H - B}
                            stroke="#adc9cb18"
                          />
                          <text
                            x={x(frequency)}
                            y={H - B + 20}
                            textAnchor={
                              frequency === minHz
                                ? "start"
                                : frequency === maxHz
                                  ? "end"
                                  : "middle"
                            }
                          >
                            {fmt(frequency)}
                          </text>
                        </g>
                      ))}
                      {[0, 4, 8, 12, 16, 20].map((order) => (
                        <g key={order}>
                          <line
                            x1={L}
                            x2={W - R}
                            y1={y(order)}
                            y2={y(order)}
                            stroke="#adc9cb12"
                          />
                          <text x={L - 12} y={y(order) + 4} textAnchor="end">
                            {order}
                          </text>
                        </g>
                      ))}
                      <line
                        x1={L}
                        x2={W - R}
                        y1={divider}
                        y2={divider}
                        stroke="#e8be85"
                        strokeDasharray="5 4"
                      />
                      <text
                        x={W - R - 7}
                        y={divider + 15}
                        textAnchor="end"
                        fill="#e8be85"
                      >
                        n ≤ {cutoff}
                      </text>
                      {firstBranches.map(({ family, mode }) => {
                        const dryFrequency = family.dryFrequencies[0];
                        const dryVisible =
                          Number.isFinite(dryFrequency) && inBand(dryFrequency);
                        const operatingVisible =
                          family.available &&
                          usable(mode) &&
                          inBand(mode!.frequency);
                        const color = family.retained
                          ? operatingColor
                          : "#e8be85";
                        return (
                          <g key={family.n}>
                            {dryVisible && operatingVisible && (
                              <line
                                x1={x(dryFrequency)}
                                x2={x(mode!.frequency)}
                                y1={y(family.n)}
                                y2={y(family.n)}
                                stroke={color}
                                strokeDasharray={
                                  mode!.trackingAmbiguous ? "2 3" : undefined
                                }
                                opacity={0.4}
                              />
                            )}
                            {dryVisible && (
                              <circle
                                cx={x(dryFrequency)}
                                cy={y(family.n)}
                                r={4}
                                fill="none"
                                stroke="#b6c6c5"
                              >
                                <title>
                                  n = {family.n}, m = 1 dry reference:{" "}
                                  {fmt(dryFrequency)} Hz
                                </title>
                              </circle>
                            )}
                            {operatingVisible && (
                              <circle
                                cx={x(mode!.frequency)}
                                cy={y(family.n)}
                                r={family.n === n ? 4.4 : 3.3}
                                fill={mode!.trackingAmbiguous ? "none" : color}
                                stroke={color}
                                strokeWidth={
                                  mode!.trackingAmbiguous ? 1.8 : 0.8
                                }
                              >
                                <title>
                                  n = {family.n}, m = 1 first tracked dry
                                  branch: {fmt(mode!.frequency)} Hz; {caseLabel}
                                  ; added mass ratio {fmt(mode!.addedMassRatio)}
                                  {mode!.trackingAmbiguous
                                    ? "; uncertain branch identity"
                                    : ""}
                                </title>
                              </circle>
                            )}
                          </g>
                        );
                      })}
                      <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle">
                        Frequency / Hz · log scale
                      </text>
                      <text
                        transform={`translate(22 ${H / 2}) rotate(-90)`}
                        textAnchor="middle"
                      >
                        Circumferential order / n
                      </text>
                    </>
                  );
                })()}
              </svg>
              <div className="cryo-plot-legend">
                <span style={{ color: "#b6c6c5" }}>○ Dry m = 1</span>
                <span style={{ color: operatingColor }}>
                  ● {caseLabel} m = 1
                </span>
                <span style={{ color: "#e8be85" }}>● Above cutoff</span>
                {uncertainFamilies.length > 0 && (
                  <span>○ Operating marker: uncertain identity</span>
                )}
              </div>
              <p className="cryo-plot-caption">
                Only frequencies in the chosen band are plotted. Axisymmetric
                angular blocks are independent: increasing the cutoff leaves
                lower orders unchanged and adds new families. A stable
                lower-order curve alone therefore cannot establish that n ={" "}
                {cutoff} is sufficient.
              </p>
            </>
          ) : (
            <p className="cryo-fourier-invalid" role="status">
              Enter positive frequency limits with the maximum above the
              minimum.
            </p>
          )}

          <div className="cryo-fourier-detail-heading">
            <div>
              <h3>Follow m = 1 through fill.</h3>
              <p>
                {n === 0
                  ? "Axisymmetric motion"
                  : `Circumferential wavelength ${fmt((Math.PI * 8.4) / n)} m`}
                {" · "}
                {n <= cutoff ? "inside" : "above"} the selected cutoff
              </p>
            </div>
            <div className="cryo-fourier-detail-controls">
              <label>
                Inspect angular order
                <select
                  value={n}
                  onChange={(event) => setN(Number(event.target.value))}
                >
                  {Array.from({ length: FOURIER_MAX_ORDER + 1 }, (_, order) => (
                    <option key={order} value={order}>
                      n = {order}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend>Frequency scale</legend>
                <div className="vl-segment">
                  {(["log", "linear"] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      aria-pressed={sweepScale === scale}
                      onClick={() => setSweepScale(scale)}
                    >
                      {scale === "log" ? "Log" : "Linear"}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
          <svg
            className="cryo-plot"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`First tracked dry shell branch, m equals 1, for circumferential order ${n} as liquid fill changes. The dashed horizontal line is its dry reference; the colored line is the ${caseLabel.toLowerCase()} frequency. Frequency uses a ${sweepScale === "log" ? "logarithmic" : "linear"} scale.`}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1={sx(fraction)}
                  x2={sx(fraction)}
                  y1={T}
                  y2={H - B}
                  stroke="#adc9cb18"
                />
                <text x={sx(fraction)} y={H - B + 20} textAnchor="middle">
                  {fraction * 100}%
                </text>
              </g>
            ))}
            {(sweepScale === "log"
              ? logTicks(sweepMin, sweepMax)
              : [0, 0.25, 0.5, 0.75, 1].map((fraction) => sweepMax * fraction)
            ).map((frequency) => (
              <g key={frequency}>
                <line
                  x1={L}
                  x2={W - R}
                  y1={sy(frequency)}
                  y2={sy(frequency)}
                  stroke="#adc9cb18"
                />
                <text x={L - 9} y={sy(frequency) + 4} textAnchor="end">
                  {fmt(frequency, 1)}
                </text>
              </g>
            ))}
            {branches.map((branch) => {
              const seed = sweep.points
                .flatMap((point) => point.modes)
                .find((mode) => mode.branch === branch);
              return (
                <g key={branch}>
                  {seed && (
                    <line
                      x1={L}
                      x2={W - R}
                      y1={sy(seed.dryFrequency)}
                      y2={sy(seed.dryFrequency)}
                      stroke="#b6c6c5"
                      strokeDasharray="4 5"
                      opacity={0.35}
                    />
                  )}
                  <path
                    d={sweepPath(branch)}
                    stroke={operatingColor}
                    strokeWidth={2.4}
                    fill="none"
                  />
                  {sweep.points.flatMap((point) => {
                    const mode = point.modes.find(
                      (item) => item.branch === branch,
                    );
                    return usable(mode) && mode!.trackingAmbiguous
                      ? [
                          <circle
                            key={point.fill}
                            cx={sx(point.fill)}
                            cy={sy(mode!.frequency)}
                            r={2.5}
                            fill="none"
                            stroke={operatingColor}
                          />,
                        ]
                      : [];
                  })}
                  {(() => {
                    const mode = current?.modes.find(
                      (item) => item.branch === branch,
                    );
                    return usable(mode) ? (
                      <circle
                        cx={sx(settings.fill)}
                        cy={sy(mode!.frequency)}
                        r={4}
                        fill={mode!.trackingAmbiguous ? "none" : operatingColor}
                        stroke={operatingColor}
                      />
                    ) : null;
                  })()}
                </g>
              );
            })}
            <line
              x1={sx(settings.fill)}
              x2={sx(settings.fill)}
              y1={T}
              y2={H - B}
              stroke="#e5eee2"
              strokeDasharray="2 5"
            />
            <text x={W / 2} y={H - 3} textAnchor="middle">
              Liquid volume / tank capacity
            </text>
            <text
              transform={`translate(15 ${H / 2}) rotate(-90)`}
              textAnchor="middle"
            >
              Frequency / Hz{sweepScale === "log" ? " · log scale" : ""}
            </text>
          </svg>
          <div className="cryo-plot-legend">
            <span style={{ color: operatingColor }}>━ {caseLabel} · m = 1</span>
            <span style={{ color: "#b6c6c5" }}>─ ─ Dry reference</span>
          </div>
          <p className="cryo-plot-caption">
            Lines follow adjacent-fill eigenvector overlap. Open circles and
            breaks mark uncertain continuation; filled markers use the exact
            current fill.
            {caseId === "pressure"
              ? " Fill changes the acceleration-induced pressure field; the structural mass stays dry."
              : n >= 4
                ? " This family uses a rigid liquid surface at partial fill, without a retained slosh coordinate."
                : " This family uses the demo’s retained free-surface shapes at partial fill."}
          </p>
          {failedFills.length > 0 && (
            <p className="cryo-fourier-invalid" role="status">
              Fill-sweep solves unavailable at{" "}
              {failedFills
                .slice(0, 6)
                .map((fill) => `${fmt(fill * 100)}%`)
                .join(", ")}
              {failedFills.length > 6
                ? ` and ${failedFills.length - 6} more points`
                : ""}
              . These states have no connected curve or inferred frequency.
            </p>
          )}

          <div className="cryo-fourier-bottom">
            <div className="cryo-fourier-current">
              <h4>
                n = {n}, m = 1 at {fmt(settings.fill * 100)}% fill
              </h4>
              <div className="cryo-fourier-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">m</th>
                      <th scope="col">Dry / Hz</th>
                      <th scope="col">Loaded / Hz</th>
                      <th scope="col">μ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const mode = current?.modes.find(
                        (item) => item.branch === branch,
                      );
                      const seed = sweep.points
                        .flatMap((point) => point.modes)
                        .find((item) => item.branch === branch);
                      return (
                        <tr key={branch}>
                          <th scope="row" style={{ color: operatingColor }}>
                            {branch}
                            {mode?.trackingAmbiguous ? " ?" : ""}
                          </th>
                          <td>{seed ? fmt(seed.dryFrequency) : "—"}</td>
                          <td>{usable(mode) ? fmt(mode!.frequency) : "—"}</td>
                          <td>
                            {usable(mode) ? fmt(mode!.addedMassRatio) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <small>
                {current && !current.available
                  ? "The current-fill numerical solve is unavailable."
                  : selectedFamily?.freeSurfaceModel === "closed-liquid" &&
                      !currentBranch
                    ? "m = 1 is retired at full fill by the closed-liquid constraint."
                    : current && !currentBranch
                      ? "The tracked m = 1 branch is unavailable at this fill."
                      : caseId === "pressure"
                        ? "Pressure only: μ = 0; no fluid added-mass operator is applied."
                        : "? = uncertain branch identity · μ = liquid / structural modal inertia"}
              </small>
            </div>
            <div className="cryo-fourier-method">
              <h4>
                {caseId === "pressure"
                  ? "Pressure changes stiffness with dry mass."
                  : "Mass loading depends on the mode’s motion."}
              </h4>
              {caseId === "pressure" ? (
                <div className="cryo-equation">
                  <span>
                    (K<sub>s</sub> + K<sub>G</sub>) φ = ω² M<sub>s</sub> φ
                  </span>
                </div>
              ) : (
                <div className="cryo-equation">
                  <span>
                    μ<sub>j</sub> =
                  </span>
                  <span className="cryo-fraction">
                    <span>
                      φ<sub>j</sub>
                      <sup>T</sup> M<sub>A</sub> φ<sub>j</sub>
                    </span>
                    <span>
                      φ<sub>j</sub>
                      <sup>T</sup> M<sub>s</sub> φ<sub>j</sub>
                    </span>
                  </span>
                </div>
              )}
              <p>
                {caseId === "pressure"
                  ? "The added-mass matrix is omitted, so μ = 0. Fill, liquid density and acceleration still change the hydrostatic pressure contribution to geometric stiffness. Uniform ullage pressure is held fixed."
                  : "Large μ means the shell accelerates substantial liquid. A small frequency shift can reflect weak liquid participation, even when the fluid matrix is applied to every mode."}
              </p>
              <p>
                This view shows only m = 1 through n = 20, retaining five axial
                shell trials in every solve. Higher branches are hidden. It
                cannot establish completeness of your 10–2000 Hz FEM or liquid
                acoustic behavior.
              </p>
              <small>
                {coverage
                  ? `Largest eigen residual ${coverage.maxResidual.toExponential(1)}`
                  : ""}
                {" · "}Ullage pressure and acceleration held fixed during the
                fill sweep
              </small>
              {caseId !== "pressure" && (
                <FluidBasisCheck
                  key={`${settings.fluid}-${settings.fill}-${settings.ullagePsi}-${settings.accelerationG}-${n}-${caseId}`}
                  settings={settings}
                  n={n}
                  caseId={caseId}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
