"use client";

/**
 * Marriage certificate scene: a soft rose certificate whose ribbon bow
 * ties itself in a gentle loop, with two gold rings floating and turning
 * above it. Pastel, calm and respectful. Pure procedural geometry.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const ROSE = "#e05c84";
const ROSE_DEEP = "#cf4e74";
const CERT_TINT = "#fff7f3";

const CYCLE = 4.5;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = x - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

function easeInOut(x: number): number {
  const y = clamp01(x);
  return y < 0.5 ? 2 * y * y : 1 - Math.pow(-2 * y + 2, 2) / 2;
}

/** Bow scale over one cycle: elastic tie-in, hold, smooth release. */
function bowEnvelope(cycleT: number): number {
  if (cycleT < 0.3) return easeOutBack(clamp01(cycleT / 0.3));
  if (cycleT < 0.88) return 1;
  return 1 - easeInOut((cycleT - 0.88) / 0.12);
}

export default function RibbonRingsScene() {
  const rootRef = useRef<THREE.Group>(null);
  const bowRef = useRef<THREE.Group>(null);
  const ringLRef = useRef<THREE.Group>(null);
  const ringRRef = useRef<THREE.Group>(null);
  const ringLMeshRef = useRef<THREE.Mesh>(null);
  const ringRMeshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const root = rootRef.current;
    if (root) {
      root.rotation.y += delta * 0.22;
      root.position.y = Math.sin(t * 0.9) * 0.035;
    }

    const bow = bowRef.current;
    if (bow) {
      const cycleT = (t % CYCLE) / CYCLE;
      const s = Math.max(bowEnvelope(cycleT), 0.001);
      bow.scale.set(s, s, s * 0.62);
    }

    const ringL = ringLRef.current;
    if (ringL) {
      ringL.position.x = -0.47 + Math.sin(t * 0.5) * 0.035;
      ringL.position.y = 0.44 + Math.sin(t * 1.25) * 0.05;
      ringL.rotation.z = -0.18 + Math.sin(t * 0.7) * 0.1;
    }
    const ringLMesh = ringLMeshRef.current;
    if (ringLMesh) ringLMesh.rotation.y = t * 0.85;

    const ringR = ringRRef.current;
    if (ringR) {
      ringR.position.x = 0.47 + Math.sin(t * 0.5 + 1.8) * 0.035;
      ringR.position.y = 0.44 + Math.sin(t * 1.25 + Math.PI * 0.8) * 0.05;
      ringR.rotation.z = 0.18 + Math.sin(t * 0.7 + 1.4) * 0.1;
    }
    const ringRMesh = ringRMeshRef.current;
    if (ringRMesh) ringRMesh.rotation.x = t * 0.75;
  });

  return (
    <group ref={rootRef}>
      {/* certificate sheet, standing upright with a slight tilt */}
      <group position={[0, -0.05, 0]} rotation={[0.02, 0, 0.03]}>
        <mesh>
          <boxGeometry args={[1.2, 0.85, 0.02]} />
          <meshStandardMaterial color={CERT_TINT} roughness={0.55} metalness={0.02} />
        </mesh>

        {/* gold border */}
        <mesh position={[0, 0.36, 0.013]}>
          <boxGeometry args={[1.1, 0.012, 0.006]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.36, 0.013]}>
          <boxGeometry args={[1.1, 0.012, 0.006]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.55, 0, 0.013]}>
          <boxGeometry args={[0.012, 0.732, 0.006]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.55, 0, 0.013]}>
          <boxGeometry args={[0.012, 0.732, 0.006]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* emblem */}
        <mesh position={[0, 0.2, 0.013]}>
          <torusGeometry args={[0.05, 0.008, 8, 24]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0.0135]}>
          <circleGeometry args={[0.032, 20]} />
          <meshStandardMaterial color={ROSE} roughness={0.55} side={DoubleSide} />
        </mesh>

        {/* engraved text lines */}
        <mesh position={[0, 0.02, 0.013]}>
          <boxGeometry args={[0.56, 0.014, 0.005]} />
          <meshStandardMaterial color={PALETTE.ink} transparent opacity={0.24} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.05, 0.013]}>
          <boxGeometry args={[0.68, 0.014, 0.005]} />
          <meshStandardMaterial color={PALETTE.ink} transparent opacity={0.2} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.12, 0.013]}>
          <boxGeometry args={[0.4, 0.014, 0.005]} />
          <meshStandardMaterial color={PALETTE.ink} transparent opacity={0.2} roughness={0.6} />
        </mesh>

        {/* ribbon bow at the bottom center, ties itself each cycle */}
        <group ref={bowRef} position={[0, -0.39, 0.035]}>
          <mesh
            position={[-0.072, 0.012, 0]}
            rotation={[0, 0, Math.PI / 2 - 0.25]}
            scale={[1.25, 1, 1]}
          >
            <torusGeometry args={[0.09, 0.028, 10, 20, Math.PI]} />
            <meshStandardMaterial color={ROSE} roughness={0.5} />
          </mesh>
          <mesh
            position={[0.072, 0.012, 0]}
            rotation={[0, 0, -Math.PI / 2 + 0.25]}
            scale={[1.25, 1, 1]}
          >
            <torusGeometry args={[0.09, 0.028, 10, 20, Math.PI]} />
            <meshStandardMaterial color={ROSE} roughness={0.5} />
          </mesh>
          <mesh scale={[1.2, 0.9, 0.8]}>
            <sphereGeometry args={[0.036, 12, 12]} />
            <meshStandardMaterial color={ROSE_DEEP} roughness={0.45} />
          </mesh>
          <mesh position={[-0.04, -0.115, 0]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[0.032, 0.15, 0.014]} />
            <meshStandardMaterial color={ROSE_DEEP} roughness={0.5} />
          </mesh>
          <mesh position={[0.04, -0.115, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.032, 0.15, 0.014]} />
            <meshStandardMaterial color={ROSE_DEEP} roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* floating gold rings, one above each upper corner */}
      <group ref={ringLRef} position={[-0.47, 0.44, 0.06]} rotation={[0.5, 0.2, -0.18]}>
        <mesh ref={ringLMeshRef}>
          <torusGeometry args={[0.16, 0.022, 12, 40]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
      <group ref={ringRRef} position={[0.47, 0.44, 0.06]} rotation={[-0.42, -0.15, 0.18]}>
        <mesh ref={ringRMeshRef}>
          <torusGeometry args={[0.16, 0.022, 12, 40]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* soft warm accent light so the gold catches a highlight */}
      <pointLight position={[0.9, 0.9, 1.5]} color="#ffe9c4" intensity={1.2} distance={5} />
    </group>
  );
}
