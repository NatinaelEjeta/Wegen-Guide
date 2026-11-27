"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Clock,
  FileText,
  Globe,
  ListOrdered,
  MapPin,
  MessageSquare,
  Square,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { getProvidersForService, getService } from "@/lib/data";
import { buildServiceText } from "@/lib/voice";
import { useSpeech } from "@/lib/hooks/useSpeech";
import { ServiceObject3D } from "@/components/three/ServiceObject3D";
import { Disclaimer } from "@/components/common/OfflineBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTab } from "./DocumentsTab";
import { FeesTab } from "./FeesTab";
import { MistakesTab } from "./MistakesTab";
import { OfficeTab } from "./OfficeTab";
import { StepsTab } from "./StepsTab";
import { TipsTab } from "./TipsTab";
import type { ServiceTabId } from "@/lib/types";

const TAB_ITEMS: { id: ServiceTabId; labelKey: string; Icon: LucideIcon }[] = [
  { id: "documents", labelKey: "service.tab.documents", Icon: FileText },
  { id: "steps", labelKey: "service.tab.steps", Icon: ListOrdered },
  { id: "fees", labelKey: "service.tab.fees", Icon: Banknote },
  { id: "office", labelKey: "service.tab.office", Icon: MapPin },
  { id: "mistakes", labelKey: "service.tab.mistakes", Icon: AlertTriangle },
  { id: "tips", labelKey: "service.tab.tips", Icon: MessageSquare },
];

/**
 * Service detail screen: hero 3D object, info notes, six tabs
 * (documents / steps / fees / office / mistakes / tips), a voice
 * read-aloud FAB and the standing accuracy disclaimer.
 */
function ServiceView({
  serviceId,
  initialTab,
}: {
  serviceId: string;
  initialTab?: ServiceTabId;
}) {
  const { t, pick, lang } = useI18n();
  const back = useAppStore((s) => s.back);
  const [activeTab, setActiveTab] = useState<ServiceTabId>(initialTab ?? "documents");
  const [bumpKey, setBumpKey] = useState(0);
  const { speak, stop, speaking, supported } = useSpeech();

  const service = getService(serviceId);
  const providers = useMemo(() => getProvidersForService(serviceId), [serviceId]);
  const voiceText = useMemo(
    () => (service ? buildServiceText(service, lang, activeTab, providers) : ""),
    [service, lang, activeTab, providers]
  );

  // Stop reading when the user switches tabs (content changed)
  useEffect(() => {
    stop();
  }, [activeTab, stop]);

  const bump = useCallback(() => setBumpKey((k) => k + 1), []);

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as ServiceTabId;
      setActiveTab(tab);
      // Replace (not push) the stack top so hardware/browser back
      // returns to the screen the user came from.
      useAppStore.getState().replaceTop({ name: "service", serviceId, tab });
    },
    [serviceId]
  );

  const goToOfficeTab = useCallback(() => {
    setActiveTab("office");
    useAppStore.getState().replaceTop({ name: "service", serviceId, tab: "office" });
  }, [serviceId]);

  if (!service) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-24 pt-4">
        <Card className="gap-0 p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("home.noResults")}</p>
          <Button variant="outline" size="sm" className="mx-auto mt-4" onClick={back}>
            <ArrowLeft className="size-3.5" aria-hidden />
            {t("nav.back")}
          </Button>
        </Card>
      </div>
    );
  }

  const toggleVoice = () => {
    if (speaking) stop();
    else speak(voiceText);
  };

  return (
    <div>
      <div className="mx-auto max-w-xl px-4 pb-24 pt-4">
        {/* hero */}
        <Card className="gap-0 overflow-hidden rounded-3xl py-0">
          <div className="bg-gradient-to-br from-primary/12 via-transparent to-[#f7c600]/15 px-2 py-3">
            <ServiceObject3D
              key={bumpKey}
              objectType={service.objectType}
              size="lg"
              onActivate={bump}
              label={pick(service.name)}
            />
          </div>

          <div className="p-4">
            <h1 className="text-lg font-bold leading-snug">{pick(service.name)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {pick(service.shortDescription)}
            </p>

            {/* info notes */}
            <div className="mt-3 space-y-2">
              {service.usesFayda ? (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <BadgeCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <div className="flex-1 space-y-1.5">
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-[10px] text-amber-800 dark:border-amber-700 dark:text-amber-200"
                    >
                      {t("service.faydaBadge")}
                    </Badge>
                    <p className="leading-snug">{t("service.faydaNote")}</p>
                  </div>
                </div>
              ) : null}

              {service.canBeDoneOnline ? (
                <div className="flex items-start gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-xs text-primary dark:border-primary/30 dark:bg-primary/15">
                  <Globe size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <div className="flex-1 space-y-1.5">
                    <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                      {t("service.onlineBadge")}
                    </Badge>
                    <p className="leading-snug">{t("service.onlineNote")}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={13} className="shrink-0" aria-hidden />
                <span>{t("service.estimatedTime")}</span>
                <span className="font-semibold text-foreground">
                  {pick(service.estimatedTime)}
                </span>
              </div>

              {service.contentStatus === "pending" ? (
                <div className="rounded-2xl border border-amber-300/70 bg-accent p-3 text-xs text-accent-foreground dark:border-amber-800">
                  <p className="font-bold">{t("service.contentPending")}</p>
                  <p className="mt-0.5 leading-snug">{t("service.contentPendingMsg")}</p>
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        {/* tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
          <div className="wg-scroll-x">
            <TabsList className="bg-muted h-11">
              {TAB_ITEMS.map(({ id, labelKey, Icon }) => (
                <TabsTrigger key={id} value={id} className="rounded-full px-3">
                  <Icon className="size-3.5" aria-hidden />
                  <span className="text-xs">{t(labelKey)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="documents" className="mt-3">
            <DocumentsTab service={service} onFindOffice={goToOfficeTab} />
          </TabsContent>
          <TabsContent value="steps" className="mt-3">
            <StepsTab service={service} />
          </TabsContent>
          <TabsContent value="fees" className="mt-3">
            <FeesTab service={service} />
          </TabsContent>
          <TabsContent value="office" className="mt-3">
            <OfficeTab serviceId={serviceId} />
          </TabsContent>
          <TabsContent value="mistakes" className="mt-3">
            <MistakesTab service={service} />
          </TabsContent>
          <TabsContent value="tips" className="mt-3">
            <TipsTab serviceId={serviceId} />
          </TabsContent>
        </Tabs>

        <div className="mt-4">
          <Disclaimer lastVerified={service.lastVerified} />
        </div>
      </div>

      {/* voice read-aloud FAB */}
      {supported ? (
        <button
          type="button"
          onClick={toggleVoice}
          aria-label={speaking ? t("service.voiceStop") : t("service.voiceRead")}
          className={`fixed bottom-20 right-4 z-30 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 ${
            speaking ? "wg-voice-speaking" : ""
          }`}
        >
          {speaking ? (
            <Square className="size-5" fill="currentColor" aria-hidden />
          ) : (
            <Volume2 className="size-6" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}

export default ServiceView;
export { ServiceView };
