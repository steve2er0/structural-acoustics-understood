import { forwardRef, type ComponentProps, type PointerEvent } from "react";
import { fromLogPosition, logPosition } from "./scaling";
export const logScale =
  (min: number, max: number, start: number, end: number) => (value: number) =>
    start + logPosition(value, min, max) * (end - start);
export function plotCoordinates(event: PointerEvent<SVGSVGElement>) {
  const matrix = event.currentTarget.getScreenCTM();
  return matrix
    ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      )
    : null;
}
export const EngineeringPlot = forwardRef<
  SVGSVGElement,
  Omit<ComponentProps<"svg">, "onSelect"> & {
    domain?: readonly [number, number];
    plotLeft?: number;
    plotWidth?: number;
    onSelect?: (value: number) => void;
  }
>(function EngineeringPlot(
  { domain, plotLeft = 0, plotWidth = 1, onSelect, children, ...props },
  ref,
) {
  const select = (event: PointerEvent<SVGSVGElement>) => {
    const point = plotCoordinates(event);
    if (point && domain && onSelect)
      onSelect(fromLogPosition((point.x - plotLeft) / plotWidth, ...domain));
  };
  return (
    <svg
      {...props}
      ref={ref}
      onPointerDown={
        onSelect
          ? (event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              select(event);
            }
          : props.onPointerDown
      }
      onPointerMove={
        onSelect
          ? (event) => {
              if (event.buttons === 1) select(event);
            }
          : props.onPointerMove
      }
    >
      {children}
    </svg>
  );
});
