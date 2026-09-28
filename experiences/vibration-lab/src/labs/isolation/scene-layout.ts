/** Shared drawing dimensions. The lab is schematic, not a manufacturer CAD model. */
export const ASSEMBLY = {
  scale: 0.62,
  lift: 1.55,
};

export const GENERATOR = {
  position: [4.8, 0.55, 1.8] as [number, number, number],
  rotation: 0.38,
  scale: 0.58,
  // Face dimensions are local, before the instrument's uniform scale.
  width: 4,
  height: 2.25,
  faceZ: 0.866,
  pixels: 440,
};

export const SHAKER = {
  radius: 2.2,
  lip: ASSEMBLY.lift + 0.07 * ASSEMBLY.scale,
  bootHeight: 0.19 * ASSEMBLY.scale,
  socket: [2.64, -0.64, 0.8] as [number, number, number],
};
