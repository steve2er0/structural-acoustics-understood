import type { EngineState, PumpId } from "./physics";
import { PARTS, type Part, type Topic } from "./content";
const fmt = (v: number, d = 1) =>
  v.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
export function Context({
  selected,
  state,
  ready,
  topic,
}: {
  selected: Part;
  state: EngineState;
  ready: boolean;
  topic: Topic;
}) {
  const p = PARTS[selected],
    pump = state.pumps[selected as PumpId];
  const value = (v: number, d = 1) => (ready ? fmt(v, d) : "—");
  return (
    <>
      <span className="rs-overline">{p.tag}</span>
      <h2>{p.name}</h2>
      <p>{p.copy}</p>
      {pump ? (
        <>
          <div
            className="rs-shaft-diagram"
            aria-label="Turbine transfers shaft power into the pump"
          >
            <span>
              DRIVE
              <br />
              <b>Turbine</b>
            </span>
            <i />
            <span>
              WORK
              <br />
              <b>Pump</b>
            </span>
          </div>
          <div className="rs-primary-readout">
            <small>MODELED SHAFT POWER</small>
            <strong>
              {value(pump.shaftPower / 1e6)}
              <em> MW</em>
            </strong>
          </div>
          <dl className="rs-values">
            <div>
              <dt>Pressure rise</dt>
              <dd>{value(pump.rise / 1e6)} MPa</dd>
            </div>
            <div>
              <dt>Volume flow</dt>
              <dd>{value(pump.volumeFlow, 3)} m³/s</dd>
            </div>
            <div>
              <dt>Shaft speed</dt>
              <dd>{value(pump.speed * 100, 0)}% ref.</dd>
            </div>
            <div>
              <dt>Turbine work</dt>
              <dd>{value(pump.turbinePower / 1e6)} MW</dd>
            </div>
          </dl>
          <div className="rs-formula">Pshaft ≈ Δp Q / η</div>
          <small className="rs-muted">
            Representative map · speed normalized to 109% operation. HPOTP
            includes boost-stage load.
          </small>
        </>
      ) : selected === "nozzle" ? (
        <>
          <div className="rs-nozzle-gauges">
            <span>
              CHAMBER<em>THROAT</em>EXIT
            </span>
            <div>
              <b>Pressure</b>
              <i className="rs-pressure-ramp" />
              <b>↓</b>
            </div>
            <div>
              <b>Velocity</b>
              <i className="rs-velocity-ramp" />
              <b>↑</b>
            </div>
          </div>
          <dl className="rs-values">
            <div>
              <dt>Exhaust speed</dt>
              <dd>{value(state.exhaustVelocity, 0)} m/s</dd>
            </div>
            <div>
              <dt>Momentum term</dt>
              <dd>{value(state.momentumThrust / 1e3, 0)} kN</dd>
            </div>
            <div>
              <dt>Pressure term</dt>
              <dd>{value(state.pressureThrust / 1e3, 0)} kN</dd>
            </div>
          </dl>
          <div className="rs-formula">F = ṁVe + (Pe − Pa)Ae</div>
        </>
      ) : selected === "cooling" || topic === "Thermal" ? (
        <>
          <div className="rs-thermal-wall">
            <span>
              HOT GAS
              <br />
              <b>≈ 3,316°C</b>
            </span>
            <i>→ WALL →</i>
            <span>
              LH₂ INLET
              <br />
              <b>≈ −253°C</b>
            </span>
          </div>
          <p className="rs-muted">
            NASA temperature references, not computed local wall temperatures.
            Hydrogen warms as it absorbs heat.
          </p>
          <div className="rs-route-note">
            Chamber coolant → LPFTP turbine → powerhead cooling → injector
          </div>
          <div className="rs-route-note">
            Nozzle coolant + bypass → both preburners
          </div>
        </>
      ) : selected === "fp" || selected === "op" ? (
        <>
          <div className="rs-rich">
            <span>EXCESS H₂</span>
            <i>+</i>
            <span>SMALL O₂ SUPPLY</span>
            <b>FUEL-RICH GAS</b>
          </div>
          <p className="rs-muted">
            Both preburners operate fuel-rich. Their exhaust is used again in
            the main combustion system.
          </p>
        </>
      ) : selected === "pogo" ? (
        <>
          <div className="rs-route-note">
            Gas compresses as oxygen pressure rises; it expands as pressure
            falls.
          </div>
          <p className="rs-muted">
            Heritage SSME: helium precharge before start, then gaseous oxygen
            maintains the gas space during operation. Select Cutaway to see the
            conceptual gas/liquid interface.
          </p>
          <small className="rs-muted">
            Placement and external form follow public engine references.
            Internal baffles and vehicle pogo dynamics are not simulated.
          </small>
        </>
      ) : selected === "engine" ? (
        <div className="rs-route-note">
          Start the engine, follow a propellant, then select a component to see
          what it contributes.
        </div>
      ) : null}
      <div className="rs-context-chain">{p.chain}</div>
    </>
  );
}
export function Analysis({
  topic,
  state,
  ready,
}: {
  topic: Topic;
  state: EngineState;
  ready: boolean;
}) {
  if (topic === "Shock diamonds")
    return (
      <div className="rs-analysis rs-plume-analysis">
        <span className="rs-overline">WHY THE PATTERN CHANGES</span>
        <div className="rs-pressure-comparison">
          {[
            ["EXIT", state.exitPressure],
            ["AMBIENT", state.ambientPressure],
          ].map(([label, p]) => (
            <div key={label}>
              <span>{label}</span>
              <i
                style={{ width: `${Math.max(1, (Number(p) / 101325) * 100)}%` }}
              />
              <b>{ready ? fmt(Number(p) / 1000, 1) : "—"} kPa</b>
            </div>
          ))}
        </div>
        <p>
          Shock cells stand in the flow. Gas moves through them.
          <br />
          Change power or ambient pressure to reshape the exhaust.
        </p>
      </div>
    );
  if (topic === "Pressure")
    return (
      <div className="rs-analysis">
        <span className="rs-overline">
          PRESSURE LADDER · REPRESENTATIVE MPa
        </span>
        {(["fuel", "oxygen"] as const).map((k, i) => {
          const lo = state.pumps[i ? "lpotp" : "lpftp"],
            hi = state.pumps[i ? "hpotp" : "hpftp"];
          return (
            <div className={`rs-pressure-row ${k}`} key={k}>
              <b>{i ? "LOX" : "LH₂"}</b>
              {[
                ["Inlet", 0.2e6],
                ["LP out", lo.outlet],
                ["HP out", hi.outlet],
                ["Chamber", state.chamberPressure],
              ].map(([label, n]) => (
                <div key={label}>
                  <i style={{ height: `${8 + (Number(n) / 46e6) * 40}px` }} />
                  <span>{label}</span>
                  <strong>{ready ? (Number(n) / 1e6).toFixed(1) : "—"}</strong>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  if (topic === "Power flow")
    return (
      <div className="rs-analysis">
        <span className="rs-overline">
          MECHANICAL WORK · INTERNAL ENERGY TRANSFER
        </span>
        <div className="rs-power-chain">
          <div>
            <small>PREBURNER HEAT</small>
            <b>
              {ready ? fmt(state.energy.preburnerHeat / 1e6, 0) : "—"}
              <em> MW</em>
            </b>
          </div>
          <span>→</span>
          <div>
            <small>HP TURBINE WORK</small>
            <b>
              {ready ? fmt(state.energy.hpTurbines / 1e6, 1) : "—"}
              <em> MW</em>
            </b>
          </div>
          <span>→</span>
          <div>
            <small>HP PUMP SHAFTS</small>
            <b>
              {ready
                ? fmt(
                    (state.pumps.hpftp.shaftPower +
                      state.pumps.hpotp.shaftPower) /
                      1e6,
                    1,
                  )
                : "—"}
              <em> MW</em>
            </b>
          </div>
        </div>
        <p>
          The gas retains energy after turbine work and continues to the main
          chamber. Pump work is transferred internally, not an extra source of
          energy.
        </p>
      </div>
    );
  return (
    <div className="rs-analysis rs-cycle-summary">
      <span className="rs-overline">FOLLOW THE ENERGY</span>
      <div>
        <span>
          Cryogenic
          <br />
          <b>propellants</b>
        </span>
        <i>→</i>
        <span>
          Preburner
          <br />
          <b>turbine work</b>
        </span>
        <i>→</i>
        <span>
          Main chamber
          <br />
          <b>hot gas</b>
        </span>
        <i>→</i>
        <span>
          Nozzle
          <br />
          <b>thrust</b>
        </span>
      </div>
      <p>
        Two fuel-rich preburners. One main combustion system. A cycle that uses
        its turbine exhaust.
      </p>
    </div>
  );
}
