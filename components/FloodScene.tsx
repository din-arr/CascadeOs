"use client";

import { Billboard, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type FloodAsset = {
  id: string;
  name: string;
  type: "building" | "gate" | "electrical" | "pump" | "shelter";
  elevation: number;
  risk: "safe" | "warning" | "critical";
  deadline: string;
};

export const floodAssets: FloodAsset[] = [
  { id: "learning-commons", name: "Learning Commons", type: "building", elevation: 1.7, risk: "warning", deadline: "8h 10m" },
  { id: "hostel-a", name: "Student Hostel A", type: "building", elevation: 1.25, risk: "warning", deadline: "7h 05m" },
  { id: "gate-one", name: "Gate 1 / East", type: "gate", elevation: 0.8, risk: "critical", deadline: "6h 42m" },
  { id: "gate-two", name: "Gate 2 / North", type: "gate", elevation: 1.8, risk: "safe", deadline: "9h 18m" },
  { id: "substation", name: "Electrical substation", type: "electrical", elevation: 1.1, risk: "warning", deadline: "7h 15m" },
  { id: "pump", name: "Drainage pumps", type: "pump", elevation: 0.6, risk: "critical", deadline: "7h 15m" },
  { id: "shelter", name: "North shelter", type: "shelter", elevation: 2.8, risk: "safe", deadline: "Outside flood zone" },
];

export type FloodSceneProps = {
  waterLevel: number;
  timelineProgress: number;
  playing: boolean;
  speed: number;
  alternateRoute: boolean;
  cameraMode: "orbit" | "top";
  resetKey: number;
  assets?: FloodAsset[];
  custom?: boolean;
  onSelect: (asset: FloodAsset) => void;
};

const orbitPosition = new THREE.Vector3(10.8, 9.6, 12.2);
const topPosition = new THREE.Vector3(0, 20, 0.01);
const target = new THREE.Vector3(0, 0, 0);
const remembered = { position: orbitPosition.clone(), target: target.clone(), valid: false, mode: "orbit" };
const primaryRoute: [number, number, number][] = [[3.7, .2, 2.9], [2.4, .2, 1.8], [1, .2, .8], [-1.3, .2, -1.6], [-4.6, .2, -3.6]];
const alternateRoute: [number, number, number][] = [[-3.7, .2, -2.7], [-2.9, .2, -1.6], [-1.3, .2, -1.6], [-4.6, .2, -3.6]];
const demoPositions: Record<string, [number, number, number]> = {
  "learning-commons": [-2.2, 0, 0.2], "hostel-a": [0.2, 0, 1.1], "gate-one": [3.7, 0, 2.9],
  "gate-two": [-3.7, 0, -2.7], substation: [2.3, 0, -1.1], pump: [3.3, 0, -2.4], shelter: [-4.6, 0, -3.6],
};

function getPosition(asset: FloodAsset, index: number, custom: boolean): [number, number, number] {
  if (!custom && demoPositions[asset.id]) return demoPositions[asset.id];
  const col = index % 4;
  const row = Math.floor(index / 4);
  return [-4.2 + col * 2.7, 0, -2.8 + row * 2.6];
}
function condition(asset: FloodAsset, depth: number, alternate: boolean): "CRITICAL" | "AT RISK" | "OPERATIONAL" | "UNAVAILABLE" {
  if (asset.id === "gate-one" && alternate) return "UNAVAILABLE";
  const local = Math.max(0, depth - asset.elevation);
  return local > .7 ? "CRITICAL" : local > .1 ? "AT RISK" : "OPERATIONAL";
}
function statusColor(status: string) {
  return status === "CRITICAL" || status === "UNAVAILABLE" ? "#f27d85" : status === "AT RISK" ? "#e9bd78" : "#60c7aa";
}

function CampusBuilding({ asset, position, waterLevel, alternate, onSelect }: {
  asset: FloodAsset; position: [number, number, number]; waterLevel: number; alternate: boolean; onSelect: () => void;
}) {
  const status = condition(asset, waterLevel, alternate);
  const color = statusColor(status);
  const shelter = asset.type === "shelter";
  const height = shelter ? 1.1 : asset.id === "hostel-a" ? 2.15 : 1.65;
  const width = shelter ? 1.45 : 1.7;
  return <group position={position} onClick={e => { e.stopPropagation(); onSelect(); }}>
    <mesh castShadow position={[0, height / 2, 0]}><boxGeometry args={[width, height, 1.5]} /><meshStandardMaterial color={shelter ? "#344e50" : "#3b4852"} roughness={.8} /></mesh>
    <mesh castShadow position={[0, height + .11, 0]}><boxGeometry args={[width + .12, .22, 1.63]} /><meshStandardMaterial color={status === "CRITICAL" ? "#754d54" : "#52636b"} roughness={.68} /></mesh>
    {[-1, 0, 1].map(i => <group key={i} position={[i * .47, Math.min(height - .3, .64), .77]}>
      <mesh><boxGeometry args={[.21, .31, .03]} /><meshStandardMaterial color="#a5d9e4" emissive="#477d91" emissiveIntensity={.25} /></mesh>
    </group>)}
    <mesh position={[0, .07, .78]}><boxGeometry args={[.34, .14, .08]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.4} /></mesh>
    <Billboard position={[0, height + .8, 0]}>
      <Text fontSize={.18} color="#f0f6f3" anchorX="center" outlineWidth={.018} outlineColor="#05090d" maxWidth={2.6}>{asset.name}</Text>
      <Text position={[0, -.25, 0]} fontSize={.125} color={color} anchorX="center" outlineWidth={.016} outlineColor="#05090d">{status}</Text>
    </Billboard>
  </group>;
}
function CampusMarker({ asset, position, waterLevel, alternate, onSelect }: {
  asset: FloodAsset; position: [number, number, number]; waterLevel: number; alternate: boolean; onSelect: () => void;
}) {
  const status = condition(asset, waterLevel, alternate);
  const color = statusColor(status);
  return <group position={position} onClick={e => { e.stopPropagation(); onSelect(); }}>
    <mesh castShadow position={[0, .32, 0]}><cylinderGeometry args={[.23, .3, .64, 8]} /><meshStandardMaterial color="#46555b" roughness={.8} /></mesh>
    <mesh position={[0, .7, 0]}><cylinderGeometry args={[.16, .16, .1, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.55} /></mesh>
    <pointLight position={[0, .9, 0]} color={color} distance={1.4} intensity={.7} />
    <Billboard position={[0, 1.35, 0]}>
      <Text fontSize={.17} color="#f0f6f3" anchorX="center" outlineWidth={.016} outlineColor="#05090d" maxWidth={2.7}>{asset.name}</Text>
      <Text position={[0, -.22, 0]} fontSize={.12} color={color} anchorX="center" outlineWidth={.014} outlineColor="#05090d">{status}</Text>
    </Billboard>
  </group>;
}

function FloodWater({ waterLevel, playing, speed, custom }: Pick<FloodSceneProps, "waterLevel" | "playing" | "speed" | "custom">) {
  const mesh = useRef<THREE.Mesh>(null);
  const smooth = useRef(waterLevel);
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;
    smooth.current = THREE.MathUtils.damp(smooth.current, waterLevel, 4, delta);
    mesh.current.position.y = .015 + smooth.current * .36;
    const material = mesh.current.material as THREE.MeshStandardMaterial;
    material.opacity = smooth.current <= .03 ? 0 : Math.min(.73, .22 + smooth.current * .09);
    material.emissiveIntensity = .11 + (playing ? Math.sin(clock.elapsedTime * speed * 1.4) * .035 : 0);
  });
  return <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, .01, custom ? 0 : 2.4]} receiveShadow>
    <planeGeometry args={[custom ? 14 : 12.7, custom ? 11 : 5.4, 24, 14]} />
    <meshStandardMaterial color="#3e8fa9" emissive="#17445e" emissiveIntensity={.11} transparent opacity={.32} depthWrite={false} roughness={.27} metalness={.2} />
  </mesh>;
}

