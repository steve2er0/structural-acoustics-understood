import { describe, expect, it } from "vitest";
import {
  engineState,
  pumpPower,
  pumpPressureRise,
  REFERENCE,
  startupState,
  thrust,
} from "./physics";
describe("RS-25 reduced-order teaching model", () => {
  it("anchors 109% to the documented altitude thrust and chamber pressure", () => {
    const s = engineState(109);
    expect(s.thrust).toBeCloseTo(REFERENCE.thrust, 6);
    expect(s.chamberPressure).toBeCloseTo(REFERENCE.chamberPressure, 6);
    expect(s.thrust / (s.massFlow * 9.80665)).toBeCloseTo(452, 8);
  });
  it("increases pressure with squared pump speed", () =>
    expect(pumpPressureRise(10, 2)).toBe(40));
  it("requires proportionally more shaft power for more mass flow", () =>
    expect(pumpPower(1e6, 20, 1000, 0.8)).toBe(
      2 * pumpPower(1e6, 10, 1000, 0.8),
    ));
  it("increases momentum thrust with mass flow and velocity", () => {
    expect(thrust(20, 100, 0, 0, 1)).toBe(2000);
    expect(thrust(10, 200, 0, 0, 1)).toBe(2000);
    expect(thrust(10, 100, 5, 0, 2)).toBe(1010);
  });
  it("rises consistently with commanded RPL", () => {
    const a = engineState(67),
      b = engineState(109);
    expect(b.thrust).toBeGreaterThan(a.thrust);
    expect(b.chamberPressure).toBeGreaterThan(a.chamberPressure);
    for (const id of Object.keys(a.pumps) as (keyof typeof a.pumps)[]) {
      expect(b.pumps[id].speed).toBeGreaterThan(a.pumps[id].speed);
      expect(b.pumps[id].shaftPower).toBeGreaterThan(a.pumps[id].shaftPower);
    }
  });
  it("clamps to the documented heritage envelope", () => {
    expect(engineState(0).command).toBe(67);
    expect(engineState(200).command).toBe(109);
    expect(engineState(NaN).command).toBe(100);
    expect(engineState(100, NaN).massFlow).toBe(0);
  });
  it("is off without propellant flow, pumping, heat or thrust", () => {
    const s = engineState(109, 0);
    expect(
      s.massFlow + s.thrust + s.energy.chemicalPower + s.branches.recirculation,
    ).toBe(0);
    Object.values(s.pumps).forEach((p) =>
      expect(p.shaftPower + p.speed).toBe(0),
    );
  });
  it.each([67, 85, 100, 104.5, 109])(
    "conserves mass and energy at %s percent",
    (level) => {
      const s = engineState(level),
        b = s.branches,
        e = s.energy;
      expect(b.chamberCoolant + b.nozzleCoolant + b.bypass).toBeCloseTo(
        s.fuel,
        10,
      );
      expect(
        b.fuelPreburner.hydrogen + b.oxidizerPreburner.hydrogen,
      ).toBeCloseTo(b.preburnerFuel, 10);
      expect(b.fuelPreburner.oxygen + b.oxidizerPreburner.oxygen).toBeCloseTo(
        b.preburnerOxygen,
        10,
      );
      expect(b.mainOxygen + b.preburnerOxygen).toBeCloseTo(s.oxidizer, 10);
      expect(b.hotGas + b.chamberCoolant + b.mainOxygen).toBeCloseTo(
        s.massFlow,
        10,
      );
      expect(s.pumps.hpotp.massFlow - b.recirculation).toBeCloseTo(
        s.oxidizer,
        10,
      );
      expect(
        ((b.recirculation * s.pumps.hpotp.rise) / REFERENCE.oxidizerDensity) *
          0.78,
      ).toBeCloseTo(s.pumps.lpotp.turbinePower, 6);
      Object.values(s.pumps).forEach((p) =>
        expect(p.turbinePower - p.mechanicalLoss).toBeCloseTo(p.shaftPower, 6),
      );
      expect(e.preburnerGasAfterWork + e.hpTurbines).toBeCloseTo(
        e.preburnerHeat,
        5,
      );
      expect(e.mainHeat + e.preburnerHeat).toBeCloseTo(e.chemicalPower, 5);
      expect(e.kineticPower + e.externalHeat + e.exhaustEnthalpy).toBeCloseTo(
        e.chemicalPower,
        5,
      );
      expect(e.preburnerGasAfterWork).toBeGreaterThan(0);
      expect(e.lpFuelAfterWork).toBeGreaterThan(0);
      expect(e.exhaustEnthalpy).toBeGreaterThan(0);
      expect(b.fuelPreburner.oxygen / b.fuelPreburner.hydrogen).toBeLessThan(8);
      expect(
        b.oxidizerPreburner.oxygen / b.oxidizerPreburner.hydrogen,
      ).toBeLessThan(8);
    },
  );
  it("keeps all pressures and branches finite and nonnegative through the reveal", () => {
    for (let i = 0; i <= 100; i++) {
      const s = engineState(67 + i * 0.42, i / 100);
      for (const p of Object.values(s.pumps)) {
        Object.values(p).forEach((v) => {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        });
        expect(p.outlet).toBeGreaterThanOrEqual(p.inlet);
      }
      expect(s.thrust).toBeGreaterThanOrEqual(0);
    }
  });
  it("does not count the oxygen recirculation loop twice as engine consumption", () => {
    const s = engineState(109);
    expect(s.pumps.hpotp.massFlow).toBeGreaterThan(s.oxidizer);
    expect(s.massFlow).toBeCloseTo(s.fuel + s.oxidizer, 10);
  });
  it("reveals flow before preburners and combustion before exhaust", () => {
    expect(startupState(0).flow).toBe(0);
    expect(startupState(2).flow).toBe(1);
    expect(startupState(2).combustion).toBe(0);
    expect(startupState(5).exhaust).toBe(0);
    expect(startupState(8).complete).toBe(true);
    expect(startupState(100).exhaust).toBe(1);
  });
});

