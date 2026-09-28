import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Matrix4, Mesh, ShaderMaterial, Vector3 } from "three";
import { engineState, startupState } from "./physics";
import type { Playback } from "./simulation";

// A view-independent emissive volume. Standing cells stay fixed; only small
// turbulent fluctuations advect. All uniforms come from the engine state.
export function Plume({
  live,
  compact = false,
}: {
  live: RefObject<Playback>;
  compact?: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const inverse = useMemo(() => new Matrix4(), []);
  const uniforms = useMemo(
    () => ({
      eye: { value: new Vector3() },
      strength: { value: 0 },
      time: { value: 0 },
      spacing: { value: 2.6 },
      shock: { value: 0 },
      spread: { value: 0.04 },
      contraction: { value: 0 },
      firstCell: { value: 0.55 },
    }),
    [],
  );
  useFrame(({ camera }) => {
    if (!mesh.current || !material.current) return;
    const u = material.current.uniforms;
    const l = live.current,
      p = engineState(l.power, l.running ? 1 : 0, l.ambient).plume;
    mesh.current.visible = l.running && l.phase > 6;
    inverse.copy(mesh.current.matrixWorld).invert();
    u.eye.value.copy(camera.position).applyMatrix4(inverse);
    u.strength.value = (startupState(l.phase).exhaust * l.power) / 109;
    u.time.value = l.time;
    u.spacing.value = p.spacing;
    u.shock.value = p.shockStrength;
    u.spread.value = p.spread;
    u.contraction.value = p.contraction;
    u.firstCell.value = p.firstCell;
  });
  return (
    <mesh
      ref={mesh}
      position={[0, compact ? -5.8 : -10, 0]}
      scale={compact ? [1, 0.4, 1] : [1, 1, 1]}
      renderOrder={5}
    >
      <boxGeometry args={[12, 14, 12]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={BackSide}
        toneMapped={false}
        vertexShader={`varying vec3 local; void main(){local=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`
        precision highp float;
        varying vec3 local;
        uniform vec3 eye;
        uniform float strength,time,spacing,shock,spread,contraction,firstCell;
        void main(){
          vec3 ray=normalize(local-eye);
          vec3 inv=1./ray;
          vec3 lo=(-vec3(6.,7.,6.)-eye)*inv;
          vec3 hi=( vec3(6.,7.,6.)-eye)*inv;
          vec3 a=min(lo,hi),b=max(lo,hi);
          float nearT=max(0.,max(max(a.x,a.y),a.z));
          float farT=min(min(b.x,b.y),b.z);
          if(farT<=nearT) discard;
          float stepSize=(farT-nearT)/64.;
          vec4 sum=vec4(0.);
          for(int i=0;i<64;i++){
            vec3 p=eye+ray*(nearT+(float(i)+.5)*stepSize);
            float s=7.-p.y;
            float r=length(p.xz);
            float fade=exp(-s*.14)*(1.-smoothstep(10.,14.,s));
            float cell=s/spacing-firstCell;

            float radius=1.43*(1.-contraction*(1.-exp(-s*1.7)))+s*spread;
            radius*=1.+shock*.18*sin(cell*6.283185);
            float noise=sin(s*7.-time*12.+p.x*5.)*sin(p.z*6.+s*3.-time*6.);
            float body=exp(-pow(r/max(.1,radius),4.)*2.2);
            float halo=exp(-pow(r/(radius*1.32),2.)*3.);
            // Rhomboid emissive cores and oblique compression fronts.
            float axial=abs(fract(cell+.5)-.5)*2.;
            float diamond=exp(-pow(r/(radius*.65)+axial*1.35,2.)*5.);
            float front=exp(-pow(abs(r/radius-abs(sin(cell*3.141593))),2.)*85.);
            float cells=shock*(diamond*3.7+front*.25)*exp(-s*.05);
            float dens=(body*(.13+noise*.016)+halo*.05+cells*.7)*fade*strength;
            vec3 blue=vec3(.19,.31,1.0);
            vec3 violet=vec3(.55,.38,1.0);
            vec3 core=vec3(1.65,1.75,2.0);
            vec3 color=mix(blue,violet,smoothstep(0.,10.,s));
            color=mix(color,core,clamp(cells*.8,0.,1.));
            float alpha=1.-exp(-dens*stepSize*1.8);
            sum.rgb+=(1.-sum.a)*color*alpha;
            sum.a+=(1.-sum.a)*alpha;
          }
          if(sum.a<.004) discard;
          gl_FragColor=vec4(sum.rgb/max(.001,sum.a),sum.a);
        }`}
      />
    </mesh>
  );
}
