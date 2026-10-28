"use client";

import { Camera, ExternalLink, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/misc";
import { fileToDataUrl } from "@/lib/image";
import { parseIngredientLine } from "@/lib/ingredients";
import { hostOf } from "@/lib/recipe-utils";
import { buildStep } from "@/lib/steps";
import { toast } from "@/lib/toast";
import type { RecipeDraft, RecipeTimes } from "@/lib/types";
import { RecipeImage } from "./RecipeImage";

const TIME_KEYS: (keyof RecipeTimes)[] = ["total", "prep", "cook", "bake", "rest"];

const inputClass = "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[16px] outline-none focus:border-ink";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="kicker mb-1.5 block text-[12px] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

function SourceLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg bg-wash px-3 py-2.5 text-[14px]"
    >
      <span className="text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{hostOf(url) ?? url}</span>
      <ExternalLink className="size-4 shrink-0" />
    </a>
  );
}

// Unchanged lines keep their parsed data, including LLM bullets and timers.
export function RecipeEditor({ draft, onChange }: { draft: RecipeDraft; onChange: (d: RecipeDraft) => void }) {
  const t = useTranslations("editor");
  const tt = useTranslations("times");
  const fileRef = useRef<HTMLInputElement>(null);
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

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("imageUrl", await fileToDataUrl(file));
    } catch {
      toast(t("imageError"));
    }
  };

  const embedded = draft.imageUrl?.startsWith("data:");

  return (
    <div className="space-y-5 px-4">
      <div className="relative">
        <button type="button" onClick={() => fileRef.current?.click()} className="block w-full overflow-hidden rounded-lg">
          <RecipeImage src={draft.imageUrl} alt="" className="aspect-[4/3] w-full" />
          <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-ink/80 px-3.5 py-2 text-[14px] font-medium text-paper">
            <Camera className="size-4" />
            {draft.imageUrl ? t("changePhoto") : t("uploadPhoto")}
          </span>
        </button>
        {draft.imageUrl && (
          <button
            type="button"
            aria-label={t("removePhoto")}
            onClick={() => set("imageUrl", null)}
            className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-ink/80 text-paper"
          >
            <Trash2 className="size-4" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <Field label={t("image")}>
        <input
          className={inputClass}
          value={embedded ? t("embeddedImage") : (draft.imageUrl ?? "")}
          readOnly={embedded}
          placeholder="https://"
          onChange={(e) => set("imageUrl", e.target.value || null)}
        />
      </Field>
      <Field label={t("title")}>
        <input className={`${inputClass} font-serif text-[22px]`} value={draft.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label={t("author")}>
        <input className={inputClass} value={draft.author ?? ""} onChange={(e) => set("author", e.target.value || null)} />
      </Field>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Field label={t("servings")}>
          <input
            className={inputClass}
            inputMode="decimal"
            value={draft.servings ?? ""}
            onChange={(e) => set("servings", e.target.value ? parseFloat(e.target.value.replace(",", ".")) || null : null)}
          />
        </Field>
        <Field label={t("servingsLabel")}>
          <input
            className={inputClass}
            value={draft.servingsLabel ?? ""}
            placeholder={t("servingsLabelPlaceholder")}
            onChange={(e) => set("servingsLabel", e.target.value || null)}
          />
        </Field>
      </div>
      <div className="space-y-2">
        <Field label={t("source")}>
          <input
            className={inputClass}
            inputMode="url"
            placeholder="https://"
            value={draft.sourceUrl ?? ""}
            onChange={(e) => set("sourceUrl", e.target.value.trim() || null)}
          />
        </Field>
        {hostOf(draft.sourceUrl) && <SourceLink label={t("original")} url={draft.sourceUrl!} />}
        {draft.linkedUrl && <SourceLink label={t("linkedRecipe")} url={draft.linkedUrl} />}
      </div>
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
      <Field label={t("ingredients")} hint={t("ingredientsHint")}>
        <textarea
          className={`${inputClass} min-h-56 font-mono text-[14px] leading-relaxed`}
          value={ingredientsText}
          onChange={(e) => applyIngredients(e.target.value)}
        />
      </Field>
      <Field label={t("steps")} hint={t("stepsHint")}>
        <textarea
          className={`${inputClass} min-h-72 text-[15px] leading-relaxed`}
          value={stepsText}
          onChange={(e) => applySteps(e.target.value)}
        />
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

export function EditorSaveBar({
  saving,
  disabled,
  label,
  cancelLabel,
  onCancel,
  onSave,
}: {
  saving: boolean;
  disabled?: boolean;
  label: string;
  cancelLabel: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper">
      <div className="mx-auto flex max-w-xl gap-3 px-4 py-3">
        <Button className="flex-1" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="solid" className="flex-[2]" disabled={saving || disabled} onClick={onSave}>
          {saving ? <Spinner className="size-4 border-paper/30 border-t-paper" /> : label}
        </Button>
      </div>
    </div>
  );
}
