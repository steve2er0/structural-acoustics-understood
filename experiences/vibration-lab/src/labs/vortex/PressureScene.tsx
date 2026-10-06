import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  DoubleSide,
  Group,
  LatheGeometry,
  LinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  Vector2,
} from "three";
import { SCALE, TAIL, type Body, type Model } from "./physics";
import {
  noseY,
  omlProfile,
  ATTACHMENT_Y,
  MODE_RATIOS,
  MODE_STRIDE,
  attachments,
  attachmentWakeCenter,
  convectionSpeed,
  type Attachment,
  pressureModes,
  pressureRgb,
  pressureScale,
  tapPoint,
  wrapAngle,
  type PressureSettings,
  type PressureTap,
  type PressureUnit,
} from "./pressure";
import type { Clock } from "./simulation";

export interface PressureDisplay {
  settings: PressureSettings;
  unit: PressureUnit;
  limit: number;
  taps: [PressureTap, PressureTap];
  activeTap: number;
  onPlace: (tap: PressureTap) => void;
}
interface Props {
  model: Model;
  live: RefObject<Clock>;
  display: PressureDisplay;
  paint?: boolean;
}
const WIDTH = 128,
  HEIGHT = 160;
function PressureSkin({
  model,
  body,
  live,
  display,
  paint = true,
}: Props & { body: Body }) {
  const skin = useMemo(() => {
    const geometry = new LatheGeometry(
      omlProfile(body).map(
        ([r, y]) => new Vector2(r * SCALE + (r > 0 ? 0.003 : 0), y * SCALE),
      ),
      96,
    );
    const positions = geometry.getAttribute("position"),
      uv = geometry.getAttribute("uv");
    for (let i = 0; i < positions.count; i++)
      uv.setY(i, (positions.getY(i) / SCALE - TAIL) / (noseY(body) - TAIL));
    const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
    const texture = new DataTexture(pixels, WIDTH, HEIGHT, RGBAFormat);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    return { geometry, texture, pixels };
  }, [body.index]);
  useEffect(
    () => () => {
      skin.geometry.dispose();
      skin.texture.dispose();
    },
    [skin],
  );
  const coefficients = useMemo(() => {
    const values = new Float32Array(WIDTH * HEIGHT * MODE_STRIDE);
    for (let j = 0; j < HEIGHT; j++)
      for (let i = 0; i < WIDTH; i++) {
        const modes = pressureModes(
          model,
          body,
          display.settings,
          TAIL + (j / (HEIGHT - 1)) * (noseY(body) - TAIL),
          (i / (WIDTH - 1)) * 2 * Math.PI,
        );
        modes.forEach((m, k) => {
          const n = (j * WIDTH + i) * MODE_STRIDE + k * 2;
          values[n] = m.cosine;
          values[n + 1] = m.sine;
        });
      }
    return values;
  }, [model, body, display.settings]);
  const last = useRef(-Infinity),
    previous = useRef<object>(null);
  useFrame(() => {
    const time = live.current.time;
    if (time === last.current && previous.current === display) return;
    last.current = time;
    previous.current = display;
    const ratios = MODE_RATIOS,
      c = ratios.map((r) =>
        Math.cos(2 * Math.PI * r * display.settings.frequency * time),
      ),
      s = ratios.map((r) =>
        Math.sin(2 * Math.PI * r * display.settings.frequency * time),
      );
    const scale = pressureScale(model, display.unit);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      let value = 0;
      for (let k = 0; k < MODE_RATIOS.length; k++)
        value +=
          coefficients[i * MODE_STRIDE + k * 2] * c[k] +
          coefficients[i * MODE_STRIDE + k * 2 + 1] * s[k];
      const rgb = pressureRgb(value * scale, display.limit),
        n = i * 4;
      skin.pixels[n] = rgb[0];
      skin.pixels[n + 1] = rgb[1];
      skin.pixels[n + 2] = rgb[2];
      skin.pixels[n + 3] = 255;
    }
    skin.texture.needsUpdate = true;
  });
  const place = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 5) return;
    display.onPlace({
      body: body.index,
      y: e.point.y / SCALE,
      theta: wrapAngle(
        Math.atan2(e.point.x / SCALE - body.x, e.point.z / SCALE),
      ),
    });
  };
  return (
    <mesh position-x={body.x * SCALE} geometry={skin.geometry} onClick={place}>
      <meshBasicMaterial
        visible={paint}
        map={skin.texture}
        side={DoubleSide}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}
