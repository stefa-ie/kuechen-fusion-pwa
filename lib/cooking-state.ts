"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StepMode } from "@/components/recipe/PreparationPanel";

interface PerRecipe {
  servings: number | null;
  checked: number[];
  step: number;
}

interface CookingState {
  stepMode: StepMode;
  recipes: Record<string, PerRecipe>;
  setStepMode: (m: StepMode) => void;
  setServings: (id: string, n: number) => void;
  toggleChecked: (id: string, index: number) => void;
  setStep: (id: string, step: number) => void;
}

const EMPTY: PerRecipe = { servings: null, checked: [], step: 0 };

export const useCooking = create<CookingState>()(
  persist(
    (set) => ({
      stepMode: "full",
      recipes: {},
      setStepMode: (stepMode) => set({ stepMode }),
      setServings: (id, servings) =>
        set((s) => ({ recipes: { ...s.recipes, [id]: { ...(s.recipes[id] ?? EMPTY), servings } } })),
      toggleChecked: (id, index) =>
        set((s) => {
          const current = s.recipes[id] ?? EMPTY;
          const checked = current.checked.includes(index)
            ? current.checked.filter((i) => i !== index)
            : [...current.checked, index];
          return { recipes: { ...s.recipes, [id]: { ...current, checked } } };
        }),
      setStep: (id, step) => set((s) => ({ recipes: { ...s.recipes, [id]: { ...(s.recipes[id] ?? EMPTY), step } } })),
    }),
    { name: "kf-cooking", storage: createJSONStorage(() => sessionStorage) },
  ),
);

export function useRecipeCooking(id: string, baseServings: number | null) {
  const entry = useCooking((s) => s.recipes[id]) ?? EMPTY;
  return {
    servings: entry.servings ?? baseServings ?? 0,
    checked: new Set(entry.checked),
    step: entry.step,
  };
}
