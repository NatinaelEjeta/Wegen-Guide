"use client";

import React, { Suspense, useMemo, useState } from "react";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import { SCENE_REGISTRY } from "@/components/three/sceneRegistry";
import { ObjectFallback } from "@/components/object/ObjectFallback";
import { useVisualMode } from "@/lib/hooks/useDeviceCapability";
import type { ObjectType } from "@/lib/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-24 w-24",
  md: "h-44 w-full",
  lg: "h-52 w-full",
};

interface ServiceObject3DProps {
  objectType: ObjectType;
  size?: Size;
  className?: string;
  /** called when the user taps the object (interactive scenes) */
  onActivate?: () => void;
  /** alt label for screen readers / fallback */
  label?: string;
}

/**
 * Renders a service's signature animated object.
 * - Capable devices: real 3D (lazy loaded, paused when off-screen)
 * - Low-end / reduced-motion / no WebGL: lightweight CSS fallback
 */
export function ServiceObject3D({
  objectType,
  size = "md",
  className,
  onActivate,
  label,
}: ServiceObject3DProps) {
  const { mode3d } = useVisualMode();
  const [ready, setReady] = useState(false);
  const Scene = useMemo(() => SCENE_REGISTRY[objectType], [objectType]);

  if (!mode3d || !Scene) {
    return (
      <ObjectFallback
        objectType={objectType}
        size={size}
        className={className}
        label={label}
      />
    );
  }

  return (
    <div className={`${SIZES[size]} ${className ?? ""} relative`}>
      <SceneCanvas className="h-full w-full" onActivate={onActivate}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[2.5, 3, 2]} intensity={0.9} />
          <group onPointerDown={onActivate}>
            <Scene />
          </group>
        </Suspense>
      </SceneCanvas>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <ObjectFallback objectType={objectType} size="md" muted />
        </div>
      )}
      {/* mark ready shortly after mount; scenes self-manage loading */}
      <ReadyTimer onReady={() => setReady(true)} />
    </div>
  );
}

function ReadyTimer({ onReady }: { onReady: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onReady, 400);
    return () => clearTimeout(t);
  }, [onReady]);
  return null;
}
