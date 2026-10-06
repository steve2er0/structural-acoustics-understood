import { useEffect, useId, useMemo, useState } from "react";
import { EngineeringPlot, plotCoordinates } from "@engine/Plot";
import {
  coherence,
  shape,
  spectrum,
  type Field,
  type Settings,
  type Solution,
} from "./physics";
import "./plots.css";

export type AnalysisTab = "Coherence" | "Wavenumber" | "Response";
type Props = {
  settings: Settings;
  solution: Solution;
  onChange: (patch: Partial<Settings>) => void;
  tab: AnalysisTab;
};
const COLORS: Record<Field, string> = {
  tbl: "#7dddc9",
  daf: "#95c5ee",
  pwf: "#e6b47a",
};
const NAMES: Record<Field, string> = {
  tbl: "Corcos TBL",
  daf: "Diffuse acoustic",
  pwf: "Plane wave",
};
const DEG = Math.PI / 180;
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const compact = (v: number) =>
  Math.abs(v) >= 100
    ? v.toFixed(0)
    : Math.abs(v) >= 10
      ? v.toFixed(1)
      : v.toFixed(2);
const scientific = (v: number) => (v === 0 ? "0" : v.toExponential(2));
function color(value: number, signed = false) {
  const t = clamp(Math.abs(value));
  const end = signed && value < 0 ? [116, 170, 221] : [229, 181, 124];
  const start = [22, 43, 48];
  return `rgb(${start.map((v, i) => Math.round(v + t * (end[i] - v))).join(",")})`;
}
function linePath(
  values: number[],
  x: (i: number) => number,
  y: (v: number) => number,
) {
  return values
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    .join("");
}
function Key({
  items,
}: {
  items: { text: string; color: string; dashed?: boolean }[];
}) {
  return (
    <div className="tbl-plots-key">
      {items.map((item) => (
        <span key={item.text}>
          <i
            style={{
              borderColor: item.color,
              borderStyle: item.dashed ? "dashed" : "solid",
            }}
          />
          {item.text}
        </span>
      ))}
    </div>
  );
}
function Tap({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className="tbl-plots-tap">
      <circle cx={x} cy={y} r={6} />
      <text x={x + 11} y={y - 8}>
        {label}
      </text>
    </g>
  );
}

