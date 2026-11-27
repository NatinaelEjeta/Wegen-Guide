"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide } from "three";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const SWEEP_PERIOD = 2.8;
const SWEEP_START = -0.85;
const SWEEP_RANGE = 1.7;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number): number => {
  const k = clamp01(v);
  return k * k * (3 - 2 * k);
};

/**
 * National digital ID (Fayda): glossy holographic card floating in space
 * with a looping shimmer sweep, gold chip and engraved lines.
 * Slow continuous spin, gentle float and a soft green glow.
 */
export default function HolographicCardScene() {
  const root = useRef<THREE.Group>(null);
  const shimmer = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const g = root.current;
    if (g) {
      g.rotation.y += delta * 0.35;
      g.position.y = Math.sin(t * 1.2) * 0.06;
      g.rotation.x = 0.12 + Math.sin(t * 0.8) * 0.03;
    }

    const s = shimmer.current;
    if (s) {
      const u = (t % SWEEP_PERIOD) / SWEEP_PERIOD;
      s.position.x = SWEEP_START + smooth(u) * SWEEP_RANGE;
      const mat = s.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * Math.sin(Math.PI * u);
    }
  });

  return (
    <group ref={root}>
      {/* translucent glass shell just outside the card surface */}
      <mesh renderOrder={2}>
        <boxGeometry args={[1.56, 1.0, 0.075]} />
        <meshPhysicalMaterial
          color={PALETTE.hologram}
          transparent
          opacity={0.08}
          roughness={0.05}
          metalness={0.2}
          clearcoat={1}
          depthWrite={false}
        />
      </mesh>

      {/* holographic card body */}
      <mesh>
        <boxGeometry args={[1.5, 0.95, 0.045]} />
        <meshPhysicalMaterial
          color={PALETTE.hologramDeep}
          transparent
          opacity={0.92}
          roughness={0.12}
          metalness={0.55}
          clearcoat={1}
          clearcoatRoughness={0.2}
          emissive={PALETTE.hologram}
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* shimmer sweep kept just in front of the card face */}
      <mesh
        ref={shimmer}
        position={[0, 0, 0.032]}
        rotation={[0, 0, 0.12]}
        renderOrder={1}
      >
        <planeGeometry args={[0.25, 0.96]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>

      {/* gold chip, top-left of the face */}
      <mesh position={[-0.48, 0.27, 0.028]}>
        <boxGeometry args={[0.18, 0.14, 0.01]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* engraved text lines */}
      <mesh position={[-0.08, -0.02, 0.026]}>
        <boxGeometry args={[0.6, 0.035, 0.006]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-0.08, -0.14, 0.026]}>
        <boxGeometry args={[0.42, 0.035, 0.006]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} transparent opacity={0.7} />
      </mesh>

      {/* soft green glow near the card */}
      <pointLight
        position={[0.7, 0.55, 1.1]}
        intensity={6}
        distance={4}
        color={PALETTE.hologram}
      />
    </group>
  );
}
