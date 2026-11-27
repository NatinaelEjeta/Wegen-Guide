"use client";

import React from "react";
import { Check, Phone } from "lucide-react";
import type { ObjectType } from "@/lib/types";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "wg-obj wg-obj--sm",
  md: "wg-obj wg-obj--md",
  lg: "wg-obj wg-obj--lg",
};

interface ObjectFallbackProps {
  objectType: ObjectType;
  size?: Size;
  className?: string;
  /** render slightly desaturated (used behind 3D while loading) */
  muted?: boolean;
  label?: string;
}

/**
 * Lightweight CSS-only animated object used as the low-end /
 * reduced-motion fallback for every 3D scene, and as the mini
 * illustration in cards. No WebGL, no heavy assets.
 */
export function ObjectFallback({
  objectType,
  size = "md",
  className,
  muted,
  label,
}: ObjectFallbackProps) {
  return (
    <div
      role="img"
      aria-label={label ?? "Animated illustration"}
      className={`${SIZE_CLASS[size]} ${muted ? "wg-obj--muted" : ""} ${className ?? ""}`}
    >
      {renderVariant(objectType)}
    </div>
  );
}

function renderVariant(type: ObjectType): React.ReactNode {
  switch (type) {
    case "holographic-card":
      return (
        <div className="wg-float">
          <div className="wg-card wg-card--holo">
            <span className="wg-holo-sweep" />
            <span className="wg-card-chip" />
            <span className="wg-card-lines"><i /><i /></span>
          </div>
        </div>
      );
    case "skyline-card":
      return (
        <div className="wg-float">
          <div className="wg-card wg-card--plain">
            <div className="wg-skyline">
              <i /><i /><i /><i /><i />
            </div>
            <span className="wg-skyline-sun" />
          </div>
        </div>
      );
    case "passport-booklet":
      return (
        <div className="wg-float">
          <div className="wg-book">
            <span className="wg-book-cover" />
            <span className="wg-book-page" />
            <span className="wg-book-stamp" />
          </div>
        </div>
      );
    case "paper-scroll":
      return (
        <div className="wg-float">
          <div className="wg-scroll">
            <span className="wg-scroll-sheet" />
            <span className="wg-scroll-seal" />
          </div>
        </div>
      );
    case "ribbon-rings":
      return (
        <div className="wg-float">
          <div className="wg-cert">
            <span className="wg-ring wg-ring--a" />
            <span className="wg-ring wg-ring--b" />
            <span className="wg-cert-ribbon" />
          </div>
        </div>
      );
    case "neon-road-card":
      return (
        <div className="wg-float">
          <div className="wg-road">
            <span className="wg-road-line" />
            <span className="wg-road-card" />
            <span className="wg-road-trail" />
          </div>
        </div>
      );
    case "shop-awning":
      return (
        <div className="wg-float">
          <div className="wg-shop">
            <span className="wg-shop-awning" />
            <span className="wg-shop-sign" />
            <span className="wg-shop-door" />
          </div>
        </div>
      );
    case "house-diorama":
      return (
        <div className="wg-float">
          <div className="wg-plot">
            <span className="wg-house">
              <i className="wg-house-roof" />
            </span>
            <i className="wg-pin wg-pin--1" />
            <i className="wg-pin wg-pin--2" />
            <i className="wg-pin wg-pin--3" />
            <i className="wg-pin wg-pin--4" />
          </div>
        </div>
      );
    default:
      return (
        <div className="wg-float">
          <div className="wg-generic">
            <span className="wg-generic-lines"><i /><i /><i /></span>
            <span className="wg-generic-check"><Check size={12} strokeWidth={3} /></span>
          </div>
        </div>
      );
  }
}

/** Small helper used by office cards (keeps imports tidy elsewhere). */
export function PhoneGlyph() {
  return <Phone size={16} aria-hidden />;
}
