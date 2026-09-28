import { Component, Suspense, type ReactNode } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="vl-scene-error" role="status">
        The 3D view needs WebGL. Controls, calculations and model notes remain
        available.
      </div>
    ) : (
      this.props.children
    );
  }
}
export function LabCanvas({ children, ...props }: CanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows
      gl={{ antialias: true, powerPreference: "high-performance" }}
      {...props}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
/** Local light cards avoid downloaded HDR textures; scene-specific key lights stay in each lab. */
export function LabEnvironment({
  variant = "shaker",
}: {
  variant?: "shaker" | "isolation";
}) {
  return (
    <Environment resolution={128} frames={1}>
      {variant === "isolation" ? (
        <>
          <Lightformer
            intensity={3}
            position={[-4, 6, 2]}
            scale={[7, 4, 1]}
            rotation-x={Math.PI / 4}
          />
          <Lightformer intensity={2} position={[4, 3, -5]} scale={[4, 5, 1]} />
          <Lightformer
            intensity={1}
            color="#c1e2e7"
            position={[0, 5, 4]}
            scale={[6, 2, 1]}
            rotation-x={Math.PI / 2}
          />
        </>
      ) : (
        <>
          <Lightformer
            form="rect"
            intensity={4}
            color="#e9f5df"
            position={[0, 6, 0]}
            rotation-x={Math.PI / 2}
            scale={[7, 4, 1]}
          />
          <Lightformer
            form="rect"
            intensity={4}
            color="#a6bec5"
            position={[-5, 2, 2]}
            rotation-y={Math.PI / 2}
            scale={[3, 7, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2}
            color="#d8b991"
            position={[4, 2, 3]}
            rotation-y={-Math.PI / 3}
            scale={[3, 6, 1]}
          />
        </>
      )}
    </Environment>
  );
}
