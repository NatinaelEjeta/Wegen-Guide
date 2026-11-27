"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface TipItem {
  id: string;
  text: string;
  language: string;
  createdAt: string;
}

/**
 * Community tips for this service: recent published tips (read-only)
 * plus an anonymous submission form that posts to /api/tips.
 */
export function TipsTab({ serviceId }: { serviceId: string }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const tipsQuery = useQuery<TipItem[]>({
    queryKey: ["tips", serviceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/tips?targetType=service&targetId=${encodeURIComponent(serviceId)}`
      );
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { tips?: TipItem[] };
      return Array.isArray(data.tips) ? data.tips : [];
    },
  });

  const submitTip = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "service",
          targetId: serviceId,
          text,
          language: lang,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ description: t("tips.sent") });
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["tips", serviceId] });
    },
    onError: () => {
      toast({ description: t("tips.error") });
    },
  });

  const canSubmit = draft.trim().length >= 5 && !submitTip.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold">{t("tips.title")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("tips.hint")}</p>
      </div>

      {/* recent tips */}
      <section aria-label={t("tips.recent")}>
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("tips.recent")}
        </h3>
        <div className="mt-2 space-y-2">
          {tipsQuery.isLoading ? (
            <>
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </>
          ) : null}

          {tipsQuery.isError ? (
            <Card className="gap-0 p-3">
              <p className="text-xs text-muted-foreground">{t("tips.error")}</p>
            </Card>
          ) : null}

          {tipsQuery.data && tipsQuery.data.length === 0 ? (
            <Card className="gap-0 p-3">
              <p className="text-xs text-muted-foreground">{t("tips.empty")}</p>
            </Card>
          ) : null}

          {tipsQuery.data
            ? tipsQuery.data.map((tip) => (
                <Card key={tip.id} className="gap-0 p-3">
                  <p className="text-sm leading-snug">{tip.text}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(tip.createdAt).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="px-1 py-0 text-[9px] uppercase">
                      {tip.language}
                    </Badge>
                  </div>
                </Card>
              ))
            : null}
        </div>
      </section>

      {/* submit form */}
      <Card className="gap-0 p-4">
        <h3 className="text-sm font-bold">{t("tips.submitTitle")}</h3>
        <Textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("tips.submitPlaceholder")}
          maxLength={400}
          className="mt-2 resize-none text-sm"
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => submitTip.mutate(draft.trim())}
          >
            {t("tips.submit")}
          </Button>
        </div>
      </Card>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
        <span>{t("tips.moderationNote")}</span>
      </p>
    </div>
  );
}
