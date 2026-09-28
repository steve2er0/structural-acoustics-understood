import { useEffect } from "react";
import { X } from "lucide-react";
import { SENSOR, STIFFNESS, DAMPING, EFFECTIVE_CAPACITANCE } from "./physics";
export default function Notes({ close }: { close: () => void }) {
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null,
      panel = document.querySelector<HTMLElement>(".ac-notes");
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && panel) {
        const items = Array.from(
          panel.querySelectorAll<HTMLElement>("button,a[href]"),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prior?.focus();
    };
  }, [close]);
  return (
    <div className="ac-notes-backdrop" onClick={close}>
      <section
        className="ac-notes"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ac-notes-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="ac-close"
          onClick={close}
          aria-label="Close model notes"
        >
          <X size={20} />
        </button>
        <p className="vl-eyebrow">THE MODEL / ITS ASSUMPTIONS</p>
        <h2 id="ac-notes-title">A sensor is a system, too.</h2>
        <p>
          This is a representative single-axis annular-shear IEPE accelerometer,
          not a model or specification of a commercial product. A radially
          preloaded ceramic ring couples a central post to a surrounding seismic
          mass. Axial inertia loads the ring in shear.
        </p>
        <h3>One state, from acceleration to voltage</h3>
        <p>
          SI units are used internally. The manual slider freezes a flat-band
          dynamic instant: it is a sensitivity illustration, not a sustained
          static test. All sine amplitudes are <strong>peak</strong>;
          instantaneous values are labeled separately.
        </p>
        <code>m z̈ + c ż + k z = −m aᵦ</code>
        <p>
          z is mass displacement relative to the housing. The inertial drive
          −maᵦ is distinct from elastic piezo load kz near resonance. The
          dissipative load cż contributes to the total force on the mass but
          does not generate charge in this model.
        </p>
        <code>Hₘ = 1 / (1 − r² + i 2ζr) · r = f / fₙ</code>
        <code>Q = d(kz) · Hₑ = i(f/fc) / (1 + i(f/fc))</code>
        <code>Vₐ꜀ = −Hₑ Q / Ceff = S aᵦ Hₘ Hₑ</code>
        <p>
          The effective coefficient d is a single-axis approximation, not the
          full piezoelectric tensor. Electrode polarity and conditioning sign
          are chosen so positive flat-band acceleration gives positive AC
          voltage.
        </p>
        <dl>
          <div>
            <dt>Seismic mass</dt>
            <dd>3.00 g</dd>
          </div>
          <div>
            <dt>Internal resonance / damping</dt>
            <dd>24 kHz / ζ = 0.075</dd>
          </div>
          <div>
            <dt>Derived stiffness / damping</dt>
            <dd>
              {(STIFFNESS / 1e6).toFixed(2)} MN/m / {DAMPING.toFixed(2)} N·s/m
            </dd>
          </div>
          <div>
            <dt>Effective d / Ceff</dt>
            <dd>250 pC/N / {(EFFECTIVE_CAPACITANCE * 1e12).toFixed(2)} pF</dd>
          </div>
          <div>
            <dt>Sensitivity / electrical corner</dt>
            <dd>100 mV/g / 0.5 Hz</dd>
          </div>
        </dl>
        <h3>IEPE, at the system level</h3>
        <p>
          A representative {SENSOR.supplyCurrent * 1000} mA constant-current
          supply with 24 V compliance powers the internal conditioning over the
          same cable as the signal. The wire carries 12 V bias plus the AC
          voltage. A downstream coupling stage removes the bias. Cable
          capacitance, noise, saturation, temperature, and transistor details
          are outside this model. The available 0–10 g sine range stays within
          the assumed ±8 V signal headroom.
        </p>
        <h3>Physical motion and drawing motion</h3>
        <p>
          Internal displacement is calculated in metres and displayed in
          nanometres. The internal deformation drawing is magnified 40,000×.
          Housing travel is a normalized direction cue: sine displacement points
          opposite acceleration. It is not drawn to physical scale. The sine
          clock is capped at 0.75 Hz for viewing; physics and waveform time axes
          always use actual frequency.
        </p>
        <p>
          The sweep shows a succession of steady-state solutions, not a
          transient chirp. The highlighted band is the contiguous region within
          ±5% amplitude error. Stud attachment is idealized as rigid; mounting
          compliance, transverse response, body modes, and crystal nonlinearity
          are not simulated.
        </p>
        <h3>References</h3>
        <ul>
          <li>
            <a
              href="https://www.pcb.com/sensors-for-test-measurement/accelerometers/sensing-geometries"
              target="_blank"
              rel="noreferrer"
            >
              PCB — sensing geometries and shear loading ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.pcb.com/resources/technical-information/introduction-to-accelerometers"
              target="_blank"
              rel="noreferrer"
            >
              PCB — internal resonance and discharge time constant ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.pcb.com/resources/technical-information/signal-conditioning-basics"
              target="_blank"
              rel="noreferrer"
            >
              PCB — constant-current power, bias and signal conditioning ↗
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
