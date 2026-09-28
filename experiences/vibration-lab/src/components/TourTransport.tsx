import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
export function TourTransport({
  index,
  count,
  time,
  duration,
  paused,
  onPause,
  onJump,
  onExit,
  title,
  copy,
}: {
  index: number;
  count: number;
  time: number;
  duration: number;
  paused: boolean;
  onPause: () => void;
  onJump: (direction: number) => void;
  onExit: () => void;
  title?: string;
  copy?: string;
}) {
  return (
    <section className="vl-tour" aria-label="Guided tour">
      <div
        className="vl-tour-line"
        style={{ transform: `scaleX(${time / duration})` }}
      />
      <div className="vl-tour-copy">
        <span className="vl-eyebrow">
          GUIDED TOUR · {String(index + 1).padStart(2, "0")} / {count}
        </span>
        {title && <strong>{title}</strong>}
        {copy && <p>{copy}</p>}
      </div>
      <div className="vl-tour-buttons">
        <button
          onClick={() => onJump(-1)}
          disabled={index === 0}
          aria-label="Previous tour step"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onPause}
          aria-label={paused ? "Play guided tour" : "Pause guided tour"}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button
          onClick={() => onJump(1)}
          disabled={index === count - 1}
          aria-label="Next tour step"
        >
          <ChevronRight size={16} />
        </button>
        <button onClick={onExit} aria-label="Exit guided tour">
          <X size={15} />
        </button>
      </div>
    </section>
  );
}
