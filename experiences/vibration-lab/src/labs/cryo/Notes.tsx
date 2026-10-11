import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { convergenceDiagnostics, LEGACY_DEFAULT } from "./physics";
export default function Notes({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const convergence = useMemo(() => convergenceDiagnostics(LEGACY_DEFAULT), []);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => prior?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="cryo-notes"
      onCancel={close}
      aria-labelledby="cryo-notes-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="cryo-notes-content">
        <button
          className="cryo-close"
          aria-label="Close model notes"
          onClick={close}
        >
          <X size={20} />
        </button>
        <p className="vl-eyebrow">MECHANICS / ASSUMPTIONS / SOURCES</p>
        <h2 id="cryo-notes-title">
          A shell, its liquid, and a moving surface.
        </h2>
        <p>
          The baseline is an unstiffened aluminum tank: 8.4 m diameter, 16.8 m
          total height, and 6.35 mm wall thickness. Two 2:1 ellipsoidal domes
          are 2.1 m deep each; the cylindrical barrel is 12.6 m long. Material
          properties stay fixed at E = 69 GPa, ν = 0.33, and ρ = 2700 kg/m³. LOX
          is represented at 1140 kg/m³ and LH₂ at 70.8 kg/m³.
        </p>
        <h3>Two pressure terms, one prestress state</h3>
        <code>pnet(z) = pullage,gauge + ρℓ aeff max(h − z, 0)</code>
        <p>
          Ullage is a differential pressure relative to the exterior. Effective
          acceleration already includes the gravity contribution in the intended
          load case. Pressure acts on the closed tank; the accelerated liquid
          transfers a net load to the tank. The demo uses a stated equivalent
          balancing load for the prestress reduction. The structural trial space
          contains elastic shapes and excludes rigid tank motions; it is not a
          complete free-free model.
        </p>
        <h3>Re-solve the coupled system</h3>
        <code>[Kdry + KG] φ = ω² [Mdry + MA] φ</code>
        <p>
          Added mass is a matrix: wall motions communicate through the fluid.
          Partial fill creates off-diagonal terms between axial shell basis
          functions. The demo approximates pressure-induced geometric stiffness
          using prescribed barrel tension, rather than solving the full loaded
          equilibrium. The comparison controls expose dry, inertia only,
          prestress only, and both effects.
        </p>
        <p>
          The full comparison adds the selected angular and radial free-surface
          coordinates and their coupling to the structural coordinates. The
          fluid inertia and free-surface basis are assembled consistently;
          adding a second copy of the slosh liquid mass would double-count the
          fluid. Axisymmetric geometry preserves circumferential orthogonality,
          so modes with different azimuthal orders do not exchange energy in
          this reduction.
        </p>
        <p>
          The shell inspector and animation cover n = 0–12, retaining five axial
          trials for each represented orientation: 80 shell coordinates and a
          configurable surface basis in the partial-fill coupled system. Orders
          n = 1–3 include cosine/sine partners; n = 4–12 show one representative
          cosine orientation. Each family exposes its first three tracked shell
          branches.
        </p>
        <h3>Angular families and radial surface shapes</h3>
        <p>
          The default basis covers n = 0–12 with two radial shapes per
          represented angular orientation: 32 coordinates. Low n = 1–3 has
          sine/cosine partners; higher n has cosine representatives matching the
          shell. Select up to four strictly positive derivative-Bessel roots per
          family. The constant axisymmetric surface shape is excluded;
          volume-conserving mean motion is handled separately.
        </p>
        <p>
          n ≤ 3 with one radial shape reproduces the original seven. Orders
          above the selected cutoff use a constrained surface. Multiple radial
          shapes share the full liquid kinetic-energy and gravity matrices. They
          are reference shapes generated here, rather than imported tank FE
          modes.
        </p>
        <h3>Check the basis across fill</h3>
        <p>
          Surface convergence compares one to three radial shapes with a
          four-shape reference at 17 sampled fills and every selected angular
          family. Corresponding coupled modes are matched by kinetic-energy MAC.
          The selected dry-shell branches and the first surface branch within
          the band are checked. Passing requires the chosen frequency tolerance,
          liquid/shell kinetic-ratio change ≤0.05 × max(1, reference ratio) for
          shell targets, MAC ≥0.90 and unambiguous eigenvalues.
        </p>
        <p>
          The common 8×20 liquid potential space isolates surface truncation; a
          separate 9×22 calculation checks potential frequency sensitivity. A
          numerical failure, ambiguous match or failed potential check leaves
          the sample unresolved. The four-shape cap and sampled grid do not
          prove continuum completeness or convergence between samples. Surface
          refinement does not refine the five shell trials.
        </p>
        <h3>Compare the free-surface boundaries</h3>
        <p>
          Surface boundary analysis re-solves one angular family with the same
          five shell trials and stiffness in three liquid models. The current
          model retains its existing surface condensation. Constrained surface
          imposes zero normal surface velocity; n = 0 also needs zero
          wall-volume change. Pressure release imposes zero potential on the
          liquid surface, equivalent to zero incremental pressure in the
          high-frequency limit with gravity-wave dynamics omitted. It applies to
          every displayed angular order. Each row orders its eigenfrequencies
          independently and does not claim a common tracked mode. Empty and full
          tanks have no free-surface comparison; all rows coincide at those
          limits.
        </p>
        <p>
          The independent flat-cylinder check uses exact potentials for a
          uniform lateral wall pattern under a rigid lid and a cosine-in-height
          lateral wall pattern with pressure release. Analytical added mass is
          compared with the same fluid kinetic-energy assembly used in the tank
          diagnostic. The two prescribed wall patterns differ. This verifies
          cylinder added inertia, not tank prestress, shell convergence, or
          agreement with DCI-HYDRO or measured modes.
        </p>
        <code>ω²slosh = aeff k tanh(kH) · k = ξ/R</code>
        <p>
          The circular-cylinder relation provides a slosh benchmark. Ideal
          gravity-slosh frequencies depend on acceleration and geometry; density
          cancels from this rigid-tank relation. Coupled shell behavior and
          liquid forces still depend on density. Changing ullage pressure
          affects shell prestress; a constant uniform gas pressure supplies no
          gravity-wave restoring stiffness in this approximation.
        </p>
        <h3>How to read the animation</h3>
        <p>
          A normal mode has arbitrary amplitude. The drawing preserves the
          reduced eigenvector's shell/free-surface motion ratio and enlarges the
          displacement; playback is slowed to make the shape readable. The ghost
          is the undeformed geometry. Pressure coloring is the static pressure
          profile, separate from the oscillating mode color. Frequencies are
          recomputed at each operating point.
        </p>
        <h3>Model scope</h3>
        <p>
          This is an educational Ritz reduction with an ideal inviscid,
          incompressible liquid and a small-amplitude free surface. The domes
          enter geometry, shell energy, and fluid integration. Pressure
          geometric stiffness uses prescribed barrel membrane resultants; dome
          prestress and the actual attachment load path need a separate static
          solution. Rigid-body tank motions are excluded from this elastic shape
          basis. Its restricted trial functions fix pole displacements and
          prescribe selected shell kinematics; a complete free-free tank modal
          solution requires a richer basis or your structural matrices. The
          shell and liquid approximations, pressure-load balance, basis
          truncation, and dome treatment are documented in the accompanying
          CRYO_MODEL.md. Numerical frequencies illustrate this model; they have
          not been correlated to the user's tank finite-element model.
        </p>
        <p>
          Baffles, stiffeners, attachments, weld details, gas compressibility,
          liquid acoustics, damping, thermal contraction, material-property
          changes with temperature, and nonlinear slosh are outside this
          version. The gravity-only surface model becomes unsuitable near zero
          effective acceleration, where surface tension and meniscus geometry
          matter. A completely full tank has no retained free-surface slosh
          coordinates.
        </p>
        <h3>Fourier coverage and the fill sweep</h3>
        <p>
          The Fourier coverage analysis adds representative cosine shell
          families through n = 20, independently of the n = 0–12 animation. Its
          horizontal axis is frequency on a logarithmic scale; its vertical axis
          is circumferential order. The plot and selected-family fill sweep
          display m = 1, meaning the first tracked dry shell branch in each
          family. This is a mixed Ritz eigenvector, not a single axial trial
          function. Five axial trials remain in each solve; higher branches are
          hidden. Compare cutoffs of 8, 12, 16 and 20 over your frequency band.
          In this axisymmetric model, different n blocks are orthogonal: adding
          higher orders leaves every existing block unchanged. A quiet fill
          curve, or unchanged low-order frequencies, therefore cannot establish
          that n = 12 is sufficient. Look for additional in-band families above
          the cutoff, then check the structural and fluid basis within each
          relevant family. An m = 1 branch below the plotted frequency band does
          not establish that its family has no higher in-band branches.
        </p>
        <code>μj = (φjᵀ MA φj) / (φjᵀ Mdry φj)</code>
        <p>
          This modal ratio measures liquid inertia relative to structural
          inertia for the solved wet shape. Added mass is applied throughout the
          retained spectrum; there is no 100 Hz switch. Higher n means shorter
          circumferential wavelength, λθ = πD/n. Tank size alone does not fix
          the required order: stiffness, fill, mode shapes and the analysis band
          also matter.
        </p>
        <p>
          The pressure-only comparison applies Kdry + KG with dry structural
          mass and no added-mass matrix, so μ = 0. Fill, fluid density and axial
          acceleration still change the pressure-induced geometric stiffness
          through the liquid head. The fluid-basis refinement control is omitted
          for this case because no fluid inertia operator is applied.
        </p>
        <p>
          Each animated and diagnostic family retains five axial shell trials.
          Angular orders through the selected surface cutoff use
          multi-coordinate condensation; higher orders use a constrained-surface
          approximation, so those fill curves are not complete pressure-release
          results. The displayed counts represent only m = 1 in one orientation
          per family; higher branches and the degenerate sine partner are not
          counted. Surface-condensation and closed-liquid constraints apply to
          the cases with fluid added mass, rather than the pressure-only
          comparison. The finite n = 20 search, restricted shell basis and
          incompressible fluid do not establish completeness or physical
          accuracy over 10–2000 Hz. Liquid acoustic modes require a compressible
          formulation when they interact with the structure.
        </p>
        <h3>Numerical sensitivity at the nominal operating point</h3>
        <p>
          Historical seven-coordinate baseline: 85% LOX, 31 psig, 2 g. The
          potential-flow column compares the lowest combined-model frequency
          using 4×8 and 5×10 potential trial functions. The shell column
          compares the lowest dry frequency using five and seven structural
          trial functions. These check basis sensitivity in this reduction,
          rather than accuracy against a tank finite-element solution.
        </p>
        <table className="cryo-convergence">
          <thead>
            <tr>
              <th>Family</th>
              <th>Fluid basis change</th>
              <th>Dry shell basis change</th>
            </tr>
          </thead>
          <tbody>
            {convergence.map((row) => (
              <tr key={row.n}>
                <td>n = {row.n}</td>
                <td>{(row.fluidRelativeDifference * 100).toFixed(3)}%</td>
                <td>{(row.shellRelativeDifference * 100).toFixed(3)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Some shell families remain sensitive to the restricted trial space.
          Fill-step MAC measures overlap with the preceding continuation state;
          dry-shape overlap measures how much the tracked shape has changed.
          Uncertain continuation is marked in the fill comparison. Liquid
          kinetic energy does not decide which branch is a shell mode. Near the
          dome poles, slosh and shell approximations need additional refinement.
          The pressure reduction omits the follower-load tangent and dome
          prestress; the ullage gas spring is also omitted.
        </p>
        <h3>Primary references</h3>
        <ul>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/19800011283"
              target="_blank"
              rel="noreferrer"
            >
              NASA TP-1558: Hydroelastic vibration of partially filled shells
            </a>{" "}
            — series potential-flow inertia, prestress and free-surface
            coupling.
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/20200001729"
              target="_blank"
              rel="noreferrer"
            >
              NASA: Rocket engine modal correlation in liquid hydrogen
            </a>{" "}
            — structural interaction with compressible liquid acoustic modes.
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/19670006555"
              target="_blank"
              rel="noreferrer"
            >
              NASA SP-106: The Dynamic Behavior of Liquids in Moving Containers
            </a>{" "}
            — free-surface modes and mechanical reductions.
          </li>
          <li>
            <a
              href="https://www.sciencedirect.com/science/article/pii/0022460X71904172"
              target="_blank"
              rel="noreferrer"
            >
              Lakis & Païdoussis: partially liquid-filled shell vibrations
            </a>{" "}
            — fluid virtual mass and structural mode changes.
          </li>
          <li>
            <a
              href="https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_modeling.05.139.html"
              target="_blank"
              rel="noreferrer"
            >
              Prestressed structures
            </a>{" "}
            — eigenfrequency linearization around a loaded state.
          </li>
        </ul>
      </div>
    </dialog>
  );
}
