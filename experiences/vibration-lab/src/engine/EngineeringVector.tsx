import { useEffect, useMemo } from "react";
import {
  ArrowHelper,
  CanvasTexture,
  Color,
  Group,
  Material,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  type ColorRepresentation,
} from "three";
import { visualLength } from "./scaling";
export function vectorGlyph(label: string, color: ColorRepresentation) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(10,24,28,.88)";
  ctx.beginPath();
  ctx.roundRect(1, 1, 126, 94, 16);
  ctx.fill();
  ctx.fillStyle = `#${new Color(color).getHexString()}`;
  ctx.font = `${label.length > 2 ? 31 : 52}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 64, 49);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(
    new SpriteMaterial({ map: texture, depthTest: false, transparent: true }),
  );
  sprite.scale.set(0.22, 0.165, 1);
  sprite.renderOrder = 17;
  return sprite;
}
export interface VectorSample {
  origin: Vector3;
  direction: Vector3;
  physicalValue: number;
  visualLength: number;
  visible?: boolean;
  pulse?: number;
}
/** Imperative sample() is allocation-free and supports per-frame animation without React renders. */
export class EngineeringVectorObject extends Group {
  readonly arrow: ArrowHelper;
  readonly glyph: Sprite;
  physicalValue = 0;
  constructor(color: ColorRepresentation, label = "") {
    super();
    this.arrow = new ArrowHelper(
      new Vector3(0, 1, 0),
      new Vector3(),
      1,
      color,
      0.17,
      0.075,
    );
    this.glyph = vectorGlyph(label, color);
    for (const child of [this.arrow.line, this.arrow.cone]) {
      (child.material as Material).depthTest = false;
      (child.material as Material).transparent = true;
      child.renderOrder = 15;
    }
    this.add(this.arrow, this.glyph);
  }
  sample({
    origin,
    direction,
    physicalValue,
    visualLength: length,
    visible = true,
    pulse = 1,
  }: VectorSample) {
    this.physicalValue = physicalValue;
    this.visible = visible && length > 0.012;
    this.arrow.position.copy(origin);
    this.arrow.setDirection(direction);
    this.arrow.setLength(
      Math.max(0.02, length),
      Math.min(0.17, length * 0.27),
      Math.min(0.075, length * 0.15),
    );
    this.glyph.position.copy(origin).addScaledVector(direction, length + 0.15);
    this.glyph.material.opacity = pulse;
  }
  dispose() {
    this.arrow.dispose();
    this.glyph.material.map?.dispose();
    this.glyph.material.dispose();
  }
}
export function EngineeringVector({
  origin = [0, 0, 0],
  direction = [0, 1, 0],
  magnitude,
  gain = 1,
  maxLength = Infinity,
  label = "",
  color = "#ffc387",
}: {
  origin?: [number, number, number];
  direction?: [number, number, number];
  magnitude: number;
  gain?: number;
  maxLength?: number;
  label?: string;
  color?: string;
}) {
  const vector = useMemo(
    () => new EngineeringVectorObject(color, label),
    [color, label],
  );
  useEffect(() => () => vector.dispose(), [vector]);
  useEffect(() => {
    vector.sample({
      origin: new Vector3(...origin),
      direction: new Vector3(...direction)
        .normalize()
        .multiplyScalar(magnitude < 0 ? -1 : 1),
      physicalValue: magnitude,
      visualLength: visualLength(magnitude, gain, maxLength),
    });
  }, [vector, origin, direction, magnitude, gain, maxLength]);
  return <primitive object={vector} />;
}
