import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Solution } from "../shaker-model/model";
import { displayGain, playbackFrequency } from "../animation/motion";

export const SOURCES = [
  {
    title: "Tiwari, Puri & Saraswat · lumped shaker model (2017)",
    url: "https://journals.sagepub.com/doi/pdf/10.1177/0263092317693511",
    note: "Field/armature separation, magnetic circuit, suspension, back EMF, and real armature flexibility.",
  },
  {
    title: "Gomes et al. · conventional shaker section, Fig. 1b (2007)",
    url: "https://abcm.org.br/app/webroot/anais/cobem/2007/pdf/COBEM2007-2522.pdf",
    note: "Architecture check: stationary lower field winding, central and outer poles, and armature in the radial gap.",
  },
  {
    title: "Data Physics · voltage–current curves",
    url: "https://dataphysics.com/blog/amplifiers/understanding-voltage-current-curves-and-their-significance/",
    note: "Voltage and current constraints and the changing role of velocity/back EMF.",
  },
  {
    title: "Data Physics · choosing shaker size",
    url: "https://dataphysics.com/blog/shakers/how-to-choose-the-right-size-shaker/",
    note: "Total moving mass, payload, displacement, velocity and force ratings.",
  },
];
export default function Notes({
  open,
  onClose,
  solution: s,
}: {
  open: boolean;
  onClose: () => void;
  solution: Solution;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="notes-dialog"
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <article>
        <button
          className="close-notes icon-button"
          aria-label="Close model notes"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <p className="eyebrow">THE ENGINEERING BEHIND THE EXHIBIT</p>
        <h2>
          Two coils.
          <br />
          One coupled system.
        </h2>
        <p>
          This is a generalized, field-excited electrodynamic shaker. It is an
          educational model, not a specification or qualification tool for a
          commercial machine.
        </p>
        <h3>A credible magnetic circuit</h3>
        <p>
          The stationary DC field winding surrounds the lower center pole. Flux
          rises through that pole, crosses the annular working gap radially,
          returns through the outer steel yoke, and closes through the base. The
          moving drive winding occupies the gap. Its circumferential current
          gives axial force: <b>F = BLi</b>. The field winding and drive winding
          are electrically separate.
        </p>
        <p>
          The drawing enlarges the gap, simplifies the winding turns, suspension
          and cooling port, and removes a 120° housing/yoke sector. Exploded
          mode separates parts for inspection; its underlying calculations still
          describe the assembled machine. Flux tracers indicate direction, not
          particles traveling through a static field.
        </p>
        <h3>What is calculated</h3>
        <p>
          The housing is fixed. A rigid moving assembly obeys{" "}
          <b>(mₐ + mₚ)a + cv + kx = BLi</b>. The coil terminal voltage obeys{" "}
          <b>V = Ri + Lₑ di/dt + BLv</b>. Back EMF is in phase with velocity.
          Its sign is defined as an opposing voltage drop in the drive circuit;
          it can return energy to the amplifier during part of a cycle.
        </p>
        <p>
          Sine mode solves the steady harmonic response with complex phasors.
          Peak displacement, velocity and acceleration share their correct
          phases. An ideal current controller reduces the requested sinusoidal
          amplitude to satisfy all modeled limits, without clipping the
          waveform. It does not hold acceleration constant.
        </p>
        <p>
          Manual mode shows DC equilibrium: x = BLi/k, v = a = 0. Current
          reversal moves the drawing smoothly between equilibria; this visual
          transition is not a transient dynamic solution. Weight is removed
          about a supported equilibrium; the changing static payload sag is not
          modeled.
        </p>
        <h3>Representative parameters</h3>
        <dl className="parameter-list">
          {[
            ["Armature mass", "12 kg"],
            ["Payload range", "0–60 kg"],
            ["Suspension", "60 kN/m · 250 N·s/m"],
            ["Drive winding", "0.8 Ω · 1.2 mH · 66.67 m active wire"],
            ["Field winding", "12 A DC · 5 Ω · 600 turns"],
            ["Nominal gap flux / BL", "1.2 T / 80 N/A"],
            ["Current / voltage limits", "60 A peak / 120 V peak"],
            ["Stroke / velocity limits", "±12.5 mm / 1 m/s peak"],
            ["Continuous drive copper loss", "1,600 W"],
            ["Manual current / sine frequency", "±8 A DC / 1–2,000 Hz"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h3>Magnetics and heating</h3>
        <p>
          B = 1.6 tanh[atanh(0.75) · Ifield/12] T is an assumed, smoothly
          saturating calibration, giving 1.2 T at 12 A. It is not a
          finite-element solution. Flux density is uniform in the active gap;
          fringing, hysteresis, eddy currents and coil-position dependence are
          omitted. The field is treated as settled at each control setting.
        </p>
        <p>
          Field heating is Ifield²Rfield (720 W at full field). Drive copper
          heating uses Ipeak²R/2 for sine and I²R for DC. Mean mechanical loss
          is c·vpeak²/2. The remaining ideal moving mass and spring store and
          return energy. Amplifier losses, coil temperature, cooling capacity
          and test-article dissipation are not modeled.
        </p>
        <h3>How the envelope is derived</h3>
        <p>
          At each frequency the response to 1 A is calculated, including mass,
          suspension and back EMF. The allowable current is the smallest of the
          limits imposed by stroke, velocity, peak current, terminal voltage and
          continuous copper loss. Multiplying this current by the acceleration
          per ampere gives the plotted capability. Some limits never control the
          curve for a given parameter set; a fixed sequence of four regimes is
          not imposed.
        </p>
        <p>
          Near suspension resonance, simple F = ma alone is insufficient. In the
          mass-controlled region, adding payload at the same available
          electromagnetic force reduces acceleration. At high frequency the
          rigid model omits coil/table compliance and structural modes; a real
          shaker or fixture can reach other limits sooner.
        </p>
        <h3>Calculated physics and visible motion</h3>
        <p>
          Physical values remain in SI units internally. The drawing uses 10
          scene units per metre and a displacement gain of{" "}
          <b>{displayGain(s).toPrecision(3)}×</b>. In sine mode the gain depends
          only on frequency and a fixed bare-table reference, so changing field
          strength, drive current or payload at that frequency preserves
          amplitude ratios. Playback is{" "}
          <b>{playbackFrequency(s.parameters.frequency).toFixed(2)} cycles/s</b>
          , while the actual excitation is {s.parameters.frequency.toFixed(1)}{" "}
          Hz. Vectors use compressed lengths for readability; the signed force
          readouts are physical.
        </p>
        <h3>Sources checked before building</h3>
        <ul className="sources">
          {SOURCES.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title} ↗
              </a>
              <span>{source.note}</span>
            </li>
          ))}
        </ul>
        <p className="notes-footer">
          Original procedural geometry and interface. Inspired by the spatial
          teaching of Plane of Focus and the companion Vibration Isolation
          exhibit.
        </p>
      </article>
    </dialog>
  );
}
