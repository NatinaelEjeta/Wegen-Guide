"use client";

/**
 * Business license scene: a friendly isometric corner shop whose striped
 * awning unfolds each cycle while the OPEN sign pulses to life. Small
 * gold-framed sign board on the roof. Warm, welcoming mood.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const CYCLE = 4;
const AWNING_OPEN = -0.25;
const AWNING_CLOSED = -1.2;

const WINDOW_XS = [0.06, 0.32];
const SIDE_WINDOW_ZS = [-0.1, 0.18];

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

function smoothstep(x: number): number {
  const y = clamp01(x);
  return y * y * (3 - 2 * y);
}

export default function ShopAwningScene() {
  const rootRef = useRef<THREE.Group>(null);
  const awningRef = useRef<THREE.Group>(null);
  const signMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const signLightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const root = rootRef.current;
    if (root) {
      root.rotation.y += delta * 0.28;
      root.position.y = Math.sin(t * 0.85) * 0.035;
    }

    const cycleT = (t % CYCLE) / CYCLE;

    // awning unfolds with a soft overshoot, holds, folds back at the end
    const awning = awningRef.current;
    if (awning) {
      let angle: number;
      if (cycleT < 0.3) {
        angle =
          AWNING_CLOSED + (AWNING_OPEN - AWNING_CLOSED) * easeOutBack(clamp01(cycleT / 0.3));
      } else if (cycleT < 0.86) {
        angle = AWNING_OPEN;
      } else {
        angle =
          AWNING_OPEN + (AWNING_CLOSED - AWNING_OPEN) * easeInOut((cycleT - 0.86) / 0.14);
      }
      awning.rotation.x = angle;
    }

    // OPEN sign glows on as the shop opens, dims while the awning folds
    const on =
      smoothstep((cycleT - 0.22) / 0.1) * (1 - smoothstep((cycleT - 0.86) / 0.12));
    const signMat = signMatRef.current;
    if (signMat) signMat.emissiveIntensity = 0.15 + 1.25 * on;
    const signLight = signLightRef.current;
    if (signLight) signLight.intensity = 0.15 + 1.45 * on;
  });

  return (
    <group ref={rootRef}>
      {/* building body */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.95, 0.7, 0.7]} />
        <meshStandardMaterial color={PALETTE.cream} roughness={0.7} />
      </mesh>
      {/* flat roof slab */}
      <mesh position={[0, 0.325, 0]}>
        <boxGeometry args={[1.05, 0.05, 0.8]} />
        <meshStandardMaterial color={PALETTE.paper} roughness={0.65} />
      </mesh>

      {/* door */}
      <mesh position={[-0.18, -0.26, 0.355]}>
        <boxGeometry args={[0.16, 0.28, 0.03]} />
        <meshStandardMaterial color={PALETTE.green} roughness={0.55} />
      </mesh>
      <mesh position={[-0.125, -0.27, 0.374]}>
        <sphereGeometry args={[0.009, 8, 8]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* door step */}
      <mesh position={[-0.18, -0.3825, 0.41]}>
        <boxGeometry args={[0.26, 0.035, 0.12]} />
        <meshStandardMaterial color={PALETTE.paper} roughness={0.8} />
      </mesh>

      {/* warm front windows */}
      {WINDOW_XS.map((x) => (
        <mesh key={x} position={[x, 0.06, 0.355]}>
          <boxGeometry args={[0.15, 0.15, 0.03]} />
          <meshStandardMaterial
            color={PALETTE.ink}
            emissive={PALETTE.yellow}
            emissiveIntensity={0.4}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* side and back windows for the rotating view */}
      {SIDE_WINDOW_ZS.map((z) => (
        <mesh key={z} position={[-0.477, 0.06, z]}>
          <boxGeometry args={[0.03, 0.13, 0.13]} />
          <meshStandardMaterial
            color={PALETTE.ink}
            emissive={PALETTE.yellow}
            emissiveIntensity={0.35}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.05, -0.355]}>
        <boxGeometry args={[0.16, 0.14, 0.03]} />
        <meshStandardMaterial
          color={PALETTE.ink}
          emissive={PALETTE.yellow}
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </mesh>

      {/* striped awning over the entrance, unfolds from the wall */}
      <group ref={awningRef} position={[-0.18, -0.05, 0.365]} rotation={[AWNING_CLOSED, 0, 0]}>
        <mesh position={[0, 0, 0.14]}>
          <boxGeometry args={[0.7, 0.02, 0.28]} />
          <meshStandardMaterial color={PALETTE.red} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[0.7, 0.022, 0.05]} />
          <meshStandardMaterial color={PALETTE.cream} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.255]}>
          <boxGeometry args={[0.7, 0.022, 0.05]} />
          <meshStandardMaterial color={PALETTE.cream} roughness={0.6} />
        </mesh>
        {/* valance along the outer edge */}
        <mesh position={[0, -0.032, 0.278]}>
          <boxGeometry args={[0.7, 0.05, 0.012]} />
          <meshStandardMaterial color={PALETTE.red} roughness={0.6} />
        </mesh>
      </group>

      {/* OPEN sign above the door */}
      <mesh position={[-0.18, 0.13, 0.362]}>
        <boxGeometry args={[0.37, 0.145, 0.012]} />
        <meshStandardMaterial color={PALETTE.ink} roughness={0.5} />
      </mesh>
      <mesh position={[-0.18, 0.13, 0.3695]}>
        <planeGeometry args={[0.34, 0.12]} />
        <meshStandardMaterial
          ref={signMatRef}
          color="#0f3d27"
          emissive={PALETTE.neonGreen}
          emissiveIntensity={0.15}
          roughness={0.4}
          side={DoubleSide}
        />
      </mesh>
      <pointLight
        ref={signLightRef}
        position={[-0.18, 0.13, 0.6]}
        color={PALETTE.neonGreen}
        intensity={0.15}
        distance={2.2}
      />

      {/* small roof sign board with a gold frame */}
      <group position={[0.08, 0.43, -0.14]} rotation={[-0.08, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.44, 0.15, 0.018]} />
          <meshStandardMaterial color={PALETTE.paper} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[0.46, 0.014, 0.022]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.075, 0]}>
          <boxGeometry args={[0.46, 0.014, 0.022]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.223, 0, 0]}>
          <boxGeometry args={[0.014, 0.15, 0.022]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.223, 0, 0]}>
          <boxGeometry args={[0.014, 0.15, 0.022]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <circleGeometry args={[0.034, 20]} />
          <meshStandardMaterial color={PALETTE.green} roughness={0.5} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
