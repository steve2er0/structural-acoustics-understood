/** SI throughout. Heritage 67–109% RPL teaching map; not an RS-25 performance solver. */
export const G0 = 9.80665;
export const LBF = 4.4482216152605;
export const REFERENCE = {
  thrust: 512271 * LBF, // NASA NTRS 20120001539, Fig. 2: 109% RPL, altitude.
  chamberPressure: 2994 * 6894.757293,
  specificImpulse: 452,
  exitArea: Math.PI * (2.29 / 2) ** 2,
  mixtureRatio: 6, // Representative, fixed oxidizer/fuel mass ratio.
  exhaustVelocity: 4300, // Assumed; pressure contribution closes the reference thrust.
  fuelDensity: 71,
  oxidizerDensity: 1141,
  hydrogenLHV: 120e6,
} as const;
export const POWER_LIMITS = [67, 109] as const;
export type PumpId = "lpftp" | "hpftp" | "lpotp" | "hpotp";
export interface PumpState {
  inlet: number;
  outlet: number;
  rise: number;
  massFlow: number;
  volumeFlow: number;
  speed: number;
  fluidPower: number;
  shaftPower: number;
  turbinePower: number;
  mechanicalLoss: number;
}
export function pumpPressureRise(
  referenceRise: number,
  normalizedSpeed: number,
) {
  return referenceRise * Math.max(0, normalizedSpeed) ** 2;
}
export function pumpPower(
  rise: number,
  massFlow: number,
  density: number,
  efficiency: number,
) {
  return (Math.max(0, rise) * Math.max(0, massFlow)) / density / efficiency;
}
export function thrust(
  massFlow: number,
  velocity: number,
  exitPressure: number,
  ambientPressure: number,
  exitArea: number,
) {
  return massFlow * velocity + (exitPressure - ambientPressure) * exitArea;
}
function pump(
  inlet: number,
  rise: number,
  massFlow: number,
  density: number,
  efficiency: number,
  speed: number,
  additionalLoad = 0,
): PumpState {
  const fluidPower = (rise * massFlow) / density;
  const shaftPower = fluidPower / efficiency + additionalLoad;
  const turbinePower = shaftPower / 0.98;
  return {
    inlet,
    outlet: inlet + rise,
    rise,
    massFlow,
    volumeFlow: massFlow / density,
    speed,
    fluidPower,
    shaftPower,
    turbinePower,
    mechanicalLoss: turbinePower - shaftPower,
  };
}
export function engineState(powerLevel: number, activity = 1, ambient = 0) {
  const ambientPressure = Math.max(
    0,
    Math.min(101325, Number.isFinite(ambient) ? ambient : 101325),
  );
  const command = Math.min(
    109,
    Math.max(67, Number.isFinite(powerLevel) ? powerLevel : 100),
  );
  const a = Math.min(1, Math.max(0, Number.isFinite(activity) ? activity : 0));
  const scale = (command / 109) * a,
    speed = Math.sqrt(scale);
  const nominalMass = REFERENCE.thrust / (G0 * REFERENCE.specificImpulse);
  const massFlow = nominalMass * scale,
    fuel = massFlow / 7,
    oxidizer = massFlow - fuel;
  const fuelLP = pumpPressureRise(1.6e6, speed),
    fuelHP = pumpPressureRise(42.2e6, speed);
  const oxygenLP = pumpPressureRise(2.6e6, speed),
    oxygenHP = pumpPressureRise(27.2e6, speed);
  const lpftp = pump(0.2e6, fuelLP, fuel, REFERENCE.fuelDensity, 0.72, speed);
  const lpotp = pump(
    0.2e6,
    oxygenLP,
    oxidizer,
    REFERENCE.oxidizerDensity,
    0.75,
    speed,
  );
  // Hydraulic LPOTP drive returns to the LPOTP discharge, not the main injector.
  const recirculation =
    oxygenHP > 0
      ? (lpotp.turbinePower * REFERENCE.oxidizerDensity) / (oxygenHP * 0.78)
      : 0;
  const preburnerOxygen = oxidizer * 0.08;
  const boostPower = pumpPower(
    15e6 * scale,
    preburnerOxygen,
    REFERENCE.oxidizerDensity,
    0.75,
  );
  const hpftp = pump(
    lpftp.outlet,
    fuelHP,
    fuel,
    REFERENCE.fuelDensity,
    0.82,
    speed,
  );
  const hpotp = pump(
    lpotp.outlet,
    oxygenHP,
    oxidizer + recirculation,
    REFERENCE.oxidizerDensity,
    0.8,
    speed,
    boostPower,
  );
  // Illustrative branch allocations, not measured RS-25 flow splits.
  const chamberCoolant = fuel * 0.2,
    nozzleCoolant = fuel * 0.45,
    bypass = fuel * 0.35;
  const preburnerFuel = nozzleCoolant + bypass;
  const fuelPreburner = {
    hydrogen: preburnerFuel * 0.65,
    oxygen: preburnerOxygen * 0.65,
  };
  const oxidizerPreburner = {
    hydrogen: preburnerFuel * 0.35,
    oxygen: preburnerOxygen * 0.35,
  };
  const mainOxygen = oxidizer - preburnerOxygen;
  const hotGas = preburnerFuel + preburnerOxygen;
  const exhaustVelocity = a > 0 ? REFERENCE.exhaustVelocity : 0;
  const nominalPressureThrust =
    REFERENCE.thrust - nominalMass * REFERENCE.exhaustVelocity;
  const exitPressure = (nominalPressureThrust / REFERENCE.exitArea) * scale;
  const pressureThrust =
    a > 0 ? (exitPressure - ambientPressure) * REFERENCE.exitArea : 0;
  const momentumThrust = massFlow * exhaustVelocity;
  // Complete reaction of available oxygen at fixed fuel-rich overall O/F.
  const chemicalPower = (oxidizer / 8) * REFERENCE.hydrogenLHV;
  const preburnerHeat = (preburnerOxygen / 8) * REFERENCE.hydrogenLHV;
  const mainHeat = chemicalPower - preburnerHeat;
  const kineticPower = 0.5 * massFlow * exhaustVelocity ** 2;
  const externalHeat = chemicalPower * 0.02; // Declared lumped teaching-model assumption.
  const exhaustEnthalpy = chemicalPower - kineticPower - externalHeat;
  const pumps = { lpftp, hpftp, lpotp, hpotp };
  return {
    command,
    activity: a,
    scale,
    massFlow,
    fuel,
    oxidizer,
    pumps,
    chamberPressure: REFERENCE.chamberPressure * scale,
    ambientPressure,
    vacuumThrust: momentumThrust + exitPressure * REFERENCE.exitArea,
    thrust: momentumThrust + pressureThrust,
    plume: plumeState(
      REFERENCE.chamberPressure * scale,
      exitPressure,
      ambientPressure,
    ),
    exhaustVelocity,
    exitPressure,
    pressureThrust,
    momentumThrust,
    branches: {
      chamberCoolant,
      nozzleCoolant,
      bypass,
      preburnerFuel,
      preburnerOxygen,
      fuelPreburner,
      oxidizerPreburner,
      mainOxygen,
      hotGas,
      recirculation,
    },
    energy: {
      chemicalPower,
      preburnerHeat,
      mainHeat,
      kineticPower,
      externalHeat,
      exhaustEnthalpy,
      hpTurbines: hpftp.turbinePower + hpotp.turbinePower,
      preburnerGasAfterWork:
        preburnerHeat - hpftp.turbinePower - hpotp.turbinePower,
      coolingHeat: chemicalPower * 0.03,
      lpFuelAfterWork: chemicalPower * 0.03 - lpftp.turbinePower,
    },
  };
}
export type EngineState = ReturnType<typeof engineState>;
export type Startup = ReturnType<typeof startupState>;
const ramp = (t: number, from: number, to: number) => {
  const x = Math.max(0, Math.min(1, (t - from) / (to - from)));
  return x * x * (3 - 2 * x);
};
/** A reveal choreography in viewing seconds, never an actual ignition transient. */
export function startupState(time: number) {
  const t = Math.max(0, time);
  return {
    flow: ramp(t, 0, 2),
    pumps: ramp(t, 1, 4),
    preburner: ramp(t, 2.5, 4.5),
    combustion: ramp(t, 4.5, 6.5),
    exhaust: ramp(t, 6, 8),
    complete: t >= 8,
    stage:
      t < 1
        ? "Propellant paths"
        : t < 2.5
          ? "Pressure stages"
          : t < 4.5
            ? "Preburners & turbines"
            : t < 6.5
              ? "Main combustion"
              : t < 8
                ? "Nozzle expansion"
                : "Steady operation",
  };
}

