import { useCallback, useEffect, useRef, useState } from "react";
import {
  integrateTransientEnergy,
  zeroEnergy,
  physicalTimeRate,
  type Model,
  type EnergyVector,
} from "./physics";
export interface EnergyPoint {
  t: number;
  energy: EnergyVector;
}
export interface Simulation {
  energy: EnergyVector;
  time: number;
  motionTime: number;
  history: EnergyPoint[];
}
const fresh = (energy: EnergyVector): Simulation => ({
  energy,
  time: 0,
  motionTime: 0,
  history: [{ t: 0, energy: [...energy] }],
});
export function useEnergy(model: Model, paused: boolean) {
  const live = useRef<Simulation>(fresh(zeroEnergy()));
  const [snapshot, publish] = useState(live.current);
  const current = useRef({ model, paused });
  current.current = { model, paused };
  useEffect(() => {
    if (paused) publish({ ...live.current });
  }, [paused]);
  const reset = useCallback((energy: EnergyVector = zeroEnergy()) => {
    live.current = fresh(energy);
    publish(live.current);
  }, []);
  useEffect(() => {
    let id = 0,
      previous = performance.now(),
      published = previous;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const { model, paused } = current.current;
      if (!paused && !document.hidden) {
        const s = live.current,
          physicalDt = dt * physicalTimeRate(model.settings.frequency);
        const energy = integrateTransientEnergy(model, s.energy, physicalDt);
        live.current = {
          ...s,
          energy,
          time: s.time + physicalDt,
          motionTime: s.motionTime + dt,
        };
        if (now - published > 60) {
          const value = live.current;
          value.history = [
            ...value.history.slice(-240),
            { t: value.time, energy: [...energy] },
          ];
          publish({ ...value });
          published = now;
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return { live, snapshot, reset };
}
