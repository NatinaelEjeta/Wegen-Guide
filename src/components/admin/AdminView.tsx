"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileCog, RefreshCw, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { getServices, getProviders } from "@/lib/data";
import type { CommunityTip } from "@/lib/types";
import { OfficeSuggestionsAdmin } from "@/components/admin/OfficeSuggestionsAdmin";

interface AdminTipsResponse {
  tips: CommunityTip[];
  stats: { pending: number; published: number; rejected: number };
}

/** Simple content-admin view: stats + community tip moderation queue. */
export function AdminView() {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const services = getServices();
  const providers = getProviders();
  const readyCount = services.filter((s) => s.contentStatus === "ready").length;

  const query = useQuery<AdminTipsResponse>({
    queryKey: ["admin-tips", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tips?status=${statusFilter}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/admin/tips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        description:
          vars.status === "published" ? t("admin.published") : t("admin.rejected"),
      });
      qc.invalidateQueries({ queryKey: ["admin-tips"] });
      qc.invalidateQueries({ queryKey: ["tips"] });
    },
    onError: () => toast({ description: t("common.error") }),
  });

  const statsCards = [
    { label: t("admin.services"), value: services.length },
    { label: t("admin.servicesReady"), value: readyCount },
    { label: t("admin.servicesPending"), value: services.length - readyCount },
    { label: t("admin.providers"), value: providers.length },
    { label: t("admin.pendingTips"), value: query.data?.stats.pending ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-4">
      <h1 className="mb-1 text-xl font-bold">{t("admin.title")}</h1>
      <p className="mb-4 text-xs leading-snug text-muted-foreground">{t("admin.desc")}</p>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {statsCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <p className="text-2xl font-extrabold leading-none">{c.value}</p>
              <p className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground">
                {c.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Moderation queue */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{t("admin.tipsQueue")}</h2>
        <div className="flex items-center gap-1.5">
          {["pending", "published", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s === "pending" ? t("admin.pendingTips") : s === "published" ? t("admin.published") : t("admin.rejected")}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => query.refetch()}
            aria-label={t("admin.refresh")}
          >
            <RefreshCw size={14} className={query.isFetching ? "animate-spin" : ""} aria-hidden />
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : !query.data?.tips.length ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("admin.noPending")}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-2">
          {query.data.tips.map((tip) => (
            <li key={tip.id}>
              <Card>
                <CardContent className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {tip.targetType === "service" ? t("nav.home") : t("office.title")}: {tip.targetId}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {tip.language}
                    </Badge>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(tip.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm leading-snug">{tip.text}</p>
                  {tip.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 gap-1 rounded-full"
                        disabled={moderate.isPending}
                        onClick={() => moderate.mutate({ id: tip.id, status: "published" })}
                      >
                        <Check size={14} aria-hidden />
                        {t("admin.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 rounded-full text-destructive"
                        disabled={moderate.isPending}
                        onClick={() => moderate.mutate({ id: tip.id, status: "rejected" })}
                      >
                        <X size={14} aria-hidden />
                        {t("admin.reject")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <OfficeSuggestionsAdmin />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-muted/60 p-3 text-[12px] leading-snug text-muted-foreground">
        <FileCog size={15} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          {t("admin.howToEdit")} {t("admin.moderationNote")}
        </p>
      </div>
    </div>
  );
}
