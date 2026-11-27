"use client";

/**
 * Land / house ownership scene: a calm isometric plot diorama with a
 * low-poly house, yellow boundary markers that grow from the corners in
 * a staggered loop, and a title document with a red seal hovering above
 * the roof. Warm and peaceful.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const GRASS_TOP = -0.235;
const MARKER_CYCLE = 3;
const MARKER_DELAYS = [0, 0.3, 0.6, 0.9];
const MARKER_XS = [-0.58, 0.58, -0.58, 0.58];
const MARKER_ZS = [-0.38, -0.38, 0.38, 0.38];

const STONES: Array<[number, number]> = [
  [0, 0.27],
  [0.02, 0.34],
  [-0.01, 0.41],
];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function easeOutCubic(x: number): number {
  const y = clamp01(x);
  return 1 - Math.pow(1 - y, 3);
}

function easeInOut(x: number): number {
  const y = clamp01(x);
  return y < 0.5 ? 2 * y * y : 1 - Math.pow(-2 * y + 2, 2) / 2;
}

/** Marker height envelope: staggered grow, hold, settle back down. */
function markerEnvelope(cycleT: number): number {
  if (cycleT < 0.25) return 0.05 + 0.95 * easeOutCubic(cycleT / 0.25);
  if (cycleT < 0.85) return 1;
  return 1 - 0.95 * easeInOut((cycleT - 0.85) / 0.15);
}

export default function HouseDioramaScene() {
  const rootRef = useRef<THREE.Group>(null);
  const docRef = useRef<THREE.Group>(null);
  const markerRefs = useRef<Array<THREE.Group | null>>([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const root = rootRef.current;
    if (root) {
      root.rotation.y += delta * 0.3;
      root.position.y = -0.1 + Math.sin(t * 0.7) * 0.02;
    }

    // boundary markers grow out of the ground, staggered per corner
    for (let i = 0; i < markerRefs.current.length; i++) {
      const marker = markerRefs.current[i];
      if (!marker) continue;
      const raw = (t - MARKER_DELAYS[i]) % MARKER_CYCLE;
      const cycleT = (raw < 0 ? raw + MARKER_CYCLE : raw) / MARKER_CYCLE;
      marker.scale.y = markerEnvelope(cycleT);
    }

    // title document bobbing gently above the roof
    const doc = docRef.current;
    if (doc) {
      doc.position.y = 0.56 + Math.sin(t * 1.4) * 0.035;
      doc.rotation.y = Math.sin(t * 0.6) * 0.25;
      doc.rotation.z = Math.sin(t * 0.9 + 1) * 0.045;
    }
  });

  return (
    <group ref={rootRef}>
      {/* plot: soil base with a grass top */}
      <mesh position={[0, -0.315, 0]}>
        <boxGeometry args={[1.4, 0.07, 1.0]} />
        <meshStandardMaterial color={PALETTE.green} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.2575, 0]}>
        <boxGeometry args={[1.32, 0.045, 0.92]} />
        <meshStandardMaterial color="#7fbe8f" roughness={0.85} />
      </mesh>

      {/* stepping stones from the door */}
      {STONES.map(([x, z], i) => (
        <mesh key={i} position={[x, GRASS_TOP + 0.007, z]}>
          <boxGeometry args={[0.1, 0.014, 0.06]} />
          <meshStandardMaterial color={PALETTE.paper} roughness={0.85} />
        </mesh>
      ))}

      {/* low-poly house */}
      <mesh position={[0, -0.075, 0]}>
        <boxGeometry args={[0.5, 0.32, 0.42]} />
        <meshStandardMaterial color={PALETTE.cream} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.195, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.38, 0.22, 4]} />
        <meshStandardMaterial color={PALETTE.red} roughness={0.55} flatShading />
      </mesh>
      {/* door with knob */}
      <mesh position={[0, -0.145, 0.212]}>
        <boxGeometry args={[0.12, 0.18, 0.024]} />
        <meshStandardMaterial color={PALETTE.green} roughness={0.55} />
      </mesh>
      <mesh position={[0.036, -0.15, 0.226]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* warm windows */}
      <mesh position={[-0.17, -0.06, 0.212]}>
        <boxGeometry args={[0.11, 0.11, 0.02]} />
        <meshStandardMaterial
          color={PALETTE.ink}
          emissive={PALETTE.yellow}
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.17, -0.06, 0.212]}>
        <boxGeometry args={[0.11, 0.11, 0.02]} />
        <meshStandardMaterial
          color={PALETTE.ink}
          emissive={PALETTE.yellow}
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-0.253, -0.06, 0.05]}>
        <boxGeometry args={[0.02, 0.1, 0.1]} />
        <meshStandardMaterial
          color={PALETTE.ink}
          emissive={PALETTE.yellow}
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </mesh>

      {/* boundary markers, one per plot corner */}
      {MARKER_DELAYS.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            markerRefs.current[i] = g;
          }}
          position={[MARKER_XS[i], GRASS_TOP, MARKER_ZS[i]]}
        >
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.016, 0.02, 0.14, 8]} />
            <meshStandardMaterial
              color={PALETTE.yellow}
              emissive={PALETTE.yellow}
              emissiveIntensity={0.18}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0.146, 0]}>
            <sphereGeometry args={[0.021, 8, 8]} />
            <meshStandardMaterial
              color={PALETTE.yellow}
              emissive={PALETTE.yellow}
              emissiveIntensity={0.18}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* floating title document with red seal */}
      <group ref={docRef} position={[0, 0.56, 0]}>
        <mesh>
          <planeGeometry args={[0.3, 0.4]} />
          <meshStandardMaterial
            color={PALETTE.cream}
            roughness={0.6}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[-0.015, 0.15, 0.004]}>
          <boxGeometry args={[0.2, 0.012, 0.004]} />
          <meshStandardMaterial color={PALETTE.ink} transparent opacity={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[-0.02, 0.09, 0.004]}>
          <boxGeometry args={[0.17, 0.008, 0.004]} />
          <meshStandardMaterial color={PALETTE.ink} transparent opacity={0.26} roughness={0.6} />
        </mesh>
        <mesh position={[-0.02, 0.03, 0.004]}>
          <boxGeometry args={[0.17, 0.008, 0.004]} />
          <meshStandardMaterial color={PALETTE.ink} transparent opacity={0.26} roughness={0.6} />
        </mesh>
        <mesh position={[-0.02, -0.03, 0.004]}>
          <boxGeometry args={[0.13, 0.008, 0.004]} />
          <meshStandardMaterial color={PALETTE.ink} transparent opacity={0.26} roughness={0.6} />
        </mesh>
        <mesh position={[0.095, -0.155, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.012, 16]} />
          <meshStandardMaterial
            color={PALETTE.red}
            roughness={0.35}
            metalness={0.15}
            emissive={PALETTE.red}
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>
    </group>
  );
}
