"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color } from "three";
import type * as THREE from "three";
import { PALETTE } from "@/components/three/palette";

const CYCLE = 6;
const COVER_OPEN = 2.0;
const STAMP_REST_X = 0.68;
const STAMP_REST_Y = 0.06;
const STAMP_WORK_X = 0.18;
const STAMP_LIFT_Y = 0.35;
const STAMP_PRESS_Y = 0.05;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number): number => {
  const k = clamp01(v);
  return k * k * (3 - 2 * k);
};
const seg = (u: number, a: number, b: number): number => smooth((u - a) / (b - a));
/** Smooth rise-hold-fall bump between a and b. */
const bump = (u: number, a: number, b: number): number => {
  const p = clamp01((u - a) / (b - a));
  return smooth(clamp01(p * 2)) * smooth(clamp01((1 - p) * 2));
};

/**
 * Passport: an open-and-stamp loop over six seconds. The cover hinges open
 * on the left edge, a page lifts, the stamp slides in and thumps the page
 * leaving a red ring, then everything settles and the cover closes again.
 */
export default function PassportBookletScene() {
  const root = useRef<THREE.Group>(null);
  const coverPivot = useRef<THREE.Group>(null);
  const pageFlip = useRef<THREE.Group>(null);
  const stamp = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  // dark burgundy cover derived from the palette red
  const coverColor = useMemo(() => new Color(PALETTE.red).multiplyScalar(0.42), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const u = (t % CYCLE) / CYCLE;

    const g = root.current;
    if (g) {
      g.position.y = Math.sin(t * 1.0) * 0.05;
      g.rotation.x = 0.5 + Math.sin(t * 0.9) * 0.03;
      g.rotation.y = Math.sin(t * 0.5) * 0.12;
    }

    // cover: open over the first 35%, hold, close across the last 15%
    const cover = coverPivot.current;
    if (cover) {
      cover.rotation.z = COVER_OPEN * seg(u, 0, 0.35) * (1 - seg(u, 0.85, 1));
    }

    // inner page lifts and settles back mid-cycle
    const page = pageFlip.current;
    if (page) {
      page.rotation.z = 2.2 * bump(u, 0.36, 0.52);
    }

    // stamp: slide in, thump down with a bounce, lift, slide back to rest
    const st = stamp.current;
    if (st) {
      let x = STAMP_REST_X;
      let y = STAMP_REST_Y;
      if (u >= 0.5 && u < 0.55) {
        const p = seg(u, 0.5, 0.55);
        x = STAMP_REST_X + (STAMP_WORK_X - STAMP_REST_X) * p;
        y = STAMP_REST_Y + (STAMP_LIFT_Y - STAMP_REST_Y) * p;
      } else if (u >= 0.55 && u < 0.63) {
        x = STAMP_WORK_X;
        const p = (u - 0.55) / 0.08;
        y = STAMP_LIFT_Y + (STAMP_PRESS_Y - STAMP_LIFT_Y) * p * p;
      } else if (u >= 0.63 && u < 0.68) {
        x = STAMP_WORK_X;
        const p = (u - 0.63) / 0.05;
        y = STAMP_PRESS_Y + 0.035 * Math.sin(Math.PI * p);
      } else if (u >= 0.68 && u < 0.74) {
        x = STAMP_WORK_X;
        y = STAMP_PRESS_Y + (STAMP_LIFT_Y - STAMP_PRESS_Y) * seg(u, 0.68, 0.74);
      } else if (u >= 0.74 && u < 0.8) {
        const p = seg(u, 0.74, 0.8);
        x = STAMP_WORK_X + (STAMP_REST_X - STAMP_WORK_X) * p;
        y = STAMP_LIFT_Y + (STAMP_REST_Y - STAMP_LIFT_Y) * p;
      }
      st.position.set(x, y, 0.08);
      const squash = Math.sin(Math.PI * clamp01((u - 0.63) / 0.05));
      st.scale.set(1 + 0.06 * squash, 1 - 0.15 * squash, 1 + 0.06 * squash);
    }

    // ring mark: fades in at the thump, fades out as the cover closes
    const r = ring.current;
    if (r) {
      const mat = r.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.85 * seg(u, 0.62, 0.66) * (1 - seg(u, 0.85, 0.95));
      r.visible = mat.opacity > 0.01;
    }
  });

  return (
    <group ref={root}>
      {/* booklet base */}
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[1.1, 0.05, 0.78]} />
        <meshStandardMaterial color={coverColor} roughness={0.5} />
      </mesh>

      {/* lower page */}
      <mesh position={[0, -0.002, 0]}>
        <boxGeometry args={[1.0, 0.006, 0.7]} />
        <meshStandardMaterial color={PALETTE.paper} roughness={0.75} />
      </mesh>

      {/* inner page hinged on the left edge */}
      <group ref={pageFlip} position={[-0.5, 0.004, 0]}>
        <mesh position={[0.5, 0.002, 0]}>
          <boxGeometry args={[1.0, 0.006, 0.7]} />
          <meshStandardMaterial color={PALETTE.cream} roughness={0.75} />
        </mesh>
      </group>

      {/* cover hinged on the left edge */}
      <group ref={coverPivot} position={[-0.55, 0.018, 0]}>
        <mesh position={[0.55, 0, 0]}>
          <boxGeometry args={[1.1, 0.015, 0.78]} />
          <meshStandardMaterial color={coverColor} roughness={0.5} metalness={0.08} />
        </mesh>
      </group>

      {/* stamp with gold handle */}
      <group ref={stamp} position={[STAMP_REST_X, STAMP_REST_Y, 0.08]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.09, 0.1, 24]} />
          <meshStandardMaterial color={PALETTE.red} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshStandardMaterial color={PALETTE.gold} metalness={0.6} roughness={0.35} />
        </mesh>
      </group>

      {/* red ring mark left on the page */}
      <mesh ref={ring} position={[STAMP_WORK_X, 0.014, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.008, 12, 40]} />
        <meshStandardMaterial color={PALETTE.red} roughness={0.6} transparent opacity={0} />
      </mesh>
    </group>
  );
}
