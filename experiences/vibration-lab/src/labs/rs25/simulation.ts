import { useEffect, useRef, useState } from "react";
import { engineState, startupState } from "./physics";
import { lpftpRpm, LPFTP_REFERENCE } from "./lpftp";
export interface Playback {
  time: number;
  phase: number;
  running: boolean;
  paused: boolean;
  power: number;
  ambient: number;
  shaftTurns: number;
  cavityCycles: number;
  cavityOrder: number;
}
export function useEngine(
  power: number,
  paused: boolean,
  ambient = 101325,
  cavityOrder = 6.55,
) {
  const live = useRef<Playback>({
    time: 0,
    phase: 0,
    running: false,
    paused,
    power,
    ambient,
    shaftTurns: 0,
    cavityCycles: 0,
    cavityOrder,
  });
  const [snapshot, setSnapshot] = useState({ ...live.current });
  live.current.power = power;
  live.current.ambient = ambient;
  live.current.paused = paused;
  live.current.cavityOrder = cavityOrder;
  useEffect(() => {
    let id = 0,
      last = performance.now(),
      published = last;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!live.current.paused && !document.hidden && live.current.running) {
        live.current.time += dt;
        live.current.phase = Math.min(8, live.current.phase + dt);
        const turns =
          (((lpftpRpm(live.current.power) / 60) * dt) /
            LPFTP_REFERENCE.slowdown) *
          startupState(live.current.phase).pumps;
        live.current.shaftTurns += turns;
        live.current.cavityCycles += turns * live.current.cavityOrder;
      }
      if (now - published > 60) {
        setSnapshot({ ...live.current });
        published = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  const start = () => {
    live.current.phase = 0;
    live.current.time = 0;
    live.current.shaftTurns = 0;
    live.current.cavityCycles = 0;
    live.current.running = true;
    setSnapshot({ ...live.current });
  };
  const settle = () => {
    live.current.phase = 8;
    live.current.running = true;
    setSnapshot({ ...live.current });
  };
  const stop = () => {
    live.current.phase = 0;
    live.current.time = 0;
    live.current.shaftTurns = 0;
    live.current.cavityCycles = 0;
    live.current.running = false;
    setSnapshot({ ...live.current });
  };
  const reveal = startupState(snapshot.phase),
    state = engineState(power, snapshot.running ? 1 : 0, ambient);
  return { live, snapshot, reveal, state, start, settle, stop };
}