describe("ambient pressure and shock-cell trends", () => {
  it("changes thrust by ambient pressure times exit area without changing the engine flow", () => {
    const vac = engineState(100, 1, 0),
      sea = engineState(100, 1, 101325);
    expect(vac.thrust - sea.thrust).toBeCloseTo(101325 * REFERENCE.exitArea, 7);
    expect(sea.massFlow).toBe(vac.massFlow);
    expect(sea.chamberPressure).toBe(vac.chamberPressure);
    expect(sea.pressureThrust).toBeLessThan(0);
  });
  it("shows overexpansion at sea level and underexpansion in thin air", () => {
    expect(engineState(100, 1, 101325).plume.regime).toBe("Overexpanded");
    expect(engineState(100, 1, 5000).plume.regime).toBe("Underexpanded");
    expect(engineState(100, 1, 5000).plume.spacing).toBeGreaterThan(
      engineState(100, 1, 101325).plume.spacing,
    );
  });
  it("suppresses standing cells at matched pressure and in vacuum", () => {
    const s = engineState(100);
    expect(engineState(100, 1, s.exitPressure).plume.shockStrength).toBe(0);
    expect(engineState(100, 1, s.exitPressure).plume.regime).toBe(
      "Pressure matched",
    );
    expect(engineState(100, 1, 0).plume.shockStrength).toBe(0);
    expect(engineState(100, 1, 0).plume.spread).toBeGreaterThan(
      engineState(100, 1, 101325).plume.spread,
    );
  });
  it("moves shock-cell spacing with power at fixed ambient pressure", () => {
    const low = engineState(67, 1, 101325),
      high = engineState(109, 1, 101325);
    expect(high.exitPressure).toBeGreaterThan(low.exitPressure);
    expect(high.plume.spacing).toBeGreaterThan(low.plume.spacing);
  });
  it("keeps the off engine thrust zero even in atmosphere", () => {
    expect(engineState(109, 0, 101325).thrust).toBe(0);
    expect(engineState(109, 0, 101325).plume.shockStrength).toBe(0);
  });
  it("keeps all plume controls finite at limits and through the full operating envelope", () => {
    for (const pa of [NaN, -1, 0, 0.1, 1, 1000, 5000, 20000, 101325, 1e9])
      for (const power of [67, 100, 109]) {
        const s = engineState(power, 1, pa);
        expect(s.thrust).toBeGreaterThan(0);
        for (const n of Object.values(s.plume))
          if (typeof n === "number") expect(Number.isFinite(n)).toBe(true);
        expect(s.plume.shockStrength).toBeGreaterThanOrEqual(0);
        expect(s.plume.shockStrength).toBeLessThanOrEqual(1);
      }
  });
});