function TapMarker({
  tap,
  body,
  index,
}: {
  tap: PressureTap;
  body: Body;
  index: number;
}) {
  const marker = useMemo(() => {
    const point = tapPoint(body, tap).map((v) => v * SCALE) as [
      number,
      number,
      number,
    ];
    const label: [number, number, number] = [
      point[0],
      point[1] + (index ? -0.4 : 0.4),
      point[2],
    ];
    const line = new BufferGeometry();
    line.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([...point, ...label]), 3),
    );
    return { point, label, line };
  }, [body, tap, index]);
  useEffect(() => () => marker.line.dispose(), [marker]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(48, 48, 40, 0, Math.PI * 2);
    ctx.fillStyle = index ? "#beadff" : "#ffc85e";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#10222b";
    ctx.stroke();
    ctx.fillStyle = "#10222b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(index ? "B" : "A", 48, 51);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [index]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <lineSegments geometry={marker.line} renderOrder={999}>
        <lineBasicMaterial
          color={index ? "#beadff" : "#ffc85e"}
          depthTest={false}
          depthWrite={false}
        />
      </lineSegments>
      <mesh position={marker.point} renderOrder={1000}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshBasicMaterial
          color={index ? "#beadff" : "#ffc85e"}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <sprite
        position={marker.label}
        scale={[0.55, 0.55, 0.55]}
        renderOrder={1000}
      >
        <spriteMaterial
          map={texture}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
export function PressureVehicle(props: Props) {
  return (
    <group>
      {props.model.bodies.map((body) => (
        <PressureSkin key={body.index} {...props} body={body} />
      ))}
      {props.display.taps.map((tap, i) => {
        const body = props.model.bodies.find((b) => b.index === tap.body);
        if (!body) return null;
        return <TapMarker key={i} tap={tap} body={body} index={i} />;
      })}
    </group>
  );
}
/** Discrete roll-up packets originate at the forward bracket, never at the nose. */
function AttachmentWake({
  model,
  source,
  live,
  display,
  slice,
}: Props & { source: Attachment; slice: boolean }) {
  const packets = useRef<Group>(null);
  const guide = useMemo(() => {
    const g = new BufferGeometry(),
      points = new Float32Array(64 * 2 * 3);
    for (let i = 0; i < 64; i++)
      for (let j = 0; j < 2; j++) {
        const p = attachmentWakeCenter(
          model,
          source,
          ((ATTACHMENT_Y - TAIL + 10) * (i + j)) / 64,
        );
        points.set(
          p.map((v) => v * SCALE),
          (i * 2 + j) * 3,
        );
      }
    g.setAttribute("position", new BufferAttribute(points, 3));
    return g;
  }, [model, source]);
  useEffect(() => () => guide.dispose(), [guide]);
  useFrame(() => {
    const uc = convectionSpeed(model),
      f = display.settings.frequency;
    const spacing = uc / (2 * f),
      travel =
        live.current.time * uc + (source.sign * 0.4 * uc) / (2 * Math.PI * f);
    const lead = spacing > 0 ? ((travel % spacing) + spacing) % spacing : 0;
    packets.current?.children.forEach((child, i) => {
      const s = slice ? ATTACHMENT_Y : lead + i * spacing;
      child.visible = model.speed > 0 && s < ATTACHMENT_Y - TAIL + 10;
      const p = attachmentWakeCenter(model, source, s);
      const phase =
        2 * Math.PI * f * (live.current.time - s / Math.max(uc, 1e-9)) +
        source.sign * 0.4;
      p[2] += 0.12 * Math.sin(phase) * (display.settings.amplitude / 0.12);
      child.position.set(
        p[0] * SCALE,
        slice ? 0.2 : p[1] * SCALE,
        p[2] * SCALE,
      );
      child.scale.setScalar((0.7 + 0.016 * s) * Math.min(1, s / 1.5));
    });
  });
  return (
    <group>
      {!slice && (
        <lineSegments geometry={guide}>
          <lineBasicMaterial color="#d9b570" transparent opacity={0.25} />
        </lineSegments>
      )}
      <group ref={packets}>
        {Array.from({ length: slice ? 1 : 48 }, (_, i) => (
          <mesh
            key={i}
            rotation={slice ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0]}
          >
            <torusGeometry args={[0.1, 0.014, 6, 24, Math.PI * 1.7]} />
            <meshBasicMaterial
              color={i % 2 ? "#72daca" : "#efae79"}
              transparent
              opacity={0.65}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
export function PressureCores(props: Props & { slice: boolean }) {
  const sources = useMemo(() => attachments(props.model), [props.model]);
  return (
    <group>
      {sources.map((source) => (
        <AttachmentWake key={source.booster} {...props} source={source} />
      ))}
    </group>
  );
}
function AttachmentLabel({ sign }: { sign: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 54;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#14232d";
    ctx.fillRect(0, 0, 256, 54);
    ctx.strokeStyle = "#e9b75c";
    ctx.strokeRect(1, 1, 254, 52);
    ctx.fillStyle = "#e9b75c";
    ctx.font = "24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sign < 0 ? "PORT ATTACH" : "STBD ATTACH", 128, 28);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [sign]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={[sign * 0.6, 0.25, 0.15]}
      scale={[1.4, 0.3, 1]}
      renderOrder={999}
    >
      <spriteMaterial
        map={texture}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
export function AttachmentHighlights({ model }: { model: Model }) {
  return (
    <group>
      {attachments(model).map((source) => (
        <group
          key={source.booster}
          position={[source.x * SCALE, ATTACHMENT_Y * SCALE, 0]}
        >
          <mesh>
            <boxGeometry
              args={[(model.settings.gap + 0.35) * SCALE, 0.17, 0.2]}
            />
            <meshStandardMaterial
              color="#e9b75c"
              emissive="#b26716"
              emissiveIntensity={0.25}
              roughness={0.35}
              metalness={0.4}
            />
          </mesh>
          <AttachmentLabel sign={source.sign} />
        </group>
      ))}
    </group>
  );
}
