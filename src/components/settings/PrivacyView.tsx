"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export function PrivacyView() {
  const { t } = useI18n();
  const paragraphs = ["privacy.p1", "privacy.p2", "privacy.p3", "privacy.p4", "privacy.p5", "privacy.p6"];

  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-4">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
        <ShieldCheck className="text-primary" aria-hidden />
        {t("privacy.title")}
      </h1>
      <p className="mb-4 text-xs text-muted-foreground">
        {t("privacy.updated")}: 2025-06-01
      </p>
      <Card>
        <CardContent className="grid gap-3 p-4">
          {paragraphs.map((key) => (
            <p key={key} className="text-sm leading-relaxed">
              {t(key)}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
