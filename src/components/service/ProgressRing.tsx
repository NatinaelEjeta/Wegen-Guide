"use client";

import React from "react";

interface ProgressRingProps {
  checked: number;
  total: number;
}

const SIZE = 72;
const STROKE = 7;

/**
 * Small circular progress ring for the document checklist.
 * Animates stroke-dashoffset via CSS transition (respects
 * the global reduce-motion override automatically).
 */
export function ProgressRing({ checked, total }: ProgressRingProps) {
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, Math.max(0, checked / total)) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 0)}
        aria-valuenow={checked}
      >
        {/* track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />
        {/* value */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--et-green)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
        {checked}/{total}
      </span>
    </div>
  );
}