function EvacuationBus({ progress, alternate }: { progress: number; alternate: boolean }) {
  const bus = useRef<THREE.Group>(null);
  const smooth = useRef(progress);
  const points = alternate ? alternateRoute : primaryRoute;
  useFrame((_, delta) => {
    if (!bus.current) return;
    smooth.current = THREE.MathUtils.damp(smooth.current, progress, 7, delta);
    const scaled = THREE.MathUtils.clamp(smooth.current, 0, 1) * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(scaled));
    const fraction = scaled - index;
    const a = points[index], b = points[index + 1];
    bus.current.position.set(THREE.MathUtils.lerp(a[0], b[0], fraction), .32, THREE.MathUtils.lerp(a[2], b[2], fraction));
    bus.current.rotation.y = -Math.atan2(b[2] - a[2], b[0] - a[0]);
  });
  return <group ref={bus}>
    <mesh castShadow><boxGeometry args={[.57, .23, .29]} /><meshStandardMaterial color="#67c9ee" metalness={.3} roughness={.4} /></mesh>
    <mesh position={[0, .13, 0]}><boxGeometry args={[.35, .11, .26]} /><meshStandardMaterial color="#b1e2ed" /></mesh>
  </group>;
}

function CameraRig({ mode, resetKey }: { mode: FloodSceneProps["cameraMode"]; resetKey: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree(state => state.camera);
  const previous = useRef<{ mode: string; resetKey: number } | null>(null);
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const first = previous.current === null;
    const reset = !first && previous.current?.resetKey !== resetKey;
    const switched = !first && previous.current?.mode !== mode;
    if (reset || switched || (first && (!remembered.valid || remembered.mode !== mode))) {
      camera.position.copy(mode === "top" ? topPosition : orbitPosition);
      orbit.target.copy(target);
      remembered.position.copy(camera.position);
      remembered.target.copy(target);
      remembered.valid = true;
      remembered.mode = mode;
    } else if (first) {
      camera.position.copy(remembered.position);
      orbit.target.copy(remembered.target);
    }
    camera.updateProjectionMatrix();
    orbit.update();
    previous.current = { mode, resetKey };
  }, [camera, mode, resetKey]);
  const remember = () => {
    if (!controls.current) return;
    remembered.position.copy(camera.position);
    remembered.target.copy(controls.current.target);
    remembered.valid = true;
    remembered.mode = mode;
  };
  return <OrbitControls ref={controls} makeDefault enableRotate enableZoom enablePan enableDamping dampingFactor={.08}
    rotateSpeed={.7} zoomSpeed={.9} panSpeed={.7} screenSpacePanning minDistance={2} maxDistance={50}
    minPolarAngle={.06} maxPolarAngle={Math.PI * .72} onChange={remember} onEnd={remember} />;
}

