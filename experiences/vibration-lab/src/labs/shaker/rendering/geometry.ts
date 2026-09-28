import * as THREE from "three";
export const OPEN_START = 1.92;
export const KEEP_ARC = Math.PI * 2 - 2.1;
export const FRONT_START = OPEN_START + KEEP_ARC;
export const FRONT_ARC = 2.1;
/** Closed annular sectors, including the two exposed cut faces. Axis is +Y. */
export function annulus(
  inner: number,
  outer: number,
  height: number,
  start = 0,
  arc = Math.PI * 2,
) {
  const shape = new THREE.Shape();
  const point = (r: number, t: number) =>
    new THREE.Vector2(r * Math.sin(t), r * Math.cos(t));
  const steps = Math.ceil((arc / (Math.PI * 2)) * 96);
  const outerPoints = Array.from({ length: steps + 1 }, (_, i) =>
    point(outer, start + (i / steps) * arc),
  );
  shape.moveTo(outerPoints[0].x, outerPoints[0].y);
  outerPoints.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
  if (arc > Math.PI * 2 - 0.0001) {
    shape.closePath();
    if (inner > 0) {
      const hole = new THREE.Path();
      const p = point(inner, start);
      hole.moveTo(p.x, p.y);
      for (let i = 1; i <= steps; i++) {
        const p = point(inner, start - (i / steps) * arc);
        hole.lineTo(p.x, p.y);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  } else {
    for (let i = steps; i >= 0; i--) {
      const p = point(inner, start + (i / steps) * arc);
      shape.lineTo(p.x, p.y);
    }
    shape.closePath();
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 64,
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, height / 2, 0);
  g.computeVertexNormals();
  return g;
}
export const radial = (
  r: number,
  y: number,
  a: number,
): [number, number, number] => [r * Math.sin(a), y, r * Math.cos(a)];
export function ribbonGeometry(segments = 24) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array((segments + 1) * 2 * 3), 3),
  );
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(indices);
  return geometry;
}
export function updateRibbon(
  g: THREE.BufferGeometry,
  angle: number,
  y: number,
  travel: number,
) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const segments = p.count / 2 - 1;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      a = angle + 0.32 * Math.sin((t * Math.PI) / 2),
      r = 2.07 - 0.89 * t;
    const bend = t * t * (3 - 2 * t);
    const width = 0.045;
    p.setXYZ(
      i * 2,
      r * Math.sin(a) + width * Math.cos(a),
      y + travel * bend,
      r * Math.cos(a) - width * Math.sin(a),
    );
    p.setXYZ(
      i * 2 + 1,
      r * Math.sin(a) - width * Math.cos(a),
      y + travel * bend,
      r * Math.cos(a) + width * Math.sin(a),
    );
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}
