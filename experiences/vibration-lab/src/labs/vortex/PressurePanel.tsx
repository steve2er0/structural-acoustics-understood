import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { ParameterSlider, SegmentedControl } from "@components/Controls";
import { TAIL, type Model } from "./physics";
import {
  ATTACHMENT_Y,
  MODE_RATIOS,
  MODE_STRIDE,
  MAX_MODE_RATIO,
  HARMONIC_INDEX,
  wrapAngle,
  attachments,
  attachmentWakeCenter,
  convectionSpeed,
  evaluateModes,
  modeCorrelation,
  modeRms,
  noseY,
  pressureModes,
  pressureRgb,
  pressureScale,
  type PressureSettings,
  type PressureTap,
  type PressureUnit,
} from "./pressure";
const COLORS = ["#ffc85e", "#beadff"];
const format = (v: number) =>
  Math.abs(v) >= 100
    ? v.toFixed(0)
    : Math.abs(v) >= 1
      ? v.toFixed(2)
      : v.toFixed(4);
export function AttachmentMap({
  model,
  settings,
  time,
  unit,
  limit,
  selected,
  onSelect,
}: {
  model: Model;
  settings: PressureSettings;
  time: number;
  unit: PressureUnit;
  limit: number;
  selected: number;
  onSelect: (id: number) => void;
}) {
  const scale = pressureScale(model, unit);
  return (
    <svg
      viewBox="0 0 270 200"
      role="img"
      aria-label="Midbody cut showing pressure on the facing core and booster surfaces downstream of the forward attachments"
    >
      <text x={12} y={20} fontSize={8} fill="#94b7c3">
        MIDBODY / ATTACHMENT WAKE
      </text>
      {model.bodies.map((b) => {
        const x = 135 + b.x * 13,
          r = (b.diameter / 2) * 13;
        return (
          <g
            key={b.index}
            onClick={() => onSelect(b.index)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={x}
              cy={96}
              r={r}
              fill="#1f3540"
              stroke={selected === b.index ? "#fff" : "#5d7e8c"}
              strokeWidth={1}
            />
            {Array.from({ length: 72 }, (_, i) => {
              const a = (i / 72) * 2 * Math.PI,
                a1 = ((i + 1) / 72) * 2 * Math.PI;
              const rgb = pressureRgb(
                evaluateModes(pressureModes(model, b, settings, 0, a), time) *
                  scale,
                limit,
              );
              return (
                <path
                  key={i}
                  d={`M${x + r * Math.sin(a)},${96 - r * Math.cos(a)} A${r},${r} 0 0 1 ${x + r * Math.sin(a1)},${96 - r * Math.cos(a1)}`}
                  fill="none"
                  stroke={`rgb(${rgb.join(",")})`}
                  strokeWidth={4}
                />
              );
            })}
            <text x={x} y={99} textAnchor="middle" fontSize={9} fill="#abc7d1">
              {b.index === 0 ? "C" : b.index === 1 ? "P" : "S"}
            </text>
          </g>
        );
      })}
      {attachments(model).map((a) => {
        const p = attachmentWakeCenter(model, a, ATTACHMENT_Y);
        return (
          <circle
            key={a.booster}
            cx={135 + p[0] * 13}
            cy={96 - p[2] * 13}
            r={3}
            fill="#e9b75c"
          />
        );
      })}
      <text x={135} y={164} textAnchor="middle" fontSize={9} fill="#b2c9d1">
        ⊗ AXIAL FLOW INTO PAGE
      </text>
      <text x={135} y={184} textAnchor="middle" fontSize={8} fill="#86a5b4">
        SOURCE UPSTREAM · PRESSURE ON OML
      </text>
    </svg>
  );
}
interface Props {
  model: Model;
  settings: PressureSettings;
  onSettings: (p: Partial<PressureSettings>) => void;
  time: number;
  selected: number;
  taps: [PressureTap, PressureTap];
  activeTap: number;
  onActive: (i: number) => void;
  onPlace: (tap: PressureTap) => void;
  onCompare: () => void;
  unit: PressureUnit;
  onUnit: (unit: PressureUnit) => void;
  limit: number;
  onLimit: (value: number) => void;
}
export function PressureLegend({
  unit,
  limit,
}: {
  unit: PressureUnit;
  limit: number;
}) {
  return (
    <div className="vx-pressure-legend">
      <span>−{format(limit)}</span>
      <i />
      <span>
        +{format(limit)} {unit === "cp" ? "Cp′" : "Pa"}
      </span>
      <small>below mean ← 0 → above mean</small>
    </div>
  );
}
function SurfaceMap({
  model,
  settings,
  time,
  selected,
  taps,
  onPlace,
  limit,
  unit,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const body =
      model.bodies.find((b) => b.index === selected) ?? model.bodies[0],
    length = noseY(body) - TAIL;
  const nx = 240,
    ny = 100;
  const grid = useMemo(() => {
    const coeffs = new Float32Array(nx * ny * MODE_STRIDE);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const modes = pressureModes(
          model,
          body,
          settings,
          noseY(body) - (i / (nx - 1)) * length,
          (j / (ny - 1)) * Math.PI * 2,
        );
        modes.forEach((m, k) => {
          const n = (j * nx + i) * MODE_STRIDE + k * 2;
          coeffs[n] = m.cosine;
          coeffs[n + 1] = m.sine;
        });
      }
    const buffer = document.createElement("canvas");
    buffer.width = nx;
    buffer.height = ny;
    return { coeffs, buffer };
  }, [model, body, settings, length]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"),
      sub = grid.buffer.getContext("2d");
    if (!ctx || !sub) return;
    const image = sub.createImageData(nx, ny),
      scale = pressureScale(model, unit);
    const ratios = MODE_RATIOS,
      c = ratios.map((r) =>
        Math.cos(2 * Math.PI * r * settings.frequency * time),
      ),
      s = ratios.map((r) =>
        Math.sin(2 * Math.PI * r * settings.frequency * time),
      );
    for (let i = 0; i < nx * ny; i++) {
      let v = 0;
      for (let k = 0; k < MODE_RATIOS.length; k++)
        v +=
          grid.coeffs[i * MODE_STRIDE + k * 2] * c[k] +
          grid.coeffs[i * MODE_STRIDE + k * 2 + 1] * s[k];
      const color = pressureRgb(v * scale, limit);
      image.data.set([...color, 255], i * 4);
    }
    sub.putImageData(image, 0, 0);
    ctx.clearRect(0, 0, 640, 270);
    ctx.drawImage(grid.buffer, 50, 18, 572, 196);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#a7c0cb";
    for (let j = 0; j <= 4; j++) {
      const y = 18 + j * 49;
      ctx.fillText(`${j * 90}°`, 5, y + 4);
      ctx.strokeStyle = "#10222b28";
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(622, y);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      ctx.fillText(((i * length) / 4).toFixed(1), 45 + i * 143, 235);
    }
    ctx.textAlign = "start";
    ctx.fillText("Distance aft of nose · m", 224, 259);
    const shoulder = 50 + ((noseY(body) - ATTACHMENT_Y) / length) * 572;
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "#172a3877";
    ctx.beginPath();
    ctx.moveTo(shoulder, 18);
    ctx.lineTo(shoulder, 214);
    ctx.stroke();
    // The centerline is the OML projection of each attachment wake, not the vehicle axis.
    for (const source of attachments(model).filter(
      (a) => body.index === 0 || a.booster === body.index,
    )) {
      ctx.beginPath();
      let lastAngle: number | null = null;
      for (let i = 0; i <= 80; i++) {
        const s = (i / 80) * (ATTACHMENT_Y - TAIL);
        const p = attachmentWakeCenter(model, source, s);
        const angle = wrapAngle(Math.atan2(p[0] - body.x, p[2]));
        const x = 50 + ((noseY(body) - ATTACHMENT_Y + s) / length) * 572;
        const y = 18 + (angle / (2 * Math.PI)) * 196;
        if (lastAngle === null || Math.abs(angle - lastAngle) > Math.PI)
          ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        lastAngle = angle;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    taps.forEach((tap, i) => {
      if (tap.body !== body.index) return;
      const x = 50 + ((noseY(body) - tap.y) / length) * 572,
        y = 18 + (tap.theta / (2 * Math.PI)) * 196;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS[i];
      ctx.fill();
      ctx.strokeStyle = "#15252d";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#10222b";
      ctx.textAlign = "center";
      ctx.fillText(i ? "B" : "A", x, y + 4);
      ctx.textAlign = "start";
    });
  }, [grid, model, settings, time, body, taps, unit, limit, length]);
  const locate = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - rect.left) / rect.width) * 640,
      y = ((e.clientY - rect.top) / rect.height) * 270;
    if (x < 50 || x > 622 || y < 18 || y > 214) return;
    onPlace({
      body: body.index,
      y: noseY(body) - ((x - 50) / 572) * length,
      theta: ((y - 18) / 196) * 2 * Math.PI,
    });
  };
  return (
    <canvas
      ref={canvas}
      width={640}
      height={270}
      role="img"
      aria-label={`Unwrapped surface pressure on ${body.name}. Horizontal axis is distance aft of nose; vertical axis is circumferential angle. Use the tap sliders for keyboard placement.`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        locate(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) locate(e);
      }}
    />
  );
}
function Signals({
  model,
  settings,
  taps,
  time,
  unit,
}: Pick<Props, "model" | "settings" | "taps" | "time" | "unit">) {
  const modes = useMemo(
    () =>
      taps.map((tap) => {
        const body =
          model.bodies.find((b) => b.index === tap.body) ?? model.bodies[0];
        return pressureModes(model, body, settings, tap.y, tap.theta);
      }),
    [model, settings, taps],
  );
  const scale = pressureScale(model, unit),
    unitLabel = unit === "cp" ? "Cp′" : "Pa";
  const rms = modes.map((m) => modeRms(m) * scale),
    rho = modeCorrelation(modes[0], modes[1]);
  const amplitude =
    Math.max(
      ...modes.map(
        (ms) =>
          ms.reduce((v, m) => v + Math.hypot(m.cosine, m.sine), 0) * scale,
      ),
      unit === "cp" ? 0.01 : 1,
    ) * 1.1;
  const maxPower =
    Math.max(
      ...modes.flatMap((ms) =>
        ms.map((m) => ((m.cosine ** 2 + m.sine ** 2) / 2) * scale ** 2),
      ),
      1e-12,
    ) * 1.12;
  const paths = modes.map((ms) =>
    Array.from(
      { length: 321 },
      (_, i) =>
        `${i ? "L" : "M"}${50 + (i / 320) * 560},${95 - ((evaluateModes(ms, time - 4 + (i / 320) * 4) * scale) / amplitude) * 60}`,
    ).join(" "),
  );
  const delay =
    taps[0].body === taps[1].body &&
    model.settings.boosters &&
    convectionSpeed(model) > 0
      ? (taps[0].y - taps[1].y) / convectionSpeed(model)
      : null;
  return (
    <>
      <div className="vx-pressure-metrics">
        {rms.map((value, i) => (
          <span key={i} style={{ color: COLORS[i] }}>
            TAP {i ? "B" : "A"} RMS{" "}
            <b>
              {format(value)} {unitLabel}
            </b>
            <small>
              1× {format(modeRms([modes[i][0]]) * scale)} · 2×{" "}
              {format(modeRms([modes[i][HARMONIC_INDEX]]) * scale)} {unitLabel}{" "}
              RMS
            </small>
          </span>
        ))}
        <span>
          ZERO-LAG CORRELATION{" "}
          <b>
            {taps[0].body !== taps[1].body
              ? "Shared assumed forcing"
              : rho === null
                ? "—"
                : rho.toFixed(3)}
          </b>
        </span>
        <span>
          B RELATIVE TO A · Δs / Uc{" "}
          <b>
            {delay === null
              ? "No same-body source reference"
              : `${delay.toFixed(3)} s`}
          </b>
        </span>
      </div>
      <div className="vx-pressure-signals">
        <article>
          <h3>Two points. One traveling field.</h3>
          <p>Reconstructed last 4 physical seconds · {unitLabel}</p>
          <svg
            viewBox="0 0 640 200"
            role="img"
            aria-label="Pressure histories for taps A and B over four physical seconds"
          >
            {[35, 95, 155].map((y) => (
              <line key={y} x1={50} x2={610} y1={y} y2={y} stroke="#aac4ce25" />
            ))}
            <text x={0} y={39}>
              {format(amplitude)}
            </text>
            <text x={20} y={99}>
              0
            </text>
            <text x={0} y={159}>
              −{format(amplitude)}
            </text>
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={COLORS[i]}
                strokeWidth={2}
              />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <text key={i} x={50 + i * 140} y={184} textAnchor="middle">
                {i === 4 ? "now" : `${i - 4} s`}
              </text>
            ))}
          </svg>
        </article>
        <article>
          <h3>Where the fluctuation energy lives.</h3>
          <p>Exact line power · {unitLabel}² per line · not a broadband PSD</p>
          <svg
            viewBox="0 0 640 200"
            role="img"
            aria-label="Discrete pressure line spectrum for taps A and B"
          >
            {[35, 95, 155].map((y) => (
              <line key={y} x1={50} x2={610} y1={y} y2={y} stroke="#aac4ce25" />
            ))}
            <text x={0} y={39}>
              {maxPower.toExponential(1)}
            </text>
            <text x={20} y={159}>
              0
            </text>
            {[1, 2].map((r) => (
              <g key={r}>
                <line
                  x1={50 + (r / 2.1) * 560}
                  x2={50 + (r / 2.1) * 560}
                  y1={27}
                  y2={155}
                  stroke="#adc8d155"
                  strokeDasharray="3 4"
                />
                <text x={50 + (r / 2.1) * 560} y={18} textAnchor="middle">
                  {r}×
                </text>
              </g>
            ))}
            {modes.map((ms, i) =>
              ms.map((m, k) => {
                const x =
                  50 +
                  (m.frequency / (settings.frequency * 2.1)) * 560 +
                  i * 5 -
                  2.5;
                const power = ((m.cosine ** 2 + m.sine ** 2) / 2) * scale ** 2;
                return (
                  <line
                    key={`${i}-${k}`}
                    x1={x}
                    x2={x}
                    y1={155}
                    y2={155 - (power / maxPower) * 120}
                    stroke={COLORS[i]}
                    strokeWidth={4}
                  />
                );
              }),
            )}
            {[0, 0.5, 1, 1.5, 2].map((r) => (
              <text
                key={r}
                x={50 + (r / 2.1) * 560}
                y={184}
                textAnchor="middle"
              >
                {(r * settings.frequency).toFixed(1)}
              </text>
            ))}
            <text x={627} y={184}>
              Hz
            </text>
          </svg>
        </article>
      </div>
    </>
  );
}
export default function PressurePanel(props: Props) {
  const {
    model,
    settings,
    onSettings,
    taps,
    activeTap,
    onActive,
    onPlace,
    unit,
    onUnit,
    limit,
    onLimit,
  } = props;
  const tap = taps[activeTap],
    body = model.bodies.find((b) => b.index === tap.body) ?? model.bodies[0];
  return (
    <section
      className="vx-pressure-panel"
      aria-label="Surface pressure instrumentation"
    >
      <header>
        <div>
          <p className="vl-eyebrow">ON THE OUTER MOLD LINE</p>
          <h2>From the attachment to the skin.</h2>
        </div>
        <span>PRESCRIBED FLUCTUATIONS · p′ = p − mean(p)</span>
      </header>
      <p className="vx-pressure-intro">
        The highlighted forward brackets shed a wake into the booster–core gaps.
        Its prescribed pressure footprint travels aft over the facing surfaces.
        The 1× mode alternates across each wake; its centerline carries a
        symmetric 2× harmonic. Here, centerline means the attachment wake’s
        projected center on the skin. Place A and B on the vehicle or drag
        across the map. Blue is below the local mean; red is above. No mean
        pressure or flight loads are predicted.
      </p>
      <div className="vx-pressure-settings">
        <ParameterSlider
          label="Shedding frequency · 1×"
          value={settings.frequency}
          min={0.25}
          max={8}
          step={0.25}
          unit="Hz"
          format={(v) => v.toFixed(2)}
          onValue={(frequency) => onSettings({ frequency })}
        />
        <ParameterSlider
          label="Fluctuation amplitude · Cp′ scale"
          value={settings.amplitude}
          min={0}
          max={0.3}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onValue={(amplitude) => onSettings({ amplitude })}
        />
        <ParameterSlider
          label="2× centerline strength"
          value={settings.harmonic}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onValue={(harmonic) => onSettings({ harmonic })}
        />
        <ParameterSlider
          label="Coherent mode fraction"
          value={settings.coherence}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onValue={(coherence) => onSettings({ coherence })}
        />
      </div>
      <div className="vx-harmonic-guide" aria-label="Wake frequency components">
        <span>
          <b>1× · {settings.frequency.toFixed(2)} Hz</b>Alternating flanks
        </span>
        <span>
          <b>2× · {(2 * settings.frequency).toFixed(2)} Hz</b>Symmetric
          centerline · half the wavelength
        </span>
      </div>
      <div className="vx-pressure-map-layout">
        <article className="vx-pressure-map">
          <div className="vx-pressure-map-title">
            <h3>
              Unwrapped OML · {model.bodies[props.selected]?.name ?? "Core"}
            </h3>
            <SegmentedControl
              label="Pressure units"
              value={unit}
              options={[
                { value: "cp", label: "Cp′" },
                { value: "pa", label: "Pa" },
              ]}
              onChange={onUnit}
            />
          </div>
          <SurfaceMap {...props} />
          <PressureLegend unit={unit} limit={limit} />
          <label className="vx-scale-select">
            Fixed color limit ±{" "}
            <select
              aria-label="Pressure color limit"
              value={limit}
              onChange={(e) => onLimit(Number(e.target.value))}
            >
              {(unit === "cp"
                ? [0.1, 0.25, 0.5]
                : [500, 2000, 10000, 50000]
              ).map((v) => (
                <option key={v} value={v}>
                  {v} {unit === "cp" ? "Cp′" : "Pa"}
                </option>
              ))}
            </select>
          </label>
          <p>
            Vertical dashed line: forward attachment. Downstream dashed paths:
            projected wake centerlines (2×). θ starts at drawing +Z and turns
            toward starboard. Values beyond the color limit saturate. Regions
            upstream of the attachment have no modeled fluctuation.
          </p>
        </article>
        <aside className="vx-tap-controls">
          <h3>Move a pressure tap</h3>
          <button
            className="vx-compare-harmonics"
            onClick={props.onCompare}
            disabled={!model.settings.boosters}
          >
            Compare 1× flank / 2× centerline
          </button>
          <p>
            The comparison places A on a flank and B on the centerline at the
            same station. Taps then stay fixed to the skin as flow angles
            change.
          </p>
          <SegmentedControl
            label="Active pressure tap"
            value={String(activeTap)}
            options={[
              { value: "0", label: "Tap A" },
              { value: "1", label: "Tap B" },
            ]}
            onChange={(value) => onActive(Number(value))}
          />
          <label htmlFor="vx-tap-body">Tap body</label>
          <select
            id="vx-tap-body"
            value={tap.body}
            onChange={(e) => onPlace({ ...tap, body: Number(e.target.value) })}
          >
            {model.bodies.map((b) => (
              <option key={b.index} value={b.index}>
                {b.name}
              </option>
            ))}
          </select>
          <ParameterSlider
            label="Tap distance aft of nose"
            value={noseY(body) - tap.y}
            min={0.1}
            max={noseY(body) - TAIL}
            step={0.1}
            unit="m"
            format={(v) => v.toFixed(1)}
            onValue={(s) => onPlace({ ...tap, y: noseY(body) - s })}
          />
          <ParameterSlider
            label="Tap circumferential angle"
            value={(tap.theta * 180) / Math.PI}
            min={0}
            max={359}
            step={1}
            unit="°"
            format={(v) => v.toFixed(0)}
            onValue={(theta) =>
              onPlace({ ...tap, theta: (theta * Math.PI) / 180 })
            }
          />
          <p>
            Click the skin to place <b>Tap {activeTap ? "B" : "A"}</b>. Orbit to
            reach the far side, or use these controls. The map follows “Inspect
            a body” above.
          </p>
        </aside>
      </div>
      <Signals {...props} />
      {model.speed > 0 &&
        convectionSpeed(model) / (settings.frequency * MAX_MODE_RATIO) <
          (2 * 56) / 159 && (
          <p className="vx-pressure-resolution">
            Fine spatial oscillations exceed the surface display resolution at
            this speed/frequency. Lower the prescribed frequency or increase
            Mach to resolve them. Tap calculations remain analytic.
          </p>
        )}
      <p className="vx-pressure-assumption">
        Cp′ = p′ / q∞. Mach changes q∞ and the assumed convection speed Uc =
        0.65 Uaxial. The 2× component is phase-locked to twice the prescribed
        shedding frequency. Its strength is an assumed scale relative to the
        peak 1× flank mode. Lower coherence mixes three spatial modes; it is not
        measured coherence or a turbulence model. Parameter changes restart the
        synthetic clock. Attachment shedding persists in axial flow and
        disappears when the boosters are removed. Shock–wake interaction,
        gap-flow amplification, real boundary-layer and base pressures require a
        different model.
      </p>
    </section>
  );
}