function SceneContents({ props }: { props: FloodSceneProps }) {
  const assets = props.assets ?? floodAssets;
  const positions = useMemo(() => assets.map((asset, i) => getPosition(asset, i, Boolean(props.custom))), [assets, props.custom]);
  return <>
    <CameraRig mode={props.cameraMode} resetKey={props.resetKey} />
    <ambientLight intensity={1.05} color="#c0d7df" />
    <hemisphereLight args={["#d1e7f1", "#142331", 1.1]} />
    <directionalLight castShadow position={[5, 11, 7]} intensity={2.1} color="#f0f7ff" shadow-mapSize={[1024, 1024]} />
    <fog attach="fog" args={["#07131c", 20, 45]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[15, 12]} /><meshStandardMaterial color="#1e3642" roughness={.96} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, -2.4]} receiveShadow><planeGeometry args={[12, 1.25]} /><meshStandardMaterial color="#34464c" roughness={.94} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.65, .02, .6]}><planeGeometry args={[1.1, 7.2]} /><meshStandardMaterial color="#34464c" roughness={.92} /></mesh>
    {Array.from({ length: 11 }, (_, i) => <group key={i} position={[-6.2 + (i % 6) * 2.4, 0, i < 6 ? -4.7 : 4.7]}>
      <mesh position={[0, .25, 0]}><cylinderGeometry args={[.08, .12, .5, 7]} /><meshStandardMaterial color="#59635a" /></mesh>
      <mesh position={[0, .76, 0]}><coneGeometry args={[.45, 1.15, 8]} /><meshStandardMaterial color="#2d5550" roughness={.95} /></mesh>
    </group>)}
    {!props.custom && <>
      <Line points={primaryRoute} color={props.alternateRoute ? "#c65e6d" : "#77cbe9"} lineWidth={3} dashed dashSize={.25} gapSize={.16} transparent opacity={props.alternateRoute ? .42 : .95} />
      {props.alternateRoute && <Line points={alternateRoute} color="#6ee2b8" lineWidth={4} dashed dashSize={.27} gapSize={.12} />}
    </>}
    {props.custom && positions.length >= 2 && <Line points={positions.slice(0, 10).map(([x,,z]) => [x, .18, z] as [number,number,number])} color="#77cbe9" lineWidth={2} dashed dashSize={.22} gapSize={.18} />}
    <FloodWater waterLevel={props.waterLevel} playing={props.playing} speed={props.speed} custom={props.custom} />
    {assets.slice(0, 12).map((asset, i) => asset.type === "building" || asset.type === "shelter" ?
      <CampusBuilding key={asset.id} asset={asset} position={positions[i]} waterLevel={props.waterLevel} alternate={props.alternateRoute} onSelect={() => props.onSelect(asset)} /> :
      <CampusMarker key={asset.id} asset={asset} position={positions[i]} waterLevel={props.waterLevel} alternate={props.alternateRoute} onSelect={() => props.onSelect(asset)} />)}
    {!props.custom && <EvacuationBus progress={props.timelineProgress} alternate={props.alternateRoute} />}
    <Text position={[0, .12, 5.35]} rotation={[-Math.PI / 2, 0, 0]} fontSize={.24} color="#a1c7d5" anchorX="center">{props.custom ? "SCHEMATIC CUSTOM ASSETS" : "ILLUSTRATIVE CAMPUS / NOT TO SCALE"}</Text>
  </>;
}

export default function FloodScene(props: FloodSceneProps) {
  const [localReset, setLocalReset] = useState(0);
  return <div className="flood-scene">
    <Canvas shadows="basic" dpr={[1, 1.5]} camera={{ position: [10.8, 9.6, 12.2], fov: 43, near: .1, far: 100 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      fallback={<div className="scene-fallback">3D unavailable on this device. Scenario planning controls remain accessible.</div>}>
      <SceneContents props={{ ...props, resetKey: props.resetKey + localReset }} />
    </Canvas>
    <div className="scene-overlay scene-overlay-top"><span>{props.custom ? "SCHEMATIC MODEL / USER ASSUMPTIONS" : "ILLUSTRATIVE 3D FLOOD MODEL"}</span>
      <div className="scene-top-actions"><b>{props.waterLevel.toFixed(1)}M VISUALIZED</b><button className="scene-reset-button" type="button" onClick={() => setLocalReset(k => k + 1)}>RESET CAMERA</button></div>
    </div>
    <div className="scene-overlay scene-overlay-bottom"><span>DRAG TO ORBIT / SCROLL TO ZOOM / CLICK AN ASSET</span><span>NOT A REAL GIS OR FLOOD FORECAST</span></div>
  </div>;
}
