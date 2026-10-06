import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Notes({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => prior?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="tbl-notes"
      onCancel={close}
      aria-labelledby="tbl-notes-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="tbl-notes-content">
        <button
          className="tbl-close"
          onClick={close}
          aria-label="Close model notes"
        >
          <X size={20} />
        </button>
        <p className="vl-eyebrow">MODEL / CONVENTIONS / SOURCES</p>
        <h2 id="tbl-notes-title">What the panel is telling you.</h2>
        <p>
          Three ideal pressure fields drive the same simply supported isotropic
          panel. Their one-sided point-pressure PSD is held equal, exposing the
          effect of spatial phase and coherence on structural response. Values
          are illustrative teaching inputs.
        </p>
        <h3>One point spectrum, three spatial fields</h3>
        <code>Gpp(r,r′,f) = Φpp(f) Γ(r−r′,f)</code>
        <code>Corcos: Γ = exp[−ω(αx|Δs| + αy|Δn|)/Uc] exp[−iωΔs/Uc]</code>
        <code>DAF: Γ = sin(kr)/(kr), k = 2πf/c</code>
        <code>PWF: Γ = exp[−ik sinθ (Δx cosψ + Δy sinψ)]</code>
        <p>
          Δs and Δn are separations along and across the local flow. αx and αy
          are dimensionless decay coefficients multiplying ωΔ/Uc. Lx = Uc/(αxω)
          and Ly = Uc/(αyω) are e-fold lengths of |Γ|; magnitude-squared
          coherence is |Γ|². Phase uses exp(iωt) with downstream propagation in
          the positive flow direction.
        </p>
        <p>
          DAF is an ideal three-dimensional isotropic diffuse acoustic field.
          Its projected wavenumber distribution fills the acoustic disk. PWF is
          an ideal progressive plane wave with incidence measured from the panel
          normal and azimuth in its plane. Acoustic reflection, shielding and
          pressure doubling at an installed surface are omitted; Φpp is the
          applied panel pressure PSD.
        </p>
        <h3>Thickness is a separate physical scale</h3>
        <p>
          δ99 is the distance where the mean speed reaches 99% of the outer
          velocity. It sets the displayed layer depth, reduced frequency ωδ99/U∞
          and correlation-length ratios. Holding Uc and α fixed, changing δ99
          does not change classical Corcos coherence or response. Displacement
          thickness δ* is a different quantity and is not inferred here. The
          drawn velocity profile is a schematic; the demo does not solve the
          boundary layer.
        </p>
        <h3>The panel accepts a correlated load</h3>
        <code>D = Eh³/[12(1−ν²)] · m′ = ρh</code>
        <code>φmn = sin(mπx/L) sin(nπy/W)</code>
        <code>ωmn = √(D/m′) [(mπ/L)² + (nπ/W)²]</code>
        <code>GQrQs = ∬ φr(r) Gpp(r,r′) φs(r′) dA dA′</code>
        <code>Gqq = H GQQ Hᴴ · Gaa = ω⁴ Gww</code>
        <p>
          Peak-normalized sine modes have modal mass ρhLW/4. The receptance uses
          viscous damping ratio ζ: Hn = 1/[Mn(ωn²−ω²+i2ζωnω)]. Cross-modal terms
          are retained in the response at tap B. Selecting a mode changes the
          acceptance diagnostic; the response includes the retained modal basis.
          The calculation reports numerical convergence and basis limits beside
          the results.
        </p>
        <p>
          Joint acceptance J = GQnQn/(Φpp A²) describes the selected mode's
          spatial loading. √J is the modal-force ratio relative to pRMS A. At
          uniform pressure, odd/odd modes have J = 16/(m²n²π⁴); a mode with an
          even index has zero net generalized force.
        </p>
        <h3>What is moving</h3>
        <p>
          The pressure and displacement animation is one seeded narrowband
          realization of the field, with the panel response computed from that
          same realization. It is a phase-resolved frequency slice. New
          realization changes the random spatial sample while ensemble PSD
          predictions stay fixed. The separate correlation view shows Re Γ
          relative to tap A. Neither is measured test data.
        </p>
        <p>
          Animation runs at 0.5 displayed cycles per second; the physical
          frequency remains the selected value. The displacement gain is
          labeled. Pressure color limits are ±3√(ΦppΔf), with values outside the
          limits saturated. Response colors use ±3 times the ensemble
          displacement RMS at B. Fine pressure patches can be underresolved by
          the drawing mesh; modal integration uses independent analytical
          spatial transforms. RMS readouts use √(PSD×Δf), treating each selected
          band as locally narrow. Δf is not a broadband integration interval.
        </p>
        <p>
          The retained panel basis is 6 × 6 (36 modes). At the cursor, spatial
          quadrature is refined and the response is compared with an 8 × 8
          basis. The frequency control stays below 65% of the first omitted
          modal frequency, capped at 1200 Hz; this is a conservative exploration
          range, not a guarantee of convergence at every observation point.
          Reported warnings take precedence, especially near response
          cancellations.
        </p>
        <h3>Model limits</h3>
        <p>
          Linear small-deflection Kirchhoff–Love bending, simply supported
          edges, constant material properties and ζ; a stationary homogeneous
          pressure field; one-way prescribed forcing. Corcos represents attached
          TBL pressure. Separated flow, shocks, buffet, wakes, strong pressure
          gradients, curvature, aerodynamic feedback, acoustic radiation and
          cavities require additional models. Corcos can overpredict
          subconvective/low-wavenumber pressure content.
        </p>
        <h3>Primary sources</h3>
        <ul>
          <li>
            <a
              href="https://doi.org/10.1121/1.1918431"
              target="_blank"
              rel="noreferrer"
            >
              Corcos (1963), Resolution of Pressure in Turbulence ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/citations/19730004207"
              target="_blank"
              rel="noreferrer"
            >
              NASA TN D-6970, Random Response of Rectangular Panels Beneath a
              TBL ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/api/citations/20120012007/downloads/20120012007.pdf"
              target="_blank"
              rel="noreferrer"
            >
              NASA, correlation and coherence lengths in TBL flight data ↗
            </a>
          </li>
          <li>
            <a
              href="https://ntrs.nasa.gov/api/citations/20150013948/downloads/20150013948.pdf"
              target="_blank"
              rel="noreferrer"
            >
              NASA, diffuse and turbulent pressure fields applied to panels ↗
            </a>
          </li>
        </ul>
      </div>
    </dialog>
  );
}
