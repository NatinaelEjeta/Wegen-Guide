"use client";

import dynamic from "next/dynamic";

/**
 * Registry of 3D scenes, keyed by the service objectType.
 * Every scene is lazy-loaded (code-split) so the initial bundle stays tiny.
 * Scenes must default-export a component with NO props, self-contained
 * animation via useFrame, centered at origin, sized to fit a ~1.6 unit box.
 * Each scene shows only when the device is capable; otherwise
 * ObjectFallback (CSS) is used — see ServiceObject3D.tsx.
 */
export const SCENE_REGISTRY: Record<string, React.ComponentType> = {
  "holographic-card": dynamic(() => import("@/components/three/scenes/HolographicCardScene")),
  "skyline-card": dynamic(() => import("@/components/three/scenes/SkylineCardScene")),
  "passport-booklet": dynamic(() => import("@/components/three/scenes/PassportBookletScene")),
  "paper-scroll": dynamic(() => import("@/components/three/scenes/PaperScrollScene")),
  "ribbon-rings": dynamic(() => import("@/components/three/scenes/RibbonRingsScene")),
  "neon-road-card": dynamic(() => import("@/components/three/scenes/NeonRoadCardScene")),
  "shop-awning": dynamic(() => import("@/components/three/scenes/ShopAwningScene")),
  "house-diorama": dynamic(() => import("@/components/three/scenes/HouseDioramaScene")),
};
