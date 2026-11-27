"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const CYCLE = 4.5;
const ROLL_SCALE = 0.12;
const SHEET_HALF = 0.65;
const SEAL_UP = 0.55;
const SEAL_DOWN = 0.012;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number): number => {
  const k = clamp01(v);
  return k * k * (3 - 2 * k);
};
const seg = (u: number, a: number, b: number): number => smooth((u - a) / (b - a));

/**
 * Birth certificate: warm paper scroll that unrolls with two rolled ends
 * drifting apart, receives a wax seal press, then rolls back up. Very slow
 * turntable spin with a gentle float.
 */
export default function PaperScrollScene() {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const sheet = useRef<THREE.Mesh>(null);
  const rollerTop = useRef<THREE.Mesh>(null);
  const rollerBottom = useRef<THREE.Mesh>(null);
  const seal = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const u = (t % CYCLE) / CYCLE;

    const g = root.current;
    if (g) {
      g.position.y = Math.sin(t * 1.15) * 0.045;
      g.rotation.z = Math.sin(t * 0.6) * 0.04;
    }

    const sp = spin.current;
    if (sp) {
      sp.rotation.y += delta * 0.2;
    }

    // sheet: unroll over the first 45%, hold, re-roll across the last 12%
    let s = 1;
    if (u < 0.45) {
      s = ROLL_SCALE + (1 - ROLL_SCALE) * smooth(u / 0.45);
    } else if (u >= 0.88) {
      s = 1 - (1 - ROLL_SCALE) * seg(u, 0.88, 1);
    }
    const sh = sheet.current;
    if (sh) {
      sh.scale.y = s;
    }
    const half = SHEET_HALF * s;
    if (rollerTop.current) {
      rollerTop.current.position.y = half;
    }
    if (rollerBottom.current) {
      rollerBottom.current.position.y = -half;
    }

    // wax seal: descend, squash on impact, relax, lift away
    const se = seal.current;
    if (se) {
      const active = u > 0.5 && u < 0.84;
      se.visible = active;
      if (active) {
        let z = SEAL_UP;
        if (u < 0.6) {
          const p = clamp01((u - 0.52) / 0.08);
          z = SEAL_UP + (SEAL_DOWN - SEAL_UP) * p * p;
        } else if (u < 0.7) {
          z = SEAL_DOWN;
        } else {
          z = SEAL_DOWN + (SEAL_UP - SEAL_DOWN) * seg(u, 0.7, 0.8);
        }
        se.position.z = z;
        let sq = 0;
        if (u >= 0.6 && u < 0.68) {
          sq = 1 - seg(u, 0.6, 0.68);
        }
        se.scale.set(1 + 0.15 * sq, 1 + 0.15 * sq, 1 - 0.45 * sq);
      }
    }
  });

  return (
    <group ref={root}>
      <group ref={spin}>
        <group rotation={[-1.0, 0, 0]}>
          {/* parchment sheet */}
          <mesh ref={sheet}>
            <planeGeometry args={[0.7, 1.3]} />
            <meshStandardMaterial color={PALETTE.cream} roughness={0.7} side={DoubleSide} />
          </mesh>

          {/* rolled ends that drift apart as the sheet unrolls */}
          <mesh ref={rollerTop} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 0.74, 20]} />
            <meshStandardMaterial color={PALETTE.paper} roughness={0.6} />
          </mesh>
          <mesh ref={rollerBottom} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 0.74, 20]} />
            <meshStandardMaterial color={PALETTE.paper} roughness={0.6} />
          </mesh>

          {/* wax seal press */}
          <group ref={seal} position={[0, 0.05, SEAL_UP]} visible={false}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.02, 32]} />
              <meshStandardMaterial color={PALETTE.red} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, -0.01]}>
              <torusGeometry args={[0.085, 0.012, 12, 40]} />
              <meshStandardMaterial color={PALETTE.red} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
