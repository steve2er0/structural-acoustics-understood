import { Camera, Vector3 } from "three";
export interface AnnotationPlacement {
  offsetX?: number;
  offsetY?: number;
  centered?: boolean;
  visible?: boolean;
  margin?: number;
  keepInside?: boolean;
}
/** One projector per animation loop; reuses its vector and writes only DOM transforms. */
export function createAnnotationProjector() {
  const point = new Vector3();
  const dimensions = new WeakMap<
    HTMLElement,
    { width: number; viewport: number }
  >();
  return (
    element: HTMLElement | null,
    position: readonly [number, number, number],
    camera: Camera,
    size: { width: number; height: number },
    {
      offsetX = 0,
      offsetY = 0,
      centered = false,
      visible = true,
      margin = 30,
      keepInside = false,
    }: AnnotationPlacement = {},
  ) => {
    if (!element) return;
    point.set(...position).project(camera);
    const x = ((point.x + 1) * size.width) / 2,
      y = ((1 - point.y) * size.height) / 2;
    const shown =
      visible &&
      point.z >= -1 &&
      point.z <= 1 &&
      x > margin &&
      x < size.width - margin &&
      y > margin &&
      y < size.height - margin;
    let drawX = x + offsetX;
    if (keepInside) {
      let measured = dimensions.get(element);
      if (!measured || measured.viewport !== size.width) {
        measured = { width: element.offsetWidth, viewport: size.width };
        dimensions.set(element, measured);
      }
      drawX = Math.max(
        margin + (centered ? measured.width / 2 : 0),
        Math.min(
          size.width -
            margin -
            (centered ? measured.width / 2 : measured.width),
          drawX,
        ),
      );
    }
    element.style.opacity = shown ? "1" : "0";
    element.style.visibility = shown ? "visible" : "hidden";
    element.style.transform = `${centered ? "translate(-50%, -50%) " : ""}translate3d(${drawX}px,${y + offsetY}px,0)`;
  };
}
