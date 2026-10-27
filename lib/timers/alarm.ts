"use client";

let ctx: AudioContext | null = null;

/** Browsers only allow audio after a user gesture; call this from any tap. */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  ctx ??= new AudioCtor();
  if (ctx.state === "suspended") void ctx.resume();
}

function beep(at: number, frequency: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.3);
}

/** A short three-tone kitchen chime. */
export function playChime() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  beep(t, 880);
  beep(t + 0.32, 1175);
  beep(t + 0.64, 1568);
}

export function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([300, 120, 300, 120, 500]);
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // Safari < 16 throws when not triggered by a gesture.
    }
  }
  return Notification.permission;
}

export async function notify(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        requireInteraction: true,
        data: { url: "/timers" },
      } as NotificationOptions);
      return;
    }
    new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    // Notifications are best effort.
  }
}
