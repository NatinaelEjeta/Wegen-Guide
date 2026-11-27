"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const RISE_CYCLE = 3;
const RISE_DELAY = 0.2;
const ANCHOR_Y = 0.26;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number): number => {
  const k = clamp01(v);
  return k * k * (3 - 2 * k);
};

/** Ease up, hold, settle back down: one staggered rise-and-rest loop. */
const riseProfile = (u: number): number => {
  if (u < 0.45) return smooth(u / 0.45);
  if (u < 0.8) return 1;
  return 1 - smooth((u - 0.8) / 0.2);
};

const BUILDINGS = [
  { x: -0.5, w: 0.16, h: 0.5 },
  { x: -0.25, w: 0.14, h: 0.3 },
  { x: 0.0, w: 0.16, h: 0.42 },
  { x: 0.25, w: 0.14, h: 0.2 },
  { x: 0.5, w: 0.16, h: 0.34 },
] as const;

/**
 * Kebele residence ID: cream card with a mini neighborhood skyline rising
 * out of the face in a staggered loop, plus a softly pulsing amber sun.
 * Slow continuous spin with a gentle float.
 */
export default function SkylineCardScene() {
  const root = useRef<THREE.Group>(null);
  const skyline = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const g = root.current;
    if (g) {
      g.rotation.y += delta * 0.25;
      g.position.y = Math.sin(t * 1.1) * 0.05;
      g.rotation.x = -0.08 + Math.sin(t * 0.7) * 0.02;
    }

    const sky = skyline.current;
    if (sky) {
      for (let i = 0; i < sky.children.length; i++) {
        const phase = ((((t - i * RISE_DELAY) % RISE_CYCLE) + RISE_CYCLE) % RISE_CYCLE) / RISE_CYCLE;
        const e = riseProfile(phase);
        sky.children[i].scale.y = 0.05 + e * 0.95;
      }
    }

    const s = sun.current;
    if (s) {
      s.scale.setScalar(1 + Math.sin(t * 2.1) * 0.08);
    }
  });

  return (
    <group ref={root}>
      {/* cream residence card */}
      <mesh>
        <boxGeometry args={[1.45, 0.92, 0.03]} />
        <meshStandardMaterial color={PALETTE.cream} roughness={0.6} />
      </mesh>

      {/* skyline rising out of the card face, staggered per building */}
      <group ref={skyline}>
        {BUILDINGS.map((b, i) => (
          <group key={i} position={[b.x, ANCHOR_Y, 0]}>
            <mesh position={[0, b.h / 2, 0]}>
              <boxGeometry args={[b.w, b.h, 0.1]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? PALETTE.green : PALETTE.greenSoft}
                roughness={0.55}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* amber sun disc, top-right, gentle pulse */}
      <mesh ref={sun} position={[0.55, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.01, 24]} />
        <meshStandardMaterial
          color={PALETTE.yellow}
          emissive={PALETTE.neonAmber}
          emissiveIntensity={0.7}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
