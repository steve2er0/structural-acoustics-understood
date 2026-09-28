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
          A kinematic illustration of longitudinal leeward vortices on a generic
          core-and-two-booster launcher. Air moves from nose to tail, and
          vortices develop along the bodies. This is not CFD or a flight-load
          prediction.
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
        <h3>A longitudinal pair, not an alternating street</h3>
        <p>
          In the illustrated flow, two opposite-sense cores coexist on the lee
          side. Their development is spatial, from the forebody shoulders along
          the barrel. The midbody cut shows the same cores as the 3D view.
          Actual separation, onset, asymmetry and breakdown depend on geometry
          and flow conditions; this symmetric pattern is a teaching assumption.
        </p>
        <p>
          Core paths, swirl radius, pitch and visibility are prescribed. Orange
          and teal identify opposite rotation, not pressure or temperature.
          Tracers move aft at an assumed axial convection speed of 0.65 Uaxial.
          Beyond the tail, the cores follow the full relative-air direction.
          Neighboring cores may overlap; vortex interaction and shielding are
          not calculated. These are not computed streamlines.
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
          Shapes share a 0.2 drawing-unit/m scale. Forebody source locations and
          path growth are visual assumptions, not a separation solution.
        </p>
        <p>
          Physical seconds per viewing second are playback × min(1, 28/U). The
          multiplier is shown beside playback. Integrated axial travel drives 3D
          tracers, the midbody rotation indicators and the development plot.
          Pause freezes all three. Parameter edits reconfigure paths immediately
          without simulating a fluid transient.
        </p>
        <h3>Limits</h3>
        <p>
          At zero incidence the illustrated pair fades while axial airflow
          continues. Base wakes, attachments and exhaust are omitted. Above
          total Mach 0.3 compressibility is flagged, even if crossflow Mach is
          small. Shocks, transonic buffet, gap jets, wake coupling, asymmetric
          states, turbulence, aeroelasticity and aerodynamic loads are not
          solved.
        </p>
        <h3>Primary references</h3>
        <ul>
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
              NASA — cylinder shedding and Strouhal definition ↗
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
