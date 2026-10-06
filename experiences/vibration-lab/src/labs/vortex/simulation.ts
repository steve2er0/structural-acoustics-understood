import { useEffect, useRef, useState } from "react";
import { axialTravel, physicalTimeRate, type Model } from "./physics";
export interface Clock {
  time: number;
  travel: number;
}
export function useWakeClock(model: Model, paused: boolean, playback: number) {
  const live = useRef<Clock>({ time: 0, travel: 0 });
  const [snapshot, setSnapshot] = useState(live.current);
  const latest = useRef({ model, paused, playback });
  latest.current = { model, paused, playback };
  // Flush the final shared instant so paused plots and the 3D surface agree exactly.
  useEffect(() => {
    if (paused) setSnapshot({ ...live.current });
  }, [paused]);
  useEffect(() => {
    let id = 0,
      last = performance.now(),
      published = last;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const c = latest.current;
      if (!c.paused && !document.hidden) {
        const physical = dt * physicalTimeRate(c.model, c.playback);
        live.current.time += physical;
        live.current.travel += axialTravel(c.model, physical);
        if (now - published > 50) {
          setSnapshot({
            time: live.current.time,
            travel: live.current.travel,
          });
          published = now;
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return {
    live,
    snapshot,
    reset: () => {
      live.current = { time: 0, travel: 0 };
      setSnapshot(live.current);
    },
  };
}