function CoherencePlots({
  settings: s,
  solution: q,
  onChange,
}: Omit<Props, "tab">) {
  const [real, setReal] = useState(false);
  const id = useId().replaceAll(":", "");
  const width = Math.min(390, (174 * s.length) / s.width);
  const height = (width * s.width) / s.length;
  const left = (480 - width) / 2,
    top = 28 + (174 - height) / 2;
  const cells = useMemo(() => {
    const nx = 60,
      ny = Math.max(16, Math.min(42, Math.round((nx * s.width) / s.length)));
    return Array.from({ length: nx * ny }, (_, i) => {
      const ix = i % nx,
        iy = Math.floor(i / nx);
      const g = coherence(
        s,
        ((ix + 0.5) / nx - s.ax) * s.length,
        ((iy + 0.5) / ny - s.ay) * s.width,
      );
      return (
        <rect
          key={i}
          x={left + (ix / nx) * width}
          y={top + ((ny - iy - 1) / ny) * height}
          width={width / nx + 0.35}
          height={height / ny + 0.35}
          fill={color(real ? g.re : Math.hypot(g.re, g.im), real)}
        />
      );
    });
  }, [s, real, width, height, left, top]);
  const span = Math.hypot(s.length, s.width);
  const cuts = useMemo(
    () =>
      [false, true].map((cross) =>
        Array.from({ length: 241 }, (_, i) => {
          const angle = s.heading * DEG + (cross ? Math.PI / 2 : 0);
          const g = coherence(
            s,
            (i / 240) * span * Math.cos(angle),
            (i / 240) * span * Math.sin(angle),
          );
          return real ? g.re : Math.hypot(g.re, g.im);
        }),
      ),
    [s, real, span],
  );
  const phase = Math.atan2(q.coherence.im, q.coherence.re) / DEG;
  const magnitude = Math.hypot(q.coherence.re, q.coherence.im);
  const selectTap = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = plotCoordinates(e);
    if (point)
      onChange({
        bx: clamp((point.x - left) / width),
        by: clamp(1 - (point.y - top) / height),
      });
  };
  const ymin = real ? -1 : 0;
  const y = (value: number) => 190 - ((value - ymin) / (1 - ymin)) * 160;
  return (
    <div className="tbl-plots-grid">
      <section className="tbl-plots-card">
        <div className="tbl-plots-heading">
          <h3>How far does pressure remember?</h3>
          <div
            className="tbl-plots-toggle"
            aria-label="Correlation map quantity"
          >
            <button
              type="button"
              aria-pressed={!real}
              onClick={() => setReal(false)}
            >
              |Γ|
            </button>
            <button
              type="button"
              aria-pressed={real}
              onClick={() => setReal(true)}
            >
              Re Γ
            </button>
          </div>
        </div>
        <svg
          viewBox="0 0 480 256"
          className="tbl-plots-svg tbl-plots-interactive"
          role="img"
          tabIndex={0}
          aria-label="Pressure coherence map relative to tap A. Click to position tap B, or use arrow keys to move B."
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            selectTap(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) selectTap(e);
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 0.05 : 0.01;
            const moves: Record<string, Partial<Settings>> = {
              ArrowLeft: { bx: clamp(s.bx - step) },
              ArrowRight: { bx: clamp(s.bx + step) },
              ArrowUp: { by: clamp(s.by + step) },
              ArrowDown: { by: clamp(s.by - step) },
            };
            if (moves[e.key]) {
              e.preventDefault();
              onChange(moves[e.key]);
            }
          }}
        >
          <defs>
            <linearGradient id={`${id}-scale`}>
              <stop stopColor={real ? color(-1, true) : color(0)} />
              {real && <stop offset="50%" stopColor={color(0)} />}
              <stop offset="100%" stopColor={color(1)} />
            </linearGradient>
          </defs>
          {cells}
          <rect
            x={left}
            y={top}
            width={width}
            height={height}
            className="tbl-plots-panel-edge"
          />
          <line
            x1={left + s.ax * width}
            y1={top + (1 - s.ay) * height}
            x2={left + s.bx * width}
            y2={top + (1 - s.by) * height}
            stroke="#f2f2d9"
            strokeDasharray="3 4"
            opacity=".65"
          />
          <Tap
            x={left + s.ax * width}
            y={top + (1 - s.ay) * height}
            label="A"
          />
          <Tap
            x={left + s.bx * width}
            y={top + (1 - s.by) * height}
            label="B"
          />
          <text x={left + width / 2} y={top + height + 18} textAnchor="middle">
            x · {compact(s.length)} m
          </text>
          <text
            x={left - 10}
            y={top + height / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${left - 10} ${top + height / 2})`}
          >
            y · {compact(s.width)} m
          </text>
          <rect
            x="140"
            y="235"
            width="200"
            height="5"
            rx="2"
            fill={`url(#${id}-scale)`}
          />
          <text x="128" y="241" textAnchor="end">
            {real ? "−1" : "0"}
          </text>
          <text x="352" y="241">
            +1
          </text>
        </svg>
        <p>
          {real
            ? "Signed correlation reveals phase fronts and cancellation."
            : "Magnitude separates loss of spatial coherence from phase delay."}{" "}
          Tap the panel to move B.
        </p>
      </section>
      <section className="tbl-plots-card">
        <div className="tbl-plots-heading">
          <h3>
            {real ? "Correlation" : "Coherence magnitude"} along the flow axes
          </h3>
          <span className="tbl-plots-unit">
            {real ? "Re Γ" : "|Γ|"} · dimensionless
          </span>
        </div>
        <svg
          viewBox="0 0 480 256"
          className="tbl-plots-svg"
          role="img"
          aria-label={`${real ? "Real correlation" : "Coherence magnitude"} versus pressure-tap separation along and across the flow direction`}
        >
          {(real ? [-1, -0.5, 0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((v) => (
            <g key={v}>
              <line
                x1="46"
                x2="456"
                y1={y(v)}
                y2={y(v)}
                className="tbl-plots-gridline"
              />
              <text x="36" y={y(v) + 4} textAnchor="end">
                {compact(v)}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line
                x1={46 + v * 410}
                x2={46 + v * 410}
                y1="30"
                y2="190"
                className="tbl-plots-gridline"
              />
              <text x={46 + v * 410} y="210" textAnchor="middle">
                {compact(v * span)}
              </text>
            </g>
          ))}
          {!real && s.field === "tbl" && (
            <line
              x1="46"
              x2="456"
              y1={y(1 / Math.E)}
              y2={y(1 / Math.E)}
              stroke="#e6b47a"
              strokeDasharray="2 5"
              opacity=".55"
            />
          )}
          {cuts.map((curve, i) => (
            <path
              key={i}
              d={linePath(curve, (i) => 46 + (i / 240) * 410, y)}
              className="tbl-plots-curve"
              stroke={i ? "#95c5ee" : "#7dddc9"}
              strokeDasharray={i ? "5 3" : undefined}
            />
          ))}
          <text x="251" y="234" textAnchor="middle">
            Separation r [m]
          </text>
        </svg>
        <Key
          items={[
            { text: "Along flow", color: "#7dddc9" },
            { text: "Across flow", color: "#95c5ee", dashed: true },
          ]}
        />
        <div className="tbl-plots-readings">
          <span>
            A → B <b>|Γ| = {magnitude.toFixed(3)}</b>
          </span>
          <span>
            Phase{" "}
            <b>
              {magnitude < 1e-5
                ? "undefined near zero"
                : `${phase.toFixed(1)}°`}
            </b>
          </span>
          <span>
            Squared coherence <b>{(magnitude * magnitude).toFixed(3)}</b>
          </span>
        </div>
        <p>
          {s.field === "tbl"
            ? `${real ? "The oscillation follows the convective phase, inside the decaying coherence envelope." : "The dotted line is 1/e."} Along-flow decay length is ${compact(q.lx)} m; cross-flow is ${compact(q.ly)} m. Phase uses the principal angle, wrapped to ±180°.`
            : s.field === "daf"
              ? "Diffuse pressure is directionally symmetric: both cuts coincide. The real correlation changes sign beyond its first zero at λ₀/2."
              : "One plane wave retains unit coherence at every separation. Its phase gradient, set by incidence and azimuth, determines modal cancellation."}
        </p>
      </section>
    </div>
  );
}

function WavenumberPlots({
  settings: s,
  solution: q,
}: Omit<Props, "tab" | "onChange">) {
  const id = useId().replaceAll(":", "");
  const k0 = (2 * Math.PI * s.frequency) / s.soundSpeed;
  const kx = (s.modeX * Math.PI) / s.length,
    ky = (s.modeY * Math.PI) / s.width;
  const extent = 1.22 * Math.max(q.kc, k0, kx, ky, 1);
  const cx = 240,
    cy = 130,
    scale = 104 / extent;
  const x = (k: number) => cx + k * scale,
    y = (k: number) => cy - k * scale;
  const flowX = Math.cos(s.heading * DEG),
    flowY = Math.sin(s.heading * DEG);
  const pwx = k0 * Math.sin(s.incidence * DEG) * Math.cos(s.azimuth * DEG);
  const pwy = k0 * Math.sin(s.incidence * DEG) * Math.sin(s.azimuth * DEG);
  const cells = useMemo(() => {
    if (s.field === "pwf") return null;
    const n = 68;
    return Array.from({ length: n * n }, (_, i) => {
      const ix = i % n,
        iy = Math.floor(i / n);
      const a = -extent + ((ix + 0.5) / n) * 2 * extent;
      const b = -extent + ((iy + 0.5) / n) * 2 * extent;
      let value: number;
      if (s.field === "tbl") {
        const stream =
          (a * flowX + b * flowY - q.kc) / Math.max(s.alphaX * q.kc, 1e-8);
        const cross =
          (-a * flowY + b * flowX) / Math.max(s.alphaY * q.kc, 1e-8);
        value = Math.pow(
          1 / ((1 + stream * stream) * (1 + cross * cross)),
          0.4,
        );
      } else {
        const r = Math.hypot(a, b) / k0;
        value = r < 1 ? 0.25 + 0.65 * Math.pow(r, 3) : 0;
      }
      return value > 0.025 ? (
        <rect
          key={i}
          x={cx - 104 + (ix / n) * 208}
          y={cy + 104 - ((iy + 1) / n) * 208}
          width={208 / n + 0.2}
          height={208 / n + 0.2}
          fill={s.field === "daf" ? "#95c5ee" : "#7dddc9"}
          opacity={value * 0.6}
        />
      ) : null;
    });
  }, [s.field, s.alphaX, s.alphaY, extent, flowX, flowY, q.kc, k0]);
  const panelWidth = Math.min(366, (155 * s.length) / s.width),
    panelHeight = (panelWidth * s.width) / s.length;
  const pl = (480 - panelWidth) / 2,
    pt = 45 + (155 - panelHeight) / 2;
  const modeCells = useMemo(
    () =>
      Array.from({ length: 64 * 36 }, (_, i) => {
        const ix = i % 64,
          iy = Math.floor(i / 64);
        return (
          <rect
            key={i}
            x={pl + (ix / 64) * panelWidth}
            y={pt + ((35 - iy) / 36) * panelHeight}
            width={panelWidth / 64 + 0.3}
            height={panelHeight / 36 + 0.3}
            fill={color(shape(q.mode, (ix + 0.5) / 64, (iy + 0.5) / 36), true)}
          />
        );
      }),
    [pl, pt, panelWidth, panelHeight, q.mode],
  );
  return (
    <div className="tbl-plots-grid">
      <section className="tbl-plots-card">
        <div className="tbl-plots-heading">
          <h3>Does the pressure pattern fit the mode?</h3>
          <span className="tbl-plots-unit">kₓ, kᵧ [rad/m]</span>
        </div>
        <svg
          viewBox="0 0 480 268"
          className="tbl-plots-svg"
          role="img"
          aria-label="Wavenumber map showing convective pressure spectrum, diffuse acoustic disk, plane wave location and the selected mode's four spatial harmonics"
        >
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M0 0L10 5L0 10" fill="#7dddc9" />
            </marker>
          </defs>
          <rect
            x={cx - 104}
            y={cy - 104}
            width="208"
            height="208"
            fill="#10282e"
          />
          {cells}
          {[-1, -0.5, 0, 0.5, 1].map((v) => (
            <g key={v}>
              <line
                x1={x(v * extent)}
                x2={x(v * extent)}
                y1="26"
                y2="234"
                className="tbl-plots-gridline"
              />
              <line
                x1="136"
                x2="344"
                y1={y(v * extent)}
                y2={y(v * extent)}
                className="tbl-plots-gridline"
              />
            </g>
          ))}
          <line
            x1="121"
            x2="359"
            y1={cy}
            y2={cy}
            stroke="#a5b5b8"
            opacity=".5"
          />
          <line
            x1={cx}
            x2={cx}
            y1="18"
            y2="244"
            stroke="#a5b5b8"
            opacity=".5"
          />
          <circle
            cx={cx}
            cy={cy}
            r={k0 * scale}
            fill="none"
            stroke="#95c5ee"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <line
            x1={cx}
            y1={cy}
            x2={x(q.kc * flowX)}
            y2={y(q.kc * flowY)}
            stroke="#7dddc9"
            opacity={s.field === "tbl" ? 0.9 : 0.4}
            markerEnd={`url(#${id}-arrow)`}
          />
          <circle
            cx={x(q.kc * flowX)}
            cy={y(q.kc * flowY)}
            r="3"
            fill="#7dddc9"
          />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sy) => (
              <g
                key={`${sx}-${sy}`}
                transform={`translate(${x(sx * kx)},${y(sy * ky)})`}
              >
                <path d="M-5 0H5M0-5V5" stroke="#f1ead4" strokeWidth="2" />
              </g>
            )),
          )}
          <circle
            cx={x(pwx)}
            cy={y(pwy)}
            r={s.field === "pwf" ? 5 : 3}
            fill="#e6b47a"
            stroke="#14272b"
            strokeWidth="1.5"
          />
          <text x="365" y={cy + 4}>
            kₓ
          </text>
          <text x={cx + 9} y="21">
            kᵧ
          </text>
          <text x="136" y="252" textAnchor="middle">
            −{compact(extent)}
          </text>
          <text x="344" y="252" textAnchor="middle">
            +{compact(extent)}
          </text>
          <text x="240" y="252" textAnchor="middle">
            0
          </text>
          <text x="124" y="30" textAnchor="end">
            +{compact(extent)}
          </text>
          <text x="124" y="235" textAnchor="end">
            −{compact(extent)}
          </text>
        </svg>
        <Key
          items={[
            { text: "Convective ridge", color: COLORS.tbl },
            { text: "Acoustic disk boundary", color: COLORS.daf, dashed: true },
            { text: "Plane wave", color: COLORS.pwf },
            { text: "+ Mode harmonics", color: "#f1ead4" },
          ]}
        />
        <p>
          {s.field === "tbl"
            ? "Corcos concentrates pressure around the convective wavenumber; the ridge widths are αₓk꜀ and αᵧk꜀. Color shows relative spectral shape with a power-0.4 display scale."
            : s.field === "daf"
              ? "A three-dimensional diffuse field projects onto the entire acoustic disk. The shaded support is qualitative; more projected weight lies near grazing incidence at the rim."
              : "A single plane wave occupies one point inside the acoustic disk. At normal incidence that point is the origin: pressure is in phase across the panel."}
        </p>
      </section>
      <section className="tbl-plots-card">
        <div className="tbl-plots-heading">
          <h3>The panel’s spatial filter</h3>
          <span className="tbl-plots-unit">
            Mode ({s.modeX}, {s.modeY}) · {q.mode.frequency.toFixed(1)} Hz
          </span>
        </div>
        <svg
          viewBox="0 0 480 268"
          className="tbl-plots-svg"
          role="img"
          aria-label={`Signed displacement shape of simply supported panel mode ${s.modeX}, ${s.modeY}; alternating lobes cause spatial cancellation of uniform pressure`}
        >
          {modeCells}
          <rect
            x={pl}
            y={pt}
            width={panelWidth}
            height={panelHeight}
            className="tbl-plots-panel-edge"
          />
          {Array.from({ length: s.modeX - 1 }, (_, i) => (
            <line
              key={`x${i}`}
              x1={pl + ((i + 1) / s.modeX) * panelWidth}
              x2={pl + ((i + 1) / s.modeX) * panelWidth}
              y1={pt}
              y2={pt + panelHeight}
              stroke="#e5e8d2"
              strokeDasharray="3 4"
              opacity=".6"
            />
          ))}
          {Array.from({ length: s.modeY - 1 }, (_, i) => (
            <line
              key={`y${i}`}
              x1={pl}
              x2={pl + panelWidth}
              y1={pt + ((i + 1) / s.modeY) * panelHeight}
              y2={pt + ((i + 1) / s.modeY) * panelHeight}
              stroke="#e5e8d2"
              strokeDasharray="3 4"
              opacity=".6"
            />
          ))}
          <Tap
            x={pl + s.bx * panelWidth}
            y={pt + (1 - s.by) * panelHeight}
            label="B"
          />
          <text x="240" y="225" textAnchor="middle">
            φₘₙ = sin(mπx/L) sin(nπy/W)
          </text>
          <text x="240" y="247" textAnchor="middle">
            Blue −1 · dark 0 · gold +1
          </text>
        </svg>
        <div className="tbl-plots-readings">
          <span>
            Spatial harmonics{" "}
            <b>
              ({compact(kx)}, {compact(ky)}) rad/m
            </b>
          </span>
          <span>
            Acceptance J <b>{scientific(q.acceptance)}</b>
          </span>
          <span>
            Frequency ratio{" "}
            <b>f / fₘₙ = {(s.frequency / q.mode.frequency).toFixed(2)}</b>
          </span>
        </div>
        <p>
          Pressure does work when its pattern follows these alternating lobes.
          The finite panel spreads each harmonic into a lobe in wavenumber
          space; exact point coincidence is not required. Strong motion also
          needs temporal resonance.
        </p>
      </section>
    </div>
  );
}

