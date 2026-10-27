"use client";

import { useSyncExternalStore } from "react";

const KEY = "kf-recently-viewed";
const EVENT = "kf-recent-change";
const EMPTY: string[] = [];
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function read(): string[] {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) cache = { raw, ids: raw ? (JSON.parse(raw) as string[]) : EMPTY };
  return cache.ids;
}

export function markViewed(recipeId: string) {
  const ids = [recipeId, ...read().filter((id) => id !== recipeId)].slice(0, 40);
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
