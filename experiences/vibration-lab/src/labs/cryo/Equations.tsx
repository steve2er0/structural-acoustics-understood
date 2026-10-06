import type { ReactNode } from "react";
import type { Solution } from "./physics";

function Equation({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cryo-equation" role="math" aria-label={label}>
      {children}
    </div>
  );
}

export default function Equations({ solution }: { solution: Solution }) {
  const kPa = (value: number) =>
    (value / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return (
    <section className="cryo-math" aria-labelledby="cryo-math-title">
      <header>
        <p className="vl-eyebrow">EQUATION REFERENCE</p>
        <h2 id="cryo-math-title">Why added mass lowers the frequency.</h2>
        <p>
          A mode balances elastic restoring energy against the inertia of
          everything it must accelerate.
        </p>
      </header>
      <div className="cryo-rayleigh">
        <Equation label="Omega squared equals x transpose K x divided by x transpose M x. Frequency equals omega divided by two pi.">
          <span>
            ω<sup>2</sup> ={" "}
          </span>
          <span className="cryo-fraction">
            <span>
              x<sup>T</sup> K x
            </span>
            <span>
              x<sup>T</sup> M x
            </span>
          </span>
          <span className="cryo-frequency">f = ω / (2π)</span>
        </Equation>
        <p>
          For the same trial shape and stiffness, added liquid inertia increases
          the denominator and lowers the frequency. Pressure prestress changes
          the numerator. The demo re-solves the matrix problem, so the mode
          shape can change too.
        </p>
      </div>
      <div className="cryo-math-grid">
        <article>
          <span className="cryo-math-number">01 / SHELL COMPARISONS</span>
          <h3>Re-solve with mass and prestress</h3>
          <Equation label="K dry plus K G, times phi, equals omega squared times M dry plus M A, times phi.">
            (K<sub>dry</sub> + K<sub>G</sub>) φ = ω<sup>2</sup> (M<sub>dry</sub>{" "}
            + M<sub>A</sub>) φ
          </Equation>
          <p>
            K<sub>dry</sub> and M<sub>dry</sub> describe the dry structure. K
            <sub>G</sub> is pressure-induced geometric stiffness; M<sub>A</sub>
            is the condensed liquid added-mass matrix. The five comparisons
            switch these contributions on and off.
          </p>
        </article>
        <article>
          <span className="cryo-math-number">02 / LIQUID INERTIA</span>
          <h3>The wall accelerates a coupled liquid field</h3>
          <Equation label="M f equals liquid density times B transpose L inverse B.">
            M<sub>f</sub> = ρ<sub>ℓ</sub> B<sup>T</sup> L<sup>−1</sup> B
          </Equation>
          <Equation label="M A equals M ss minus M s eta times M eta eta inverse times M eta s.">
            M<sub>A</sub> = M<sub>ss</sub> − M<sub>sη</sub> M<sub>ηη</sub>
            <sup>−1</sup> M<sub>ηs</sub>
          </Equation>
          <p>
            L is the weak potential-flow operator; B maps wall and surface
            motion into liquid boundary flux. M<sub>f</sub> shares inertia
            between shell (s) and surface (η) coordinates; M<sub>ss</sub>, M
            <sub>sη</sub> and M<sub>ηη</sub> are its blocks. The second equation
            condenses the retained surface coordinates for the high-frequency
            mass comparison. Off-diagonal terms couple wall motions; total
            liquid mass is not the modal added mass.
          </p>
        </article>
        <article>
          <span className="cryo-math-number">03 / STATIC PRESSURE</span>
          <h3>Ullage shifts the profile; acceleration sets its slope</h3>
          <Equation label="Net pressure at z equals ullage gauge pressure plus liquid density times effective acceleration times the maximum of h minus z and zero.">
            p(z) = p<sub>u,gauge</sub> + ρ<sub>ℓ</sub> a<sub>eff</sub> max(h −
            z, 0)
          </Equation>
          <Equation label="Barrel hoop membrane resultant equals p R. Axial membrane resultant equals p R divided by two.">
            N<sub>θ</sub> = pR{" "}
            <span className="cryo-equation-gap">
              N<sub>z</sub> = pR / 2
            </span>
          </Equation>
          <p>
            z is elevation from the bottom; h is liquid elevation; R is barrel
            radius. The demo integrates displacement-gradient products against
            these tensile barrel resultants to assemble K<sub>G</sub>. They are
            a stated static surrogate; dome and attachment prestress are
            omitted. a<sub>eff</sub> includes the intended gravity contribution.
          </p>
          <div className="cryo-math-operating" aria-live="polite">
            Current bottom pressure: {kPa(solution.ullagePa)} +{" "}
            {kPa(solution.headPa)} ≈ {kPa(solution.bottomPa)} kPa gauge
          </div>
        </article>
        <article>
          <span className="cryo-math-number">04 / SEVEN SLOSH COORDINATES</span>
          <h3>Keep the moving surface in the same solve</h3>
          <Equation label="K x equals omega squared M x, with x comprising shell coordinates and seven surface coordinates.">
            K x = ω<sup>2</sup> M x{" "}
            <span className="cryo-equation-gap">
              x = [q<sub>s</sub>; η<sub>1…7</sub>]
            </span>
          </Equation>
          <Equation label="K equals block diagonal K dry plus K G and zero, plus K g.">
            K = diag(K<sub>dry</sub> + K<sub>G</sub>, 0) + K<sub>g</sub>
          </Equation>
          <Equation label="M equals block diagonal M dry and zero, plus M f.">
            M = diag(M<sub>dry</sub>, 0) + M<sub>f</sub>
          </Equation>
          <p>
            K<sub>g</sub> is the free-surface gravitational stiffness, assembled
            from ρ<sub>ℓ</sub>a<sub>eff</sub> times surface-shape overlap. This
            coupled solve uses the uncondensed shared fluid matrix M<sub>f</sub>
            ; adding separate slosh masses to M<sub>A</sub> would count the
            liquid inertia twice. Surface coordinates are inactive at empty and
            full fill.
          </p>
        </article>
      </div>
      <p className="cryo-math-key">
        φ / x: mode vectors · ω: angular frequency (rad/s) · f: frequency (Hz) ·
        ρ<sub>ℓ</sub>: liquid density (kg/m³) · a<sub>eff</sub>: acceleration
        (m/s²). Equations describe this reduced Ritz / potential-flow model.
      </p>
    </section>
  );
}
