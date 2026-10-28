"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TimerKind } from "../types";

export interface KitchenTimer {
  id: string;
  label: string;
  detail: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  imageUrl: string | null;
  stepIndex: number | null;
  kind: TimerKind | null;
  durationMs: number;
  originalMs: number;
  endsAt: number | null;
  remainingMs: number;
  status: "running" | "paused" | "done";
  createdAt: number;
  finishedAt: number | null;
}

export type NewTimer = Pick<KitchenTimer, "label"> &
  Partial<Pick<KitchenTimer, "detail" | "recipeId" | "recipeTitle" | "imageUrl" | "stepIndex" | "kind">> & {
    durationMs: number;
  };

interface TimerState {
  timers: KitchenTimer[];
  openId: string | null;
  add: (timer: NewTimer) => string;
  pause: (id: string) => void;
  resume: (id: string) => void;
  adjust: (id: string, deltaMs: number) => void;
  snooze: (id: string, ms: number) => void;
  repeat: (id: string) => void;
  markDone: (id: string) => void;
  remove: (id: string) => void;
  clearDone: () => void;
  open: (id: string | null) => void;
}

export function remainingOf(timer: KitchenTimer, now: number): number {
  if (timer.status === "running" && timer.endsAt) return Math.max(0, timer.endsAt - now);
  if (timer.status === "done") return 0;
  return timer.remainingMs;
}

const update = (timers: KitchenTimer[], id: string, fn: (t: KitchenTimer) => KitchenTimer) =>
  timers.map((t) => (t.id === id ? fn(t) : t));

export const useTimers = create<TimerState>()(
  persist(
    (set) => ({
      timers: [],
      openId: null,
      add: (input) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const timer: KitchenTimer = {
          id,
          label: input.label,
          detail: input.detail ?? null,
          recipeId: input.recipeId ?? null,
          recipeTitle: input.recipeTitle ?? null,
          imageUrl: input.imageUrl ?? null,
          stepIndex: input.stepIndex ?? null,
          kind: input.kind ?? null,
          durationMs: input.durationMs,
          originalMs: input.durationMs,
          endsAt: now + input.durationMs,
          remainingMs: input.durationMs,
          status: "running",
          createdAt: now,
          finishedAt: null,
        };
        set((s) => ({ timers: [...s.timers, timer] }));
        return id;
      },
      pause: (id) =>
        set((s) => ({
          timers: update(s.timers, id, (t) =>
            t.status === "running"
              ? { ...t, status: "paused", remainingMs: remainingOf(t, Date.now()), endsAt: null }
              : t,
          ),
        })),
      resume: (id) =>
        set((s) => ({
          timers: update(s.timers, id, (t) =>
            t.status === "paused" ? { ...t, status: "running", endsAt: Date.now() + t.remainingMs } : t,
          ),
        })),
      adjust: (id, deltaMs) =>
        set((s) => ({
          timers: update(s.timers, id, (t) => {
            if (t.status === "running" && t.endsAt) {
              const endsAt = Math.max(Date.now() + 1000, t.endsAt + deltaMs);
              return { ...t, endsAt, durationMs: Math.max(1000, t.durationMs + deltaMs) };
            }
            if (t.status === "paused") {
              return {
                ...t,
                remainingMs: Math.max(1000, t.remainingMs + deltaMs),
                durationMs: Math.max(1000, t.durationMs + deltaMs),
              };
            }
            return t;
          }),
        })),
      snooze: (id, ms) =>
        set((s) => ({
          timers: update(s.timers, id, (t) => ({
            ...t,
            status: "running",
            durationMs: ms,
            endsAt: Date.now() + ms,
            remainingMs: ms,
            finishedAt: null,
          })),
        })),
      repeat: (id) =>
        set((s) => ({
          timers: update(s.timers, id, (t) => ({
            ...t,
            status: "running",
            durationMs: t.originalMs,
            endsAt: Date.now() + t.originalMs,
            remainingMs: t.originalMs,
            finishedAt: null,
          })),
        })),
      markDone: (id) =>
        set((s) => ({
          timers: update(s.timers, id, (t) => ({ ...t, status: "done", endsAt: null, remainingMs: 0, finishedAt: Date.now() })),
        })),
      remove: (id) => set((s) => ({ timers: s.timers.filter((t) => t.id !== id), openId: s.openId === id ? null : s.openId })),
      clearDone: () => set((s) => ({ timers: s.timers.filter((t) => t.status !== "done") })),
      open: (id) => set({ openId: id }),
    }),
    {
      name: "kf-timers",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ timers: s.timers }),
    },
  ),
);
