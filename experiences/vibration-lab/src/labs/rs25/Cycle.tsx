import { COLORS, type Part, type Topic } from "./content";
/** Topological schematic, deliberately separated from the spatially arranged engine. */
export default function Cycle({
  selected,
  onSelect,
  topic,
  running,
  paused,
  power,
}: {
  selected: Part;
  onSelect: (p: Part) => void;
  topic: Topic;
  running: boolean;
  paused: boolean;
  power: number;
}) {
  const node = (id: Part, x: number, y: number, label: string, sub: string) => (
    <g
      key={`${id}-${x}-${y}`}
      className={`rs-node ${selected === id ? "selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`Inspect ${label}`}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      transform={`translate(${x},${y})`}
    >
      <rect x={-71} y={-22} width={142} height={44} rx={5} />
      <text textAnchor="middle" y={-2}>
        {label}
      </text>
      <text textAnchor="middle" y={13} className="rs-node-sub">
        {sub}
      </text>
    </g>
  );
  const line = (
    d: string,
    kind: keyof typeof COLORS,
    label?: string,
    x?: number,
    y?: number,
  ) => (
    <g
      key={d}
      style={{
        color: COLORS[kind],
        opacity:
          topic === "Follow LH₂" && kind === "oxygen"
            ? 0.15
            : topic === "Follow LOX" && (kind === "fuel" || kind === "cooling")
              ? 0.15
              : 1,
      }}
    >
      <path d={d} className="rs-pipe-base" />
      <path
        d={d}
        className="rs-pipe-flow"
        markerEnd={`url(#rs-arrow-${kind})`}
        style={{
          animationPlayState: running && !paused ? "running" : "paused",
          animationDuration: `${3 / (power / 109)}s`,
        }}
      />
      {label && (
        <text x={x} y={y} className="rs-path-label">
          {label}
        </text>
      )}
    </g>
  );
  return (
    <div className="rs-cycle" aria-label="Interactive RS-25 cycle schematic">
      <div className="rs-cycle-heading">
        <span>THE CYCLE, UNFOLDED</span>
        <small>
          Selected paths preserve connectivity; line lengths are illustrative.
        </small>
      </div>
      <svg
        viewBox="0 0 760 520"
        role="group"
        aria-label="Fuel-rich staged-combustion flow paths"
      >
        <defs>
          {(["fuel", "oxygen", "hot", "cooling", "main"] as const).map((c) => (
            <marker
              key={c}
              id={`rs-arrow-${c}`}
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={5}
              markerHeight={5}
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10Z" fill={COLORS[c]} />
            </marker>
          ))}
        </defs>
        <text x={130} y={22} textAnchor="middle" fill={COLORS.fuel}>
          LH₂ INLET
        </text>
        <text x={630} y={22} textAnchor="middle" fill={COLORS.oxygen}>
          LOX INLET
        </text>
        {line("M130 30 V53", "fuel")}
        {line("M630 30 V53", "oxygen")}
        {line("M130 97 V126", "fuel")}
        {line("M630 97 V126", "oxygen")}
        {/* Compliance branch: no animated through-flow into the gas space. */}
        <path
          d="M630 111 H526 V87"
          className="rs-pipe-base"
          style={{ color: COLORS.oxygen }}
        />
        <g
          role="button"
          tabIndex={0}
          aria-label="Inspect Pogo accumulator"
          className="rs-pogo-node"
          onClick={() => onSelect("pogo")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect("pogo");
            }
          }}
        >
          <circle
            cx={526}
            cy={73}
            r={14}
            fill="#233742"
            stroke={selected === "pogo" ? "#eed19a" : COLORS.oxygen}
          />
          <path d="M514 75 H538" stroke={COLORS.oxygen} />
          <text x={501} y={70} textAnchor="end" className="rs-path-label">
            Pogo
          </text>
          <text x={501} y={85} textAnchor="end" className="rs-path-label">
            gas cushion
          </text>
        </g>
        {line("M130 170 V218", "fuel", "MFV", 141, 205)}
        {line("M130 188 H28 V376 H59", "cooling")}
        {line("M130 354 V328 H12 V75 H59", "cooling")}
        {line(
          "M201 76 H270 V107 H380 V354",
          "cooling",
          "HGM coolant jacket",
          274,
          100,
        )}
        {line("M201 240 H220 V190 H515 V200", "cooling")}
        {line("M283 190 V200", "cooling")}
        {line("M630 170 V390 H451", "oxygen", "MOV · main oxygen", 533, 383)}
        {line("M630 178 H607 V212 H586", "oxygen", "boost stage", 533, 171)}
        {line("M607 178 H206 V222 H212", "oxygen", "FPOV / OPOV", 344, 171)}
        {line("M660 148 H719 V76 H701", "oxygen", "hydraulic drive", 610, 44)}
        {line("M678 97 V111 H630", "oxygen")}
        {line("M283 244 V281", "hot")}
        {line("M515 244 V281", "hot")}
        {line(
          "M283 325 V343 H380 V354",
          "hot",
          "turbine exhaust → HGM",
          388,
          346,
        )}
        {line("M515 325 V343 H380", "hot")}
        {line("M380 398 V432", "main")}
        {line("M380 476 V504", "main")}
        <path
          d="M212 303 H184 V278 H172 V170 M586 303 H603 V148 H559"
          className="rs-shaft-line"
        />
        <text x={197} y={301} className="rs-path-label">
          shaft
        </text>
        <text x={569} y={291} className="rs-path-label">
          shaft
        </text>
        {node("lpftp", 130, 75, "LPFTP", "warm-H₂ turbine drive")}
        {node("lpotp", 630, 75, "LPOTP", "liquid-O₂ turbine drive")}
        {node("hpftp", 130, 148, "HPFTP", "hydrogen pressure rise")}
        {node("hpotp", 630, 148, "HPOTP + boost", "oxygen pressure rise")}
        {node("cooling", 130, 240, "Nozzle + bypass", "COOLANT + CCV FLOW")}
        {node("cooling", 130, 376, "Chamber cooling", "THEN → LPFTP TURBINE")}
        {node("fp", 283, 222, "Fuel preburner", "FUEL-RICH")}
        {node("op", 515, 222, "Oxidizer preburner", "ALSO FUEL-RICH")}
        {node("hpftp", 283, 303, "Fuel turbine", "drives HPFTP shaft")}
        {node("hpotp", 515, 303, "Oxidizer turbine", "drives HPOTP shaft")}
        {node("injector", 380, 376, "Main injector", "LOX + hot gas + warm H₂")}
        {node(
          "nozzle",
          380,
          454,
          "Chamber → nozzle",
          "pressure → velocity → thrust",
        )}
        <text x={30} y={483} className="rs-path-label">
          LPOTP drive flow returns
        </text>
        <text x={30} y={499} className="rs-path-label">
          to its pump outlet.
        </text>
      </svg>
    </div>
  );
}
