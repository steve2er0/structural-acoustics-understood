import { ArrowUpRight, BookOpen, Play, RotateCcw } from "lucide-react";
import { Link } from "@app/router";
import { LABS } from "@app/labs";
const labNames = {
  vortex: "Vortex",
  sea: "SEA",
  rs25: "RS-25",
  isolation: "Isolation",
  shaker: "Shaker",
  modal: "Modal Testing",
  accelerometer: "Accelerometer",
};
export function LabNavigation({
  active,
  onRestart,
  onTour,
  onHelp,
  touring,
}: {
  active: string;
  onRestart: () => void;
  onTour: () => void;
  onHelp: () => void;
  touring?: boolean;
}) {
  return (
    <header className="vl-nav">
      <Link href="/" className="vl-wordmark" aria-label="Vibration Lab home">
        VIBRATION
        <span>
          LAB <ArrowUpRight size={14} />
        </span>
      </Link>
      <nav aria-label="Labs">
        {LABS.map((lab) => (
          <Link
            key={lab.id}
            href={lab.route}
            aria-label={labNames[lab.id]}
            aria-current={active === lab.id ? "page" : undefined}
          >
            <span className="vl-nav-long">{labNames[lab.id]}</span>
            <span className="vl-nav-short" aria-hidden="true">
              {lab.id === "modal"
                ? "Modal"
                : lab.id === "accelerometer"
                  ? "Accel"
                  : labNames[lab.id]}
            </span>
          </Link>
        ))}
        <Link href="/">All labs</Link>
      </nav>
      <div className="vl-nav-actions">
        <button
          type="button"
          className="vl-tour-start"
          onClick={onTour}
          aria-label={touring ? "Restart tour" : "Guided tour"}
        >
          <Play size={12} />
          <span className="vl-nav-long">
            {touring ? "Restart tour" : "Guided tour"}
          </span>
          <span className="vl-nav-short" aria-hidden="true">
            Tour
          </span>
        </button>
        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart experiment"
          title="Restart experiment"
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          onClick={onHelp}
          aria-label="Open model notes"
          title="Model notes"
        >
          <BookOpen size={16} />
        </button>
      </div>
    </header>
  );
}
