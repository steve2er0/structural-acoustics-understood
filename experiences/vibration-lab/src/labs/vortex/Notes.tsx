import { useEffect } from "react";
import { X } from "lucide-react";
export default function Notes({ close }: { close: () => void }) {
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const panel = document.querySelector<HTMLElement>(".vx-notes");
    panel?.querySelector("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && panel) {
        const els = [...panel.querySelectorAll<HTMLElement>("button,a[href]")];
        const first = els[0],
          last = els[els.length - 1];
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
    <div className="vx-backdrop" onClick={close}>
      <section
        className="vx-notes"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vx-notes-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="vx-close"
          onClick={close}
          aria-label="Close model notes"
        >
          <X size={21} />
        </button>
        <p className="vl-eyebrow">MODEL / ASSUMPTIONS / REFERENCES</p>
        <h2 id="vx-notes-title">A window into the wake.</h2>
        <p>
          A prescribed forward-attachment wake and pressure field on a generic
          core-and-two-booster launcher. The golden booster-to-core brackets are
          the sources; disturbances convect aft and load the facing OML
          surfaces. This is not CFD or a flight-load prediction.
        </p>
        <h3>Full velocity, two components</h3>
        <code>U = M√(γRT) · Uaxial = U cosα cosβ</code>
        <code>U⊥ = U√(sin²β + sin²α cos²β)</code>
        <p>
          Body axes are X noseward, Y starboard, Z down. Vehicle velocity is
          U(cosα cosβ, sinβ, sinα cosβ); relative air moves oppositely. Drawing
          axes map body (X,Y,Z) to (Y,X,−Z). All blue 3D arrows show the full
          air vector. The arrow in the midbody inset shows only its crossflow
          component; axial flow is into that page.
        </p>
        <p>
          Air is fixed at 288.15 K, 1.225 kg/m³ and μ = 1.7894×10⁻⁵ Pa·s, with γ
          = 1.4 and R = 287.05 J/(kg·K). Mach changes speed, not altitude.
          Controls span α and β from −30° to +30° to focus on forebody flow.
        </p>
        <h3>The forward attachment is the source</h3>
        <p>
          NASA SLS studies identify large pressure fluctuations downstream of
          the booster-to-core forward attachment hardware. Its shed wake can
          interact with the booster nose-cone expansion shock near transonic
          conditions. This supports the source location and mechanism, not the
          amplitudes or shapes prescribed here.
        </p>
        <p>
          The highlighted bracket is at axial drawing coordinate Y = 8.5 m,
          matching the existing forward connection. Roll-up packets leave this
          location and convect aft at an assumed 0.65 Uaxial. The source remains
          active in axial flow. Removing the boosters removes both attachment
          sources. The aft bracket remains visible but has no separate source in
          this first model.
        </p>
        <p>
          Incidence skews a constrained illustrative path through each gap; the
          near-body transverse drift uses 0.25 of the free-stream slope and
          bounded lateral displacement. Beyond the tail it follows the full
          relative-air direction. No gap amplification, aerodynamic shielding,
          vortex interaction or shock motion is calculated.
        </p>
        <h3>Surface pressure: prescribed traveling modes</h3>
        <code>p′ = p − mean(p) = q∞ Cp′ · q∞ = ½ρU²</code>
        <code>phase = 2π f (t − s / Uc) · Uc = 0.65 Uaxial</code>
        <p>
          The pressure-paint view shows a zero-mean synthetic fluctuation field,
          not a pressure solution inferred from the drawn vortices. An
          antisymmetric 1× mode changes sign across each attachment wake; a
          symmetric 2× mode peaks on its centerline and is phase-locked at twice
          the shedding frequency. This is the wake center projected onto the
          facing OML, not the launch vehicle axis. Their amplitude, width,
          frequency and development are assumptions. Regions ahead of the
          forward attachment have no modeled contribution. Blue means below the
          local mean, not negative absolute pressure.
        </p>
        <p>
          The coherent fraction mixes the phase-locked 1×/2× pair with three
          spatially weighted tones at 0.73f, 1.37f and 1.91f. It is a mixing
          parameter, not measured coherence. The line spectrum gives exact
          mean-square power per tone; its sum equals RMS squared. No broadband
          PSD is claimed. Tap histories reconstruct four seconds at the current
          settings; they are not recorded measurements. Correlation is the
          full-period zero-lag correlation of the prescribed modes on one body.
          Inter-body coupling is not calculated. Δs/Uc is a convection
          reference, not a measured lag.
        </p>
        <p>
          Pressure colors, map and taps share one model and clock. Pa uses the
          current dynamic pressure; Cp′ removes that scaling. Color limits stay
          fixed until changed. Pressure fluctuations vanish at zero speed or
          when the boosters are removed. They persist at zero incidence. Real
          base and boundary-layer pressures are omitted. Surface tap labels
          remain visible through the geometry.
        </p>
        <h3>A separate crossflow reference scale</h3>
        <code>fref = St U⊥ / D · Re⊥ = ρU⊥D/μ</code>
        <p>
          St defaults to 0.20 and is editable. This cylinder-based scale does
          not predict periodic shedding of the longitudinal pair and does not
          drive the swirl animation. The nominal Re⊥ = 47 cylinder gate only
          applies to the reference frequency; it is not a launcher onset rule.
          No force or pressure history is inferred from this scale.
        </p>
        <h3>Geometry and clock</h3>
        <p>
          The core barrel is 5 m in diameter and 43 m long; boosters are 3.2 m
          by 35 m. The adjustable gap is barrel surface-to-surface separation.
          Shapes share a 0.2 drawing-unit/m scale. The forward attachment
          geometry and prescribed wake development are generic, not an SLS
          geometry or separation solution.
        </p>
        <p>
          Physical seconds per viewing second are playback × min(1, 28/U). An
          additional limiter keeps the highest pressure tone below four cycles
          per viewing second at full playback. The multiplier is shown beside
          playback. Integrated axial travel drives the 3D transport, while the
          same physical clock drives the surface, unwrapped map and pressure
          signals. Pause freezes all views. Parameter edits reconfigure paths
          immediately without simulating a fluid transient.
        </p>
        <h3>Limits</h3>
        <p>
          At zero incidence the attachment wake remains active. Base wakes and
          exhaust are omitted. Above total Mach 0.3 compressibility is flagged,
          even if crossflow Mach is small. Shocks, transonic buffet, gap jets,
          wake coupling, asymmetric states, turbulence, aeroelasticity and
          aerodynamic loads are not solved.
        </p>
        <h3>Primary references</h3>
        <ul>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20160008008"
              target="_blank"
              rel="noreferrer"
            >
              NASA — Booster Interface Loads: forward-attachment wake and shock
              interaction ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20220017645"
              target="_blank"
              rel="noreferrer"
            >
              NASA — Parametric Study of Forward Attachment Geometry ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nasa.gov/centers-and-facilities/ames/fluctuating-forces-of-flight-captured-by-new-high-tech-paint/"
              target="_blank"
              rel="noreferrer"
            >
              NASA — unsteady pressure-sensitive paint (visual inspiration, not
              model calibration) ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/api/citations/19880004167/downloads/19880004167.pdf"
              target="_blank"
              rel="noreferrer"
            >
              NASA TM 88332, §2.7 — longitudinal vortices on bodies of
              revolution ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.grc.nasa.gov/www/wind/valid/lamcyl/Study1_files/Study1.html"
              target="_blank"
              rel="noreferrer"
            >
              NASA — wake-centerline frequency doubling and Strouhal definition
              ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.mdpi.com/2076-3417/9/8/1590"
              target="_blank"
              rel="noreferrer"
            >
              Yawed cylinder study — independence principle and end effects ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20230018133"
              target="_blank"
              rel="noreferrer"
            >
              NASA — asymmetric gap-flow switching on a clustered launcher ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20160007661"
              target="_blank"
              rel="noreferrer"
            >
              NASA — sensitivity of SLS buffet forcing ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nas.nasa.gov/SC15/demos/demo16.html"
              target="_blank"
              rel="noreferrer"
            >
              NASA — transonic shock/wake interactions and buffet ↗
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
