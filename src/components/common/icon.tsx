"use client";

import React from "react";
import {
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Car,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileText,
  Fingerprint,
  GraduationCap,
  Hash,
  HeartPulse,
  Home,
  Layers,
  Lightbulb,
  MapPin,
  Monitor,
  PenLine,
  Plane,
  Ruler,
  Scale,
  Stamp,
  Store,
  UserCheck,
  Users,
  Wheat,
  LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Car,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileText,
  Fingerprint,
  GraduationCap,
  Hash,
  HeartPulse,
  Home,
  Layers,
  Lightbulb,
  MapPin,
  Monitor,
  PenLine,
  Plane,
  Ruler,
  Scale,
  Stamp,
  Store,
  UserCheck,
  Users,
  Wheat,
};

/** Renders a lucide icon by (data-driven) name with a safe default. */
export function IconByName({
  name,
  size = 20,
  className,
  strokeWidth,
}: {
  name?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = (name && ICONS[name]) || FileText;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
