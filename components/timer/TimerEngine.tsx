"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { notify, playChime, unlockAudio, vibrate } from "@/lib/timers/alarm";
import { useTimers } from "@/lib/timers/store";

const RING_FOR_MS = 60_000;

export function TimerEngine() {
  const t = useTranslations("timers");
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    const onGesture = () => unlockAudio();
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  useEffect(() => {
    let lastChime = 0;
    const tick = () => {
      const now = Date.now();
      const { timers, markDone, open, openId } = useTimers.getState();
      for (const timer of timers) {
        if (timer.status === "running" && timer.endsAt && timer.endsAt <= now) {
          markDone(timer.id);
          vibrate();
          void notify(tRef.current("doneTitle"), timer.label, timer.id);
          if (!openId) open(timer.id);
          lastChime = 0;
        }
      }
      const ringing = useTimers
        .getState()
        .timers.some((x) => x.status === "done" && x.finishedAt && now - x.finishedAt < RING_FOR_MS);
      if (ringing && now - lastChime > 2000) {
        playChime();
        lastChime = now;
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  return null;
}
