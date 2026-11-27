"use client";

/**
 * Driver's license scene: a glowing neon card glides along a night road
 * with sliding lane dashes, additive light trails and a small low-poly
 * car that follows with a slight lead. Neon night-road mood.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const ROAD_TOP = -0.25;
const DASH_COUNT = 6;
const DASH_GAP = 0.28;
const DASH_HALF = 0.84;
const DASH_SPEED = 1.15;
const TRAIL_A_SPEED = 1.9;
const TRAIL_B_SPEED = 2.45;
const TRAIL_HALF = 0.72;
const RIDE = 0.55;
const OMEGA = (Math.PI * 2) / 3.2;
const WHEEL_R = 0.03;

const WHEEL_POS: Array<[number, number, number]> = [
  [0.07, 0, 0.052],
  [0.07, 0, -0.052],
  [-0.07, 0, 0.052],
  [-0.07, 0, -0.052],
];

/** Wrap x into the range [-half, half). */
function wrapRange(x: number, half: number): number {
  const span = half * 2;
  const m = ((x % span) + span) % span;
  return m - half;
}

/** Shortest signed angle between two angles. */
function shortestAngle(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export default function NeonRoadCardScene() {
  const rootRef = useRef<THREE.Group>(null);
  const dashRefs = useRef<Array<THREE.Mesh | null>>([]);
  const cardRef = useRef<THREE.Group>(null);
  const cardMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const carRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<Array<THREE.Group | null>>([]);
  const trailAMeshRef = useRef<THREE.Mesh>(null);
  const trailBMeshRef = useRef<THREE.Mesh>(null);
  const trailAMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const trailBMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const spinRef = useRef(0);
  const yawRef = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const root = rootRef.current;
    if (root) root.position.y = Math.sin(t * 0.8) * 0.02;

    // lane dashes drifting along the road, wrapped in a loop
    for (let i = 0; i < dashRefs.current.length; i++) {
      const dash = dashRefs.current[i];
      if (dash) dash.position.x = wrapRange(i * DASH_GAP - t * DASH_SPEED, DASH_HALF);
    }

    // hero license card gliding and banking above the road
    const phase = t * OMEGA;
    const cardX = Math.sin(phase) * RIDE;
    const card = cardRef.current;
    if (card) {
      card.position.x = cardX;
      card.position.y = 0.01 + Math.sin(t * 2.1) * 0.018;
      card.rotation.z = -Math.cos(phase) * 0.1;
      card.rotation.y = Math.sin(phase + 1.2) * 0.12;
      card.rotation.x = Math.sin(t * 1.7) * 0.05;
    }
    const cardMat = cardMatRef.current;
    if (cardMat) cardMat.emissiveIntensity = 1.2 + Math.sin(t * 3.1) * 0.12;

    // car follows with a slight lead, turning around at the road ends
    const carX = Math.sin(phase + 0.5) * RIDE;
    const vx = RIDE * OMEGA * Math.cos(phase + 0.5);
    const car = carRef.current;
    if (car) {
      car.position.x = carX;
      const targetYaw = vx >= 0 ? 0 : Math.PI;
      yawRef.current += shortestAngle(yawRef.current, targetYaw) * Math.min(1, delta * 5);
      car.rotation.y = yawRef.current;
      car.rotation.z = -Math.cos(phase + 0.5) * 0.045;
    }
    spinRef.current -= (vx / WHEEL_R) * delta;
    for (let i = 0; i < wheelRefs.current.length; i++) {
      const wheel = wheelRefs.current[i];
      if (wheel) wheel.rotation.z = spinRef.current;
    }

    // light trails racing past, fading toward the road ends
    const trailA = trailAMeshRef.current;
    const trailAMat = trailAMatRef.current;
    if (trailA && trailAMat) {
      trailA.position.x = wrapRange(0.15 - t * TRAIL_A_SPEED, TRAIL_HALF);
      const edge = 1 - Math.min(Math.abs(trailA.position.x) / TRAIL_HALF, 1);
      trailA.scale.x = 0.5 + 0.5 * edge;
      trailAMat.opacity = 0.05 + 0.45 * edge * edge;
    }
    const trailB = trailBMeshRef.current;
    const trailBMat = trailBMatRef.current;
    if (trailB && trailBMat) {
      trailB.position.x = wrapRange(-0.35 - t * TRAIL_B_SPEED, TRAIL_HALF);
      const edge = 1 - Math.min(Math.abs(trailB.position.x) / TRAIL_HALF, 1);
      trailB.scale.x = 0.5 + 0.5 * edge;
      trailBMat.opacity = 0.05 + 0.4 * edge * edge;
    }
  });

  return (
    <group ref={rootRef}>
      {/* night road strip */}
      <mesh position={[0, ROAD_TOP - 0.01, 0]}>
        <boxGeometry args={[1.7, 0.02, 0.6]} />
        <meshStandardMaterial color={PALETTE.nightRoad} roughness={0.9} metalness={0.15} />
      </mesh>

      {/* road edge markings */}
      <mesh position={[0, ROAD_TOP + 0.004, -0.27]}>
        <boxGeometry args={[1.66, 0.005, 0.014]} />
        <meshBasicMaterial color={PALETTE.paper} transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, ROAD_TOP + 0.004, 0.27]}>
        <boxGeometry args={[1.66, 0.005, 0.014]} />
        <meshBasicMaterial color={PALETTE.paper} transparent opacity={0.3} />
      </mesh>

      {/* dashed center line, sliding in a loop */}
      {Array.from({ length: DASH_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            dashRefs.current[i] = m;
          }}
          position={[0, ROAD_TOP + 0.008, 0]}
        >
          <boxGeometry args={[0.075, 0.006, 0.02]} />
          <meshStandardMaterial
            color={PALETTE.yellow}
            emissive={PALETTE.yellow}
            emissiveIntensity={0.9}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* hero license card */}
      <group ref={cardRef} position={[0, 0.01, 0]}>
        <mesh>
          <boxGeometry args={[0.62, 0.4, 0.02]} />
          <meshStandardMaterial
            ref={cardMatRef}
            color={PALETTE.green}
            emissive={PALETTE.neonGreen}
            emissiveIntensity={1.2}
            roughness={0.35}
            metalness={0.25}
          />
        </mesh>
        <mesh position={[0, 0.165, 0.012]}>
          <boxGeometry args={[0.62, 0.035, 0.006]} />
          <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.55} />
        </mesh>
        <mesh position={[-0.19, 0.02, 0.013]}>
          <boxGeometry args={[0.1, 0.13, 0.008]} />
          <meshStandardMaterial color={PALETTE.silver} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.09, 0.085, 0.013]}>
          <boxGeometry args={[0.3, 0.014, 0.005]} />
          <meshBasicMaterial color={PALETTE.cream} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.11, 0.02, 0.013]}>
          <boxGeometry args={[0.22, 0.014, 0.005]} />
          <meshBasicMaterial color={PALETTE.cream} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.13, -0.05, 0.013]}>
          <boxGeometry args={[0.16, 0.014, 0.005]} />
          <meshBasicMaterial color={PALETTE.cream} transparent opacity={0.4} />
        </mesh>
        <pointLight
          position={[0, -0.08, 0.35]}
          color={PALETTE.neonGreen}
          intensity={4}
          distance={3}
        />
      </group>

      {/* low-poly car ahead of the card */}
      <group ref={carRef} position={[0, -0.22, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.22, 0.07, 0.11]} />
          <meshStandardMaterial color={PALETTE.red} roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[-0.01, 0.105, 0]}>
          <boxGeometry args={[0.1, 0.055, 0.085]} />
          <meshStandardMaterial color={PALETTE.ink} roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0.112, 0.05, 0]}>
          <boxGeometry args={[0.008, 0.02, 0.07]} />
          <meshBasicMaterial color={PALETTE.neonAmber} />
        </mesh>
        <mesh position={[-0.112, 0.05, 0]}>
          <boxGeometry args={[0.008, 0.02, 0.07]} />
          <meshBasicMaterial color={PALETTE.red} />
        </mesh>
        {WHEEL_POS.map((p, i) => (
          <group
            key={i}
            position={p}
            ref={(g) => {
              wheelRefs.current[i] = g;
            }}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.024, 12]} />
              <meshStandardMaterial color={PALETTE.ink} roughness={0.7} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.048, 0.008, 0.026]} />
              <meshStandardMaterial color={PALETTE.silver} metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        ))}
        <pointLight
          position={[0, 0.12, 0.3]}
          color={PALETTE.neonAmber}
          intensity={4}
          distance={3}
        />
      </group>

      {/* additive light trails */}
      <mesh ref={trailAMeshRef} position={[0, ROAD_TOP + 0.015, -0.18]}>
        <boxGeometry args={[0.55, 0.01, 0.03]} />
        <meshBasicMaterial
          ref={trailAMatRef}
          color={PALETTE.neonGreen}
          transparent
          opacity={0.4}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={trailBMeshRef} position={[0, ROAD_TOP + 0.015, 0.18]}>
        <boxGeometry args={[0.55, 0.01, 0.03]} />
        <meshBasicMaterial
          ref={trailBMatRef}
          color={PALETTE.neonAmber}
          transparent
          opacity={0.35}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