/** Ideal-gas jet trend model. Cell size/brightness are illustrative, not RS-25 CFD. */
export function plumeState(chamber: number, exit: number, ambient: number) {
  const pa = Math.max(0, Number.isFinite(ambient) ? ambient : 101325);
  const pe = Math.max(0, Number.isFinite(exit) ? exit : 0);
  const pc = Math.max(pe, Number.isFinite(chamber) ? chamber : 0);
  const vacuum = pa < 1;
  const ratio = pa > 0 ? pe / pa : 0;
  const mismatch = pe > 0 && !vacuum ? Math.log(Math.max(0.001, ratio)) : 0;
  const regime =
    pe === 0
      ? "Engine off"
      : vacuum
        ? "Vacuum expansion"
        : Math.abs(mismatch) < 0.04
          ? "Pressure matched"
          : pe < pa
            ? "Overexpanded"
            : "Underexpanded";
  // Fully expanded ideal jet estimates; gamma fixed at 1.22. No solution at Pa=0.
  const gamma = 1.22;
  const mach = (p: number) =>
    Math.sqrt(
      Math.max(
        0,
        (2 / (gamma - 1)) *
          ((pc / Math.max(1, p)) ** ((gamma - 1) / gamma) - 1),
      ),
    );
  const area = (m: number) =>
    (1 / Math.max(1, m)) *
    ((2 / (gamma + 1)) * (1 + ((gamma - 1) * m * m) / 2)) **
      ((gamma + 1) / (2 * (gamma - 1)));
  const me = pe > 0 ? mach(pe) : 1;
  const mj = pe > 0 && !vacuum ? mach(pa) : me;
  const diameter = 2.29 * Math.sqrt(area(mj) / area(me));
  const spacing = 0.67 * diameter * Math.sqrt(Math.max(0, mj * mj - 1));
  const confinement = pa / (pa + 1500);
  return {
    regime,
    ratio,
    vacuum,
    // The display compresses longitudinal cell length for inspection, consistently.
    spacing: Math.min(7, Math.max(1.2, spacing * 1.31 * 0.64)),
    shockStrength:
      pe > 0 && !vacuum
        ? (1 - Math.exp(-Math.abs(mismatch) * 1.3)) * confinement
        : 0,
    spread:
      pe === 0
        ? 0
        : vacuum
          ? 0.3
          : Math.max(0.015, Math.min(0.26, 0.035 + mismatch * 0.058)),
    contraction: mismatch < 0 ? Math.min(0.55, -mismatch * 0.22) : 0,
    firstCell: mismatch < 0 ? 0.55 : 0.85,
  };
}
