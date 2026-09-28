import { useEffect } from "react";
import { X } from "lucide-react";
export default function Notes({ close }: { close: () => void }) {
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null,
      panel = document.querySelector<HTMLElement>(".sea-notes");
    panel?.querySelector("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && panel) {
        const els = [...panel.querySelectorAll<HTMLElement>("button,a[href]")],
          first = els[0],
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
    <div className="sea-notes-backdrop" onClick={close}>
      <section
        className="sea-notes"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sea-notes-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="sea-close"
          aria-label="Close model notes"
        >
          <X size={20} />
        </button>
        <p className="vl-eyebrow">THE MODEL / ITS ASSUMPTIONS</p>
        <h2 id="sea-notes-title">An accounting system for vibration.</h2>
        <p>
          This Falcon 9 example adapts the native vehicle preset in your autoSEA
          workspace: aft skirt, first-stage barrel, interstage, second-stage
          barrel, payload deck, fairing shell and the fairing acoustic cavity.
          It is an educational energy model, not a correlated flight-response
          prediction.
        </p>
        <h3>Geometry and provenance</h3>
        <p>
          The autoSEA snapshot uses a 70 m vehicle, 3.7 m body diameter and a
          13.1 m by 5.2 m fairing envelope. The smooth fairing profile, internal
          stations and thicknesses are carried over from that preset. The
          assumed materials are aluminum (73.1 GPa, 2700 kg/m³, ν = 0.33) and an
          isotropic CFRP equivalent (55 GPa, 1600 kg/m³, ν = 0.30). These
          construction values are conceptual inputs, not SpaceX design data.
        </p>
        <p>
          The first stage is the default 1 W input, matching autoSEA. Source
          selection can put the same prescribed band power into any subsystem.
          Neither 1 W nor these loss factors represent a measured launch
          environment. Engine bells, folded legs and grid fins provide visual
          context only.
        </p>
        <h3>Seven simultaneous energy balances</h3>
        <code>dE/dt = P − ωLE · ω = 2πfc</code>
        <code>Pij = ω(ηij Ei − ηji Ej)</code>
        <code>ΣP = ΣPdiss + d(ΣE)/dt</code>
        <p>
          Six structural junctions connect the shell regions. Stage 2, the deck
          and the fairing share a three-way junction, including the direct
          stage-2/fairing path. Two additional paths connect the deck and
          fairing to the acoustic cavity. Every internal transfer cancels
          globally; arrows reverse with the calculated net power. Dashed network
          edges are structural/acoustic paths. No extra bypass is implied by the
          drawing.
        </p>
        <h3>Modal density and reciprocal coupling</h3>
        <code>ni ηij = nj ηji · N ≈ nΔf · modal energy = E/N</code>
        <p>
          The cylinders use autoSEA's isotropic NASA/plate-convergent
          modal-density branch: the ring frequency is cL/(2πR), with cL =
          √[Y/(ρ(1−ν²))]. The upper branch approaches the thin-plate density n =
          A/2 √(ρh/D), D = Yh³/[12(1−ν²)]. The deck uses a flat-plate
          approximation and the curved fairing an equivalent unrolled plate.
        </p>
        <p>
          Forward junction CLFs here are editable teaching values, not autoSEA's
          full wave-field junction solution. Reverse values are calculated from
          reciprocity at every band. The modal-density multiplier is a
          statistical what-if; it does not resize the vehicle. Equal total
          energies generally produce unequal energy per mode and nonzero
          exchange.
        </p>
        <h3>The acoustic cavity</h3>
        <code>nac = 4πVf²/c³ · ηac = ln(10⁶)/(ωT60)</code>
        <code>prms = √(Eac ρc²/V)</code>
        <p>
          The preset supplies an assumed 190 m³ air volume, 220 m² surface area
          and 1.5 s reverberation time. Air uses ρ = 1.225 kg/m³ and c = 343
          m/s. Only the volume enters the 3D asymptotic modal-density formula
          used here; the surface-area value is retained as metadata. Shorter T60
          removes acoustic energy faster. The pressure readout assumes a diffuse
          field. At low modal counts that approximation can be poor.
        </p>
        <h3>What the animation means</h3>
        <p>
          The same coupled solution drives the energy plots, glow and net-power
          arrows. Surface motion is an exaggerated realization, with drawing
          amplitude tied to √(E/m); it does not predict displacement, phase or
          solved mode shapes. Colors identify subsystems. The fairing becomes
          transparent when inspecting its cavity or the deck.
        </p>
        <p>
          A substepped RK4 integrator uses physical seconds. Playback advances
          at 5/fc physical seconds per viewing second. Pause freezes energy and
          motion; changing bands starts a new unenergized band. Other parameter
          changes retain energy and approach the new balance.
        </p>
        <h3>Scope and limits</h3>
        <p>
          This preserves autoSEA's geometry and subsystem topology, but not its
          complete solver. It omits exterior acoustic loading and radiation
          paths, detailed B/L/S wave-field coupling, stiffeners, orthotropy,
          propellant added mass, pressure/preload, payload response and test
          correlation. The six structural states represent shell/plate bending
          populations. Low mode count, low overlap, strong coupling and
          non-diffuse fields can undermine SEA assumptions; a high frequency
          alone does not establish validity.
        </p>
        <h3>References</h3>
        <ul>
          <li>
            <a
              href="https://www.spacex.com/vehicles/falcon-9/"
              target="_blank"
              rel="noreferrer"
            >
              SpaceX — Falcon 9 public envelope ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20110014791"
              target="_blank"
              rel="noreferrer"
            >
              NASA — cylindrical-shell SEA reference used by autoSEA ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/19730057019"
              target="_blank"
              rel="noreferrer"
            >
              NASA — power flow and average modal energies ↗
            </a>
          </li>
          <li>
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5415695/"
              target="_blank"
              rel="noreferrer"
            >
              Coupling-strength assumptions in SEA ↗
            </a>
          </li>
          <li>
            <a
              href="https://euphonics.org/3-2-4-the-modal-density-of-a-vibrating-plate/"
              target="_blank"
              rel="noreferrer"
            >
              Woodhouse — thin-plate modal density derivation ↗
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
