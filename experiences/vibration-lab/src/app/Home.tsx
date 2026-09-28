import { lazy, Suspense, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, ArrowRight } from "lucide-react";
import { LABS, type LabDefinition } from "./labs";
import { Link } from "./router";
const Preview = lazy(() => import("./Preview"));
function Experiment({ lab }: { lab: LabDefinition }) {
  const [hover, setHover] = useState(false);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <article
      className={`vl-experiment vl-experiment-${lab.id}`}
      style={{ "--lab-accent": lab.accent } as CSSProperties}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <Link
        href={lab.route}
        className="vl-experiment-link"
        aria-label={`Enter ${lab.title} Lab`}
      >
        <div className="vl-card-top">
          <span>EXPERIMENT / {lab.number}</span>
          <span>
            INTERACTIVE 3D <i />
          </span>
        </div>
        <div className="vl-preview">
          <div className="vl-preview-grid" />
          <Suspense
            fallback={
              <span className="vl-preview-loading">
                PREPARING THE EXPERIMENT
              </span>
            }
          >
            <Preview lab={lab.id} active={hover && !reduced} />
          </Suspense>
          <div className="vl-preview-caption">
            {lab.id === "vortex"
              ? "FOREBODY → LONGITUDINAL VORTICES → AFT WAKE"
              : lab.id === "rs25"
                ? "PROPELLANT → PUMP WORK → THRUST"
                : lab.id === "sea"
                  ? "POWER → ENERGY → FLOW → BALANCE"
                  : lab.id === "isolation"
                    ? "BASE EXCITATION → PAYLOAD RESPONSE"
                    : lab.id === "modal"
                      ? "IMPACT → RESONANCE → MODE SHAPE"
                      : lab.id === "accelerometer"
                        ? "ACCELERATION → CHARGE → VOLTAGE"
                        : "FIELD → CURRENT → FORCE"}
          </div>
        </div>
        <div className="vl-card-copy">
          <div className="vl-card-subjects">{lab.subjects.join(" / ")}</div>
          <h2>
            {lab.title}
            <ArrowUpRight />
          </h2>
          <p>{lab.description}</p>
          <span className="vl-enter">
            Enter Lab <ArrowRight size={18} />
          </span>
        </div>
      </Link>
    </article>
  );
}
export default function Home() {
  return (
    <main className="vl-home">
      <header className="vl-home-nav">
        <Link href="/" className="vl-wordmark" aria-label="Vibration Lab home">
          VIBRATION
          <span>
            LAB <ArrowUpRight size={14} />
          </span>
        </Link>
        <span className="vl-eyebrow">
          AN OPEN BENCH FOR ENGINEERING INTUITION
        </span>
        <span className="vl-version">VOL. 01 / SEVEN EXPERIMENTS</span>
      </header>
      <section className="vl-hero">
        <div className="vl-hero-lines" aria-hidden="true">
          {Array.from({ length: 17 }, (_, i) => (
            <svg
              key={i}
              viewBox="0 0 900 220"
              preserveAspectRatio="none"
              style={{ "--i": i } as CSSProperties}
            >
              <path
                d={`M0,110 C160,110 215,${12 + i * 3} 330,110 S490,${208 - i * 3} 590,110 S770,${12 + i * 3} 900,110`}
              />
            </svg>
          ))}
        </div>
        <p className="vl-eyebrow">
          <i className="vl-status-dot" /> OBSERVE. ADJUST. UNDERSTAND.
        </p>
        <h1>
          <span>
            Vibration
            <br />
            <em>Lab.</em>
          </span>
        </h1>
        <p className="vl-hero-description">
          Interactive experiments in vibration,
          <br className="vl-wide" /> acoustics, structures, propulsion, and
          flow.
        </p>
        <a className="vl-explore-link" href="#experiments">
          Explore the labs <ArrowDown size={16} />
        </a>
        <span className="vl-hero-note">
          REAL EQUATIONS.
          <br />
          PHYSICAL INTUITION.
        </span>
      </section>
      <section
        id="experiments"
        className="vl-experiments"
        aria-label="Explore the labs"
      >
        <div className="vl-section-heading">
          <span className="vl-eyebrow">EXPLORE THE LABS</span>
          <p>
            Change one thing.
            <br />
            See the whole system respond.
          </p>
        </div>
        <div className="vl-experiment-grid">
          {LABS.map((lab) => (
            <Experiment key={lab.id} lab={lab} />
          ))}
        </div>
      </section>
      <section className="vl-coming">
        <div>
          <span className="vl-eyebrow">THE BENCH IS GROWING</span>
          <h2>More experiments coming.</h2>
        </div>
        <ul>
          {["SDOF Resonance", "Random Vibration"].map((name, i) => (
            <li key={name}>
              <span>0{i + 8}</span>
              {name}
              <span>IN VIEW</span>
            </li>
          ))}
        </ul>
      </section>
      <footer className="vl-home-footer">
        <span>VIBRATION LAB</span>
        <p>Built for curiosity. Grounded in mechanics.</p>
        <span>v0.1</span>
      </footer>
    </main>
  );
}