function ResponsePlots({
  settings: s,
  solution: q,
  onChange,
}: Omit<Props, "tab">) {
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 700px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  // Keep the expensive sweep stable while selecting a field/frequency or moving reference A.
  const key = JSON.stringify({
    ...s,
    field: "tbl",
    frequency: 200,
    ax: 0,
    ay: 0,
    modeX: 1,
    modeY: 1,
    bandwidth: 1,
    delta: 0.03,
  });
  const points = useMemo(() => spectrum(JSON.parse(key) as Settings), [key]);
  const id = useId().replaceAll(":", "");
  if (points.length < 2)
    return (
      <p className="tbl-plots-empty">
        The response sweep is unavailable for this configuration.
      </p>
    );
  const minF = points[0].frequency,
    maxF = points[points.length - 1].frequency;
  const values = points
    .flatMap((p) => [p.tbl, p.daf, p.pwf])
    .filter((v) => Number.isFinite(v) && v > 0);
  if (!values.length)
    return (
      <section className="tbl-plots-card">
        <h3>Zero response at B</h3>
        <p>
          A logarithmic PSD plot cannot show zero. Move B off the panel boundary
          or increase the point-pressure PSD to display the response.
        </p>
      </section>
    );
  const maxLog = Math.ceil(Math.log10(Math.max(...values, q.accelerationPsd)));
  const minLog = Math.min(
    maxLog - 1,
    Math.floor(
      Math.log10(
        Math.min(
          ...values,
          ...(q.accelerationPsd > 0 ? [q.accelerationPsd] : []),
        ),
      ),
    ),
  );
  const left = narrow ? 58 : 75,
    right = narrow ? 420 : 908,
    top = 29,
    bottom = narrow ? 218 : 205;
  const x = (f: number) =>
    left + (Math.log(f / minF) / Math.log(maxF / minF)) * (right - left);
  const y = (v: number) =>
    bottom - ((Math.log10(v) - minLog) / (maxLog - minLog)) * (bottom - top);
  const selectFrequency = (frequency: number) =>
    onChange({
      frequency: clamp(Math.round(frequency * 100) / 100, minF, maxF),
    });
  const responsePath = (field: Field) => {
    let connected = false;
    return points
      .map((p) => {
        if (!(p[field] > 0) || !Number.isFinite(p[field])) {
          connected = false;
          return "";
        }
        const segment = `${connected ? "L" : "M"}${x(p.frequency).toFixed(2)},${y(p[field]).toFixed(2)}`;
        connected = true;
        return segment;
      })
      .join("");
  };
  const ticks = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter(
    (f) => f >= minF && f <= maxF,
  );
  return (
    <section className="tbl-plots-card tbl-plots-response">
      <div className="tbl-plots-heading">
        <h3>Same point-pressure PSD. Different panel response.</h3>
        <span className="tbl-plots-unit">
          Acceleration PSD at B [(m/s²)²/Hz]
        </span>
      </div>
      <EngineeringPlot
        viewBox={narrow ? "0 0 440 280" : "0 0 940 256"}
        className="tbl-plots-svg tbl-plots-interactive"
        role="img"
        tabIndex={0}
        aria-label="Acceleration power spectral density versus frequency for Corcos, diffuse acoustic and plane-wave pressure fields at equal point pressure PSD. Click to select frequency, or use arrow keys."
        domain={[minF, maxF]}
        plotLeft={left}
        plotWidth={right - left}
        onSelect={selectFrequency}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            selectFrequency(
              s.frequency * (e.key === "ArrowLeft" ? 1 / 1.02 : 1.02),
            );
          }
        }}
      >
        <defs>
          <clipPath id={`${id}-response`}>
            <rect x={left} y={top} width={right - left} height={bottom - top} />
          </clipPath>
        </defs>
        {Array.from({ length: maxLog - minLog + 1 }, (_, i) => minLog + i)
          .filter(
            (_, i) =>
              i %
                Math.max(1, Math.ceil((maxLog - minLog) / (narrow ? 4 : 5))) ===
              0,
          )
          .map((log) => (
            <g key={log}>
              <line
                x1={left}
                x2={right}
                y1={y(10 ** log)}
                y2={y(10 ** log)}
                className="tbl-plots-gridline"
              />
              <text x={left - 12} y={y(10 ** log) + 4} textAnchor="end">
                10
                <tspan baselineShift="super" fontSize={narrow ? 10 : 8}>
                  {log}
                </tspan>
              </text>
            </g>
          ))}
        {ticks.map((f) => (
          <g key={f}>
            <line
              x1={x(f)}
              x2={x(f)}
              y1={top}
              y2={bottom}
              className="tbl-plots-gridline"
            />
            <text x={x(f)} y={narrow ? 243 : 226} textAnchor="middle">
              {f}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${id}-response)`}>
          {q.modes
            .filter((m) => m.frequency >= minF && m.frequency <= maxF)
            .map((m) => (
              <line
                key={`${m.m}-${m.n}`}
                x1={x(m.frequency)}
                x2={x(m.frequency)}
                y1={top}
                y2={bottom}
                stroke="#d5dfd2"
                strokeDasharray="2 5"
                opacity=".18"
              />
            ))}
          {(["daf", "pwf", "tbl"] as Field[]).map((field) => (
            <path
              key={field}
              d={responsePath(field)}
              className="tbl-plots-curve"
              stroke={COLORS[field]}
              strokeWidth={field === s.field ? 2.8 : 1.5}
              opacity={field === s.field ? 1 : 0.72}
            />
          ))}
          <line
            x1={x(s.frequency)}
            x2={x(s.frequency)}
            y1={top}
            y2={bottom}
            stroke="#f0e8ce"
            strokeDasharray="4 4"
          />
          {q.accelerationPsd > 0 && (
            <circle
              cx={x(s.frequency)}
              cy={y(q.accelerationPsd)}
              r="4"
              fill={COLORS[s.field]}
              stroke="#f0e8ce"
            />
          )}
        </g>
        <text
          x={Math.min(
            right - (narrow ? 40 : 25),
            Math.max(left + 30, x(s.frequency)),
          )}
          y="18"
          textAnchor="middle"
          className="tbl-plots-cursor-label"
        >
          {s.frequency.toFixed(1)} Hz
        </text>
        <text x={(left + right) / 2} y={narrow ? 271 : 249} textAnchor="middle">
          Frequency [Hz] · logarithmic
        </text>
      </EngineeringPlot>
      <Key
        items={[
          ...(["tbl", "daf", "pwf"] as Field[]).map((field) => ({
            text: NAMES[field],
            color: COLORS[field],
          })),
          { text: "Panel natural frequencies", color: "#d5dfd2", dashed: true },
        ]}
      />
      <div className="tbl-plots-readings">
        <span>
          {NAMES[s.field]} at {s.frequency.toFixed(1)} Hz{" "}
          <b>{scientific(q.accelerationPsd)} (m/s²)²/Hz</b>
        </span>
        <span>
          Equal point pressure <b>{compact(s.pressurePsd)} Pa²/Hz</b>
        </span>
        <span>
          Response location B{" "}
          <b>
            ({compact(s.bx * s.length)}, {compact(s.by * s.width)}) m
          </b>
        </span>
      </div>
      <p>
        Click or drag to select frequency within {compact(minF)}–
        {maxF.toFixed(1)} Hz. All three fields share the prescribed
        point-pressure PSD across this sweep. Peaks combine modal receptance
        with spatial acceptance; cross-modal pressure correlation is retained.
        Dashed vertical lines locate the retained panel modes. The log scale
        includes all positive PSD samples; exact zeros are omitted.
      </p>
    </section>
  );
}

export default function Plots({ tab, ...props }: Props) {
  return (
    <div className="tbl-plots" aria-live="off">
      {tab === "Coherence" ? (
        <CoherencePlots {...props} />
      ) : tab === "Wavenumber" ? (
        <WavenumberPlots {...props} />
      ) : (
        <ResponsePlots {...props} />
      )}
    </div>
  );
}
