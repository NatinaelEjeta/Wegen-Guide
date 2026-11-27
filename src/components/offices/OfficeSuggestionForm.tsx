"use client";

import React, { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TEXT = {
  en: {
    open: "Suggest an office",
    title: "Suggest a missing office",
    hint: "Your suggestion is anonymous and is checked before it appears.",
    name: "Office name",
    address: "Address or landmark",
    phone: "Phone (optional)",
    hours: "Working hours (optional)",
    note: "Anything else we should know? (optional)",
    useLoc: "Use my current location",
    locOk: "Location added",
    locFail: "Could not get your location. Enter the coordinates by hand.",
    lat: "Latitude",
    lng: "Longitude",
    send: "Send suggestion",
    cancel: "Cancel",
    sent: "Thank you! Your suggestion will be checked before it is published.",
    error: "Could not send. Check the name and location and try again.",
  },
  am: {
    open: "ቢሮ ይጠቁሙ",
    title: "ያልተዘረዘረ ቢሮ ይጠቁሙ",
    hint: "ጥቆማዎ ስም-አልባ ነው፤ ከመታየቱ በፊት ይፈተሻል።",
    name: "የቢሮው ስም",
    address: "አድራሻ ወይም የአቅራቢያ ምልክት",
    phone: "ስልክ (አማራጭ)",
    hours: "የሥራ ሰዓት (አማራጭ)",
    note: "ሌላ ማወቅ ያለብን ነገር? (አማራጭ)",
    useLoc: "አሁን ያለሁበትን ቦታ ተጠቀም",
    locOk: "ቦታ ተጨምሯል",
    locFail: "ቦታዎን ማግኘት አልተቻለም። መጋጠሚያዎቹን በእጅ ያስገቡ።",
    lat: "ኬንትሮስ (Latitude)",
    lng: "ኬክሮስ (Longitude)",
    send: "ጥቆማ ላክ",
    cancel: "ተው",
    sent: "እናመሰግናለን! ጥቆማዎ ከመታተሙ በፊት ይፈተሻል።",
    error: "መላክ አልተቻለም። ስሙንና ቦታውን አረጋግጠው እንደገና ይሞክሩ።",
  },
  om: {
    open: "Waajjira yaada kenni",
    title: "Waajjira hin tarreeffamne yaada kenni",
    hint: "Yaadni kee maqaa malee dha; maxxanfamuu isaa dura ni sakatta'ama.",
    name: "Maqaa waajjiraa",
    address: "Teessoo ykn mallattoo naannoo",
    phone: "Bilbila (filannoo)",
    hours: "Sa'aatii hojii (filannoo)",
    note: "Waan biraa beekuu qabnu? (filannoo)",
    useLoc: "Iddoo ani jiru fayyadami",
    locOk: "Iddoon dabalameera",
    locFail: "Iddoo kee argachuu hin dandeenye. Kooriinaatii harkaan galchi.",
    lat: "Latitude",
    lng: "Longitude",
    send: "Yaada ergi",
    cancel: "Haqi",
    sent: "Galatoomaa! Yaadni kee maxxanfamuu dura ni sakatta'ama.",
    error: "Erguu hin dandeenye. Maqaa fi iddoo mirkaneessiitii irra deebi'i.",
  },
} as const;

interface Props {
  /** Optional: service ids this office is related to. */
  serviceIds?: string[];
}

export function OfficeSuggestionForm({ serviceIds = [] }: Props) {
  const { lang } = useI18n();
  const { toast } = useToast();
  const s = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const canSend =
    name.trim().length >= 2 &&
    lat.trim() !== "" &&
    lng.trim() !== "" &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    !busy;

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast({ description: s.locFail });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // one-time read, only after the person tapped the button
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        toast({ description: s.locOk });
      },
      () => toast({ description: s.locFail }),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/office-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nameAm: lang === "am" ? name.trim() : undefined,
          nameOm: lang === "om" ? name.trim() : undefined,
          address: address.trim(),
          phone: phone.trim(),
          workingHours: hours.trim(),
          note: note.trim(),
          latitude: latNum,
          longitude: lngNum,
          serviceIds,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      toast({ description: s.sent });
      setName("");
      setAddress("");
      setPhone("");
      setHours("");
      setNote("");
      setLat("");
      setLng("");
      setOpen(false);
    } catch {
      toast({ description: s.error });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} aria-hidden /> {s.open}
      </Button>
    );
  }

  return (
    <Card className="gap-0 p-4">
      <h3 className="text-sm font-bold">{s.title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>

      <div className="mt-3 space-y-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.name} maxLength={120} />
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={s.address} maxLength={200} />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={s.phone} maxLength={40} />
        <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder={s.hours} maxLength={120} />

        <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>
          <MapPin size={14} aria-hidden /> {s.useLoc}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder={s.lat} inputMode="decimal" />
          <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder={s.lng} inputMode="decimal" />
        </div>

        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={s.note}
          maxLength={400}
          className="resize-none text-sm"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {s.cancel}
        </Button>
        <Button size="sm" disabled={!canSend} onClick={() => void submit()}>
          {s.send}
        </Button>
      </div>
    </Card>
  );
}