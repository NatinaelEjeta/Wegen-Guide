"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "pending" | "approved" | "rejected";

interface Suggestion {
  id: string;
  name: string;
  providerType: string;
  serviceIds: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  landmark?: string | null;
  phone?: string | null;
  workingHours?: string | null;
  note?: string | null;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  status: Status;
  createdAt: string;
}

interface Response {
  suggestions: Suggestion[];
  stats: { pending: number; approved: number; rejected: number };
}

const TABS: Status[] = ["pending", "approved", "rejected"];

export function OfficeSuggestionsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Status>("pending");

  const query = useQuery<Response>({
    queryKey: ["admin-office-suggestions", tab],
    queryFn: async () => {
      const res = await fetch(`/api/admin/office-suggestions?status=${tab}`);
      if (!res.ok) throw new Error("request failed");
      return (await res.json()) as Response;
    },
  });

  const moderate = useMutation({
    mutationFn: async (vars: { id: string; status: Status }) => {
      const res = await fetch("/api/admin/office-suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (!res.ok) throw new Error("request failed");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-office-suggestions"] });
    },
    onError: () => toast({ description: "Could not update the suggestion." }),
  });

  const stats = query.data?.stats;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold">Office suggestions</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Review suggestions sent by users. Approving marks the row only; add the office to
          providers.json to show it in the app.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={tab === s ? "default" : "outline"}
            onClick={() => setTab(s)}
          >
            {s}
            {stats ? ` (${stats[s]})` : ""}
          </Button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? (
        <Card className="gap-0 p-3">
          <p className="text-xs text-muted-foreground">Could not load suggestions.</p>
        </Card>
      ) : null}
      {query.data && query.data.suggestions.length === 0 ? (
        <Card className="gap-0 p-3">
          <p className="text-xs text-muted-foreground">Nothing here.</p>
        </Card>
      ) : null}

      {query.data?.suggestions.map((s) => (
        <Card key={s.id} className="gap-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {s.providerType}
            </Badge>
          </div>

          <div className="mt-2 space-y-0.5 text-xs">
            {s.address ? <p>Address: {s.address}</p> : null}
            {s.landmark ? <p>Landmark: {s.landmark}</p> : null}
            {s.phone ? <p>Phone: {s.phone}</p> : null}
            {s.workingHours ? <p>Hours: {s.workingHours}</p> : null}
            {s.serviceIds ? <p>Services: {s.serviceIds}</p> : null}
            {s.region ? <p>Area: {[s.woreda, s.zone, s.region].filter(Boolean).join(", ")}</p> : null}
            {s.note ? <p>Note: {s.note}</p> : null}
            <p className="text-muted-foreground">
              {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={13} aria-hidden /> Map
              </a>
            </Button>
            {s.status !== "approved" ? (
              <Button
                size="sm"
                disabled={moderate.isPending}
                onClick={() => moderate.mutate({ id: s.id, status: "approved" })}
              >
                <Check size={13} aria-hidden /> Approve
              </Button>
            ) : null}
            {s.status !== "rejected" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={moderate.isPending}
                onClick={() => moderate.mutate({ id: s.id, status: "rejected" })}
              >
                <X size={13} aria-hidden /> Reject
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}