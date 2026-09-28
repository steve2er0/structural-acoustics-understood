import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { Vector3 } from "three";
export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}
export type CameraPresets<T extends string> = Record<T, CameraPreset>;
export function CameraController<T extends string>({
  presets,
  view,
  revision = 0,
  responsive,
  speed = 4,
  damping = 0.075,
  minDistance = 3.2,
  maxDistance = 30,
  minPolar = 0.15,
  stage,
}: {
  presets: CameraPresets<T>;
  view: T;
  revision?: number;
  responsive?: (preset: CameraPreset, view: T, width: number) => CameraPreset;
  speed?: number;
  damping?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolar?: number;
  stage?: RefObject<HTMLElement | null>;
}) {
  const orbit = useRef<OrbitImpl>(null),
    moving = useRef(true);
  const { camera, size } = useThree();
  const destination = useMemo(() => {
    const raw = presets[view],
      preset = responsive ? responsive(raw, view, size.width) : raw;
    return {
      position: new Vector3(...preset.position),
      target: new Vector3(...preset.target),
    };
  }, [presets, view, size.width, responsive]);
  useEffect(() => {
    moving.current = true;
    stage?.current?.setAttribute("data-camera-settled", "false");
  }, [destination, revision, stage]);
  const finish = () => {
    moving.current = false;
    stage?.current?.setAttribute("data-camera-settled", "true");
  };
  useFrame((_, dt) => {
    if (!moving.current || !orbit.current) return;
    const blend = 1 - Math.exp(-Math.min(dt, 0.05) * speed);
    camera.position.lerp(destination.position, blend);
    orbit.current.target.lerp(destination.target, blend);
    orbit.current.update();
    if (
      camera.position.distanceToSquared(destination.position) < 0.000064 &&
      orbit.current.target.distanceToSquared(destination.target) < 0.000064
    )
      finish();
  });
  return (
    <OrbitControls
      ref={orbit}
      makeDefault
      enableDamping
      dampingFactor={damping}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolar}
      maxPolarAngle={Math.PI / 2.03}
      onStart={finish}
    />
  );
}
