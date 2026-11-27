"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LANG_SPEECH, type Lang } from "@/lib/types";

/**
 * Voice reading via the Web Speech API.
 * - Splits long text into chunks so browsers don't cut it off.
 * - Picks the best available voice for the selected language
 *   (am/om often unsupported -> graceful fallback).
 */
export function useSpeech() {
  const { lang } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const pickVoice = useCallback((lang: Lang): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices.length) return null;
    const tag = LANG_SPEECH[lang];
    const byExact = voices.find((v) => v.lang.replace("_", "-") === tag);
    if (byExact) return byExact;
    const byPrefix = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (byPrefix) return byPrefix;
    // am/om are rarely installed — try a close relative, else any voice
    const relatives = ["ti", "sw", "ar", "fr"];
    for (const rel of relatives) {
      const v = voices.find((v) => v.lang.toLowerCase().startsWith(rel));
      if (v) return v;
    }
    return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? null;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const clean = text.replace(/\s+/g, " ").trim();
      if (!clean) return;

      // chunk by sentence, max ~180 chars per utterance
      const chunks: string[] = [];
      let buf = "";
      for (const sentence of clean.split(/(?<=[.!?።፡\n])\s+/)) {
        if ((buf + " " + sentence).length > 180 && buf) {
          chunks.push(buf.trim());
          buf = sentence;
        } else {
          buf += " " + sentence;
        }
      }
      if (buf.trim()) chunks.push(buf.trim());

      const voice = pickVoice(lang);
      setSpeaking(true);

      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = LANG_SPEECH[lang];
        if (voice) u.voice = voice;
        u.rate = 0.92;
        u.pitch = 1;
        if (i === chunks.length - 1) {
          u.onend = () => setSpeaking(false);
          u.onerror = () => setSpeaking(false);
        }
        window.speechSynthesis.speak(u);
      });
    },
    [lang, pickVoice]
  );

  return { speak, stop, speaking, supported };
}
