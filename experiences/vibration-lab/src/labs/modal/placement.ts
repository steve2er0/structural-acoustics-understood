import { GRID } from "./physics";
export type PlacementTarget = "Impact" | "Reference";
/** Snap a plate-plane position to a free measurement location. */
export function nearestPoint(x: number, y: number, occupied: number) {
  let nearest = -1,
    distance = Infinity;
  GRID.forEach((point, i) => {
    if (i === occupied) return;
    // The plate is 600 x 400 mm: compare distances in its physical aspect ratio.
    const d = ((point.x - x) * 3) ** 2 + ((point.y - y) * 2) ** 2;
    if (d < distance) {
      nearest = i;
      distance = d;
    }
  });
  return nearest;
}
