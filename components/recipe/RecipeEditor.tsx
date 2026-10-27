"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { parseIngredientLine } from "@/lib/ingredients";
import { buildStep } from "@/lib/steps";
import type { RecipeDraft, RecipeTimes } from "@/lib/types";
import { RecipeImage } from "./RecipeImage";

const TIME_KEYS: (keyof RecipeTimes)[] = ["total", "prep", "cook", "bake", "rest"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="kicker mb-1.5 block text-[12px] text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[16px] outline-none focus:border-ink";

/**
 * Edits a draft as plain text: one ingredient per line, steps separated by blank lines.
 * Unchanged lines keep their parsed data (including LLM bullets and timers).
 */
export function RecipeEditor({ draft, onChange }: { draft: RecipeDraft; onChange: (d: RecipeDraft) => void }) {
  const t = useTranslations("editor");
  const tt = useTranslations("times");
  const [ingredientsText, setIngredientsText] = useState(() =>
    draft.ingredients.map((i) => (i.group ? `[${i.group}] ${i.raw}` : i.raw)).join("\n"),
  );
  const [stepsText, setStepsText] = useState(() => draft.steps.map((s) => s.text).join("\n\n"));

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => onChange({ ...draft, [key]: value });

  const applyIngredients = (value: string) => {
    setIngredientsText(value);
    const existing = new Map(draft.ingredients.map((i) => [i.raw, i]));
    const ingredients = value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const group = line.match(/^\[([^\]]+)\]\s*/);
        const text = group ? line.slice(group[0].length) : line;
        const prev = existing.get(text);
        return prev ? { ...prev, group: group?.[1] ?? null } : parseIngredientLine(text, group?.[1] ?? null);
      });
    onChange({ ...draft, ingredients });
  };

  const applySteps = (value: string) => {
    setStepsText(value);
    const existing = new Map(draft.steps.map((s) => [s.text, s]));
    const steps = value
      .split(/\n\s*\n/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map((text) => existing.get(text) ?? buildStep(text));
    onChange({ ...draft, steps });
  };

  return (
    <div className="space-y-5 px-4">
      <RecipeImage src={draft.imageUrl} alt="" className="aspect-[4/3] w-full rounded-lg" />
      <Field label={t("title")}>
        <input className={`${inputClass} font-serif text-[22px]`} value={draft.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("author")}>
          <input className={inputClass} value={draft.author ?? ""} onChange={(e) => set("author", e.target.value || null)} />
        </Field>
        <Field label={t("servings")}>
          <input
            className={inputClass}
            inputMode="decimal"
            value={draft.servings ?? ""}
            onChange={(e) => set("servings", e.target.value ? parseFloat(e.target.value.replace(",", ".")) || null : null)}
          />
        </Field>
      </div>
      <Field label={t("image")}>
        <input
          className={inputClass}
          value={draft.imageUrl?.startsWith("data:") ? t("embeddedImage") : (draft.imageUrl ?? "")}
          readOnly={draft.imageUrl?.startsWith("data:")}
          onChange={(e) => set("imageUrl", e.target.value || null)}
        />
      </Field>
      <Field label={t("description")}>
        <textarea
          className={`${inputClass} min-h-20`}
          value={draft.description ?? ""}
          onChange={(e) => set("description", e.target.value || null)}
        />
      </Field>
      <div>
        <span className="kicker mb-1.5 block text-[12px] text-muted">{t("timesMinutes")}</span>
        <div className="grid grid-cols-5 gap-2">
          {TIME_KEYS.map((key) => (
            <label key={key} className="text-center">
              <input
                className={`${inputClass} px-1 text-center`}
                inputMode="numeric"
                value={draft.times[key] ?? ""}
                onChange={(e) =>
                  set("times", { ...draft.times, [key]: e.target.value ? parseInt(e.target.value, 10) || null : null })
                }
              />
              <span className="mt-1 block text-[11px] text-muted">{tt(key)}</span>
            </label>
          ))}
        </div>
      </div>
      <Field label={t("ingredients")}>
        <textarea
          className={`${inputClass} min-h-56 font-mono text-[14px] leading-relaxed`}
          value={ingredientsText}
          onChange={(e) => applyIngredients(e.target.value)}
        />
        <span className="mt-1 block text-[12px] text-muted">{t("ingredientsHint")}</span>
      </Field>
      <Field label={t("steps")}>
        <textarea
          className={`${inputClass} min-h-72 text-[15px] leading-relaxed`}
          value={stepsText}
          onChange={(e) => applySteps(e.target.value)}
        />
        <span className="mt-1 block text-[12px] text-muted">{t("stepsHint")}</span>
      </Field>
      <Field label={t("tags")}>
        <input
          className={inputClass}
          value={draft.tags.join(", ")}
          onChange={(e) =>
            set(
              "tags",
              e.target.value
                .split(",")
                .map((x) => x.trim().toLowerCase())
                .filter(Boolean),
            )
          }
        />
      </Field>
    </div>
  );
}
