import { useEffect } from "react";
import { X } from "lucide-react";
export default function Notes({ close }: { close: () => void }) {
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null,
      panel = document.querySelector<HTMLElement>(".rs-notes");
    panel?.querySelector("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && panel) {
        const els = [...panel.querySelectorAll<HTMLElement>("button,a[href]")];
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0]?.focus();
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
    <div className="rs-backdrop" onClick={close}>
      <section
        className="rs-notes"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rs-notes-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="rs-close"
          onClick={close}
          aria-label="Close model notes"
        >
          <X size={20} />
        </button>
        <p className="vl-eyebrow">ENGINE ARCHITECTURE / EDUCATIONAL MODEL</p>
        <h2 id="rs-notes-title">Real cycle. Declared simplifications.</h2>
        <p>
          This is a procedural RS-25-inspired exhibit. Component positions,
          ducts, blade shapes and injector streams are simplified for
          visibility. It is not engine CAD, CFD, a control-law simulation or an
          operational procedure.
        </p>
        <h3>Architecture checked against NASA</h3>
        <p>
          The detailed heritage cycle retains the two serial pressure stages per
          propellant, both fuel-rich preburners, the HP turbine exhaust paths to
          the main injector, and distinct chamber/nozzle hydrogen cooling
          branches. Warm chamber coolant powers LPFTP, then cools the powerhead
          and enters the injector. LPOTP uses a hydraulic oxygen loop from HPOTP
          returning to the LPOTP outlet. An additional HPOTP boost stage
          supplies preburner oxygen. Secondary bleeds, tank pressurization and
          purge circuits are omitted.
        </p>
        <p>
          The 2011 engine paper’s detailed description and the public HAER
          schematic resolve these routes. The 2020 sensor-validation report uses
          a more condensed fuel-side description; it is not used to reroute the
          LPFTP exhaust to the preburners.
        </p>
        <h3>A heritage operating envelope</h3>
        <p>
          Explore 67–109% of original rated power. NASA’s heritage table gives
          512,271 lbf vacuum/altitude thrust, 2,994 psia chamber pressure and
          452 s altitude specific impulse at the upper reference. Modern SLS
          configurations have higher rated levels; this model deliberately stops
          at 109%. 100% denotes the original rating, not the limit of later
          engines.
        </p>
        <h3>What the numbers mean</h3>
        <p>
          Let s = RPL/109. Mass flow and chamber pressure scale with s.
          Reference mass flow is derived from F/(g₀Isp), with a representative
          fixed oxygen/hydrogen mass ratio of 6. Shaft speed is normalized:
          N/Nref = √s; the assumed pump head law Δp ∝ N² then gives a pressure
          rise proportional to s. This is a chosen teaching map, not measured
          throttle-map interpolation.
        </p>
        <code>Pfluid = Δp ṁ/ρ · Pshaft = Pfluid/ηpump</code>
        <p>
          Assumed liquid densities are 71 and 1,141 kg/m³. At 109%, assumed LH₂
          rises are 1.6 and 42.2 MPa; LOX rises are 2.6 and 27.2 MPa, plus 15
          MPa for the preburner boost stage. Feed pressure is 0.2 MPa. Pump
          efficiencies are 0.72/0.82 (LP/HP fuel), 0.75/0.80 (LP/HP oxygen),
          with 0.75 for the boost stage. These values illustrate pressure and
          power, not certified component operating data.
        </p>
        <p>
          Mechanical efficiency is 0.98. Turbine work equals shaft load plus
          mechanical loss. LPOTP hydraulic efficiency is 0.78; its recycle mass
          flow is derived from the required LP shaft work and the HP-to-LP
          pressure drop, and included in the HP pump load.
        </p>
        <h3>Branch and energy accounting</h3>
        <p>
          Illustrative hydrogen allocations: 20% chamber coolant, 45% nozzle
          coolant and 35% bypass. The latter two feed preburners. Eight percent
          of net oxygen feeds preburners; the remainder reaches the main
          injector. Preburner feeds split 65:35 between fuel and oxygen units.
          These are explicitly assumed fractions, not NASA flow-split data. All
          modeled propellant reaches the exhaust; recycled oxygen is counted
          only once as engine consumption.
        </p>
        <p>
          Hydrogen reaction energy uses 120 MJ/kg and 8 kg O₂ per kg reacted H₂.
          Preburner heat plus main-chamber heat equals total chemical release.
          HP turbine work is taken from preburner gas; LPFTP work is taken from
          internally recovered coolant heat. Total chemical release closes
          against exhaust kinetic energy, residual exhaust enthalpy and an
          assumed 2% external heat loss. The 3% coolant heat-transfer
          illustration is internal and is not counted again as a loss or energy
          source.
        </p>
        <code>F = ṁVe + (Pe − Pa)Ae</code>
        <p>
          Ambient pressure Pa is adjustable from 0 to 101.325 kPa. Thrust is
          evaluated at the selected ambient pressure; the engine remains fixed
          to its chosen operating map. Ve = 4,300 m/s is assumed; exit pressure
          is calibrated so the momentum and pressure terms sum to the NASA
          reference thrust. Exit diameter is 2.29 m. Fixed mixture, velocity and
          geometry make vacuum thrust proportional to RPL in this particular
          model. That is not a general identity between command percentage and
          thrust in all conditions. Local nozzle pressure and speed diagrams are
          conceptual, not a solved flow field.
        </p>
        <h3>Shock diamonds and ambient pressure</h3>
        <p>
          The shock-cell pattern illustrates an imperfectly expanded supersonic
          jet. When Pe is below Pa, the jet initially contracts; above Pa, it
          expands. Recompression creates bright standing regions while gas
          travels through them. Matching Pe and Pa suppresses the cells. In
          vacuum there is no atmospheric confinement and no repeating
          atmospheric cell train.
        </p>
        <p>
          A fixed ideal-gas γ = 1.22 estimates the fully expanded Mach number
          and jet diameter from chamber-to-ambient pressure ratio. A
          characteristic spacing proportional to Dj √(Mj² − 1) drives the visual
          pattern. This is an educational trend model, not an RS-25
          shock-spacing correlation. Longitudinal spacing is compressed to 64%
          for inspection; brightness, color and decay are illustrative. No
          nozzle separation, side loads, Mach-disk topology, reacting-flow
          chemistry or calibrated radiance is solved. Strong sea-level
          overexpansion is therefore qualitative only.
        </p>
        <p>
          The engine geometry follows the proportions and distinctive
          reinforcement rings of the public heritage drawing, with a denser
          asymmetric powerhead. Small harnesses and fasteners are
          representative. The horizontal view rotates the same model for plume
          inspection; it does not depict a flight installation.
        </p>
        <h3>Photo-guided powerhead and pogo accumulator</h3>
        <p>
          The HAER sheet 2 elevations and nozzle-removed photographs 17 and 18
          guide the machinery layout. Pump shafts run along the engine axis: the
          LP units have upper inlets and lower turbines; the HP units hang
          beside the chamber with their turbines beneath the preburners. Large
          transfer ducts loop from the LP outlets to the lower HP inlets. The
          short gimbal bearing, compact powerhead and nozzle proportions follow
          those views. Exact clocking, housings and pipe centerlines remain
          approximations.
        </p>
        <p>
          The external model uses the supplied engine photographs and public
          heritage views: a solid nozzle jacket with reinforcement hoops, large
          looping feed ducts, different cast turbopump housings, a controller
          connector bank and a spherical pogo accumulator. Dimensions, small
          fittings and routing clearances are illustrative.
        </p>
        <p>
          The accumulator connects to the low-pressure oxidizer discharge duct
          between LPOTP and HPOTP. Heritage SSME operation uses a helium
          precharge followed by a gaseous-oxygen supply. The gas/liquid
          interface shown in cutaway explains compliance; internal baffles,
          exact liquid level and coupled vehicle pogo dynamics are not solved.
        </p>
        <h3>LPFTP blade tones and higher-order cavitation</h3>
        <p>
          The LPFTP study distinguishes blade passage from higher-order surge
          cavitation (HOSC). The 2006 NASA feed-line/inducer study describes
          four main blades and four splitters, a nominal 15,761 rpm at 104.5%
          rated power, and spectral components at 4N, 8N and 16N. Here N means
          shaft revolutions per second: rpm ÷ 60. The blade-pass frequency is
          4N.
        </p>
        <p>
          NASA's inducer uncertainty study reports HOSC at approximately
          6.4–6.7N. This is a distinct excitation, not an integer harmonic of
          blade passage. Its circumferentially in-phase pulsation sends a
          pressure wave upstream and downstream. Overlap with a compatible
          structural mode can matter; this exhibit does not solve modal
          coupling, stresses, damping, fatigue or flight limits.
        </p>
        <p>
          The speed illustration uses 15,761 √(RPL/104.5) rpm. Only the anchor
          is sourced; the square-root map is the lab's chosen scaling. The three
          blade-tone RMS amplitudes are 1, 0.38 and 0.16 in arbitrary common
          pressure units. HOSC amplitude is 1.15 times the excitation slider.
          There are no calibrated pascals, broadband noise or PSD values. The
          shaded band denotes the reported order range, not simultaneous
          broadband forcing. One selected HOSC tone is summed with the blade
          tones in the time trace, using peak = √2 × RMS.
        </p>
        <p>
          Power changes the frequency mapping; it does not predict cavitation
          onset. Source selection isolates contributions for comparison, and the
          excitation slider changes only an illustrative amplitude. The steady
          spectrum appears after the startup reveal. Rotor motion and signal
          phases use one clock slowed 1,200 times. The close-up shows violet
          vapor sheets growing and collapsing together; the phase indicator
          follows the same clock. Vapor dimensions are exaggerated for
          visibility. Cavity volumes, blade profiles and pressure-wave travel
          distances are schematic. Optional audio synthesizes the displayed
          frequencies at a quiet fixed gain; it is not recorded engine sound or
          calibrated loudness. Pause silences it and leaving this section closes
          the audio.
        </p>
        <h3>Startup is an ordered reveal</h3>
        <p>
          The eight-second sequence reveals a settled operating solution:
          propellant paths, pumps, preburners/turbines, chamber, then exhaust.
          Readouts are withheld until completion. It does not predict valve
          timing, spin-up, ignition transients, cavitation, purge flow or
          startup mass inventories. Pause freezes motion and reveal. Shutdown
          returns directly to the unpowered display.
        </p>
        <p>
          Rotors and flow markers run at slowed display speeds tied to the same
          commanded state. Markers show direction, not individual molecules or
          precise transit times. Exploded positions and representative wall
          channels expose topology; they are not an assembly procedure.
        </p>
        <h3>Public references</h3>
        <ul>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20060050367"
              target="_blank"
              rel="noreferrer"
            >
              NASA — LH₂ feed-line / LPFP inducer interaction: blade count,
              nominal speed and 4N / 8N / 16N spectra (2006) ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20205011295"
              target="_blank"
              rel="noreferrer"
            >
              NASA — inducer eigenvalue uncertainty: 6.4–6.7N HOSC excitation ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20200001729"
              target="_blank"
              rel="noreferrer"
            >
              NASA — modal correlation in liquid hydrogen: in-phase HOSC and
              fluid / structure effects ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.loc.gov/pictures/item/tx1115.photos.579973p/"
              target="_blank"
              rel="noreferrer"
            >
              NASA / Library of Congress — fuel-side machinery, nozzle removed
              (HAER photo 17) ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.loc.gov/pictures/collection/hh/item/tx1115.photos.579974p/"
              target="_blank"
              rel="noreferrer"
            >
              NASA / Library of Congress — oxidizer pumps, heat exchanger and
              pogo accumulator (HAER photo 18) ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.loc.gov/pictures/item/tx1115.photos.579969p/"
              target="_blank"
              rel="noreferrer"
            >
              NASA / Library of Congress — oxygen duct, spherical pogo
              accumulator and controller ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20090034946"
              target="_blank"
              rel="noreferrer"
            >
              NASA — heritage SSME accumulator operation, in Ares I design
              analysis ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nasa.gov/image-article/into-blue-sky/"
              target="_blank"
              rel="noreferrer"
            >
              NASA — Shuttle main-engine shock diamonds ↗
            </a>
          </li>
          <li>
            <a
              href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/nozzle-design/"
              target="_blank"
              rel="noreferrer"
            >
              NASA Glenn — expansion and nozzle design ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/19850067203"
              target="_blank"
              rel="noreferrer"
            >
              NASA — imperfectly expanded jet shock-cell structure ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20120001539"
              target="_blank"
              rel="noreferrer"
            >
              NASA / Van Hooser & Bradley — engine cycle and heritage operating
              table (2011) ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nasa.gov/wp-content/uploads/2024/12/space-shuttle-main-engine-drawings.pdf?emrc=e914d4"
              target="_blank"
              rel="noreferrer"
            >
              NASA — HAER SSME external form and flow schematic ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20205000446"
              target="_blank"
              rel="noreferrer"
            >
              NASA — RS-25 system description, §3.1 (2020) ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nasa.gov/reference/space-launch-system-rs-25-core-stage-engine/"
              target="_blank"
              rel="noreferrer"
            >
              NASA — current SLS RS-25 context and power levels ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nasa.gov/centers-and-facilities/marshall/engineers-chill-space-launch-system-rocket-engines-before-launch/"
              target="_blank"
              rel="noreferrer"
            >
              NASA — cryogenic propellant temperatures and prechill ↗
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
