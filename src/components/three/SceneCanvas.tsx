"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useDeviceCapability } from "@/lib/hooks/useDeviceCapability";

interface SceneCanvasProps {
  children: React.ReactNode;
  className?: string;
  /** stop rendering when off-screen or hidden (default true) */
  pauseWhenHidden?: boolean;
  onActivate?: () => void;
}

/**
 * Lightweight R3F canvas wrapper:
 * - caps DPR to save battery
 * - pauses the render loop when off-screen / app hidden
 * - low-power GPU hint, antialias off on low-end devices
 */
export function SceneCanvas({
  children,
  className,
  pauseWhenHidden = true,
  onActivate,
}: SceneCanvasProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const { isLowEnd } = useDeviceCapability();

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const running = pauseWhenHidden ? visible && pageVisible : true;

  return (
    <div
      ref={holderRef}
      className={className}
      role="img"
      aria-label="Animated illustration"
      onPointerDown={onActivate}
    >
      <Canvas
        frameloop={running ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.35, 4.1], fov: 42 }}
        gl={{
          antialias: !isLowEnd,
          alpha: true,
          powerPreference: "low-power",
          preserveDrawingBuffer: false,
        }}
        style={{ width: "100%", height: "100%", touchAction: "pan-y" }}
      >
        {children}
      </Canvas>
    </div>
  );
}
