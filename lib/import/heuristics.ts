import { looksLikeIngredientLine, parseIngredientLine } from "../ingredients";
import { buildStep } from "../steps";
import type { RecipeDraft, RecipeTimes, Step } from "../types";
import type { RawRecipe } from "./types";

const INGREDIENT_HEAD = /^\s*(zutaten|ingredients?|you(?:'ll)? need|für den teig|für die soße)\b.*:?\s*$/i;
const METHOD_HEAD = /^\s*(zubereitung|anleitung|method|instructions?|directions?|preparation|so geht'?s|steps)\b.*:?\s*$/i;

export function parseServings(value: string | null): { servings: number | null; label: string | null } {
  if (!value) return { servings: null, label: null };
  const n = value.match(/\d+(?:[.,]\d+)?/);
  return { servings: n ? parseFloat(n[0].replace(",", ".")) : null, label: value.trim() };
}

export function cleanTitle(title: string | null, siteName: string | null): string {
  let t = (title ?? "").trim();
  if (siteName) t = t.replace(new RegExp(`\\s*[|–—-]\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "i"), "");
  t = t.replace(/\s*[|–—]\s*[^|–—]{2,40}$/, "").replace(/\s+(recipe|rezept)$/i, "");
  return t || "Rezept";
}

export function splitFreeText(text: string): { ingredients: string[]; steps: string[]; intro: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*·▪︎▫︎◦]\s*/, "").trim())
    .filter(Boolean);
  const ingredients: string[] = [];
  const steps: string[] = [];
  const intro: string[] = [];
  let mode: "intro" | "ingredients" | "steps" = "intro";
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (INGREDIENT_HEAD.test(line)) {
      mode = "ingredients";
      continue;
    }
    if (METHOD_HEAD.test(line)) {
      mode = "steps";
      continue;
    }
    const numberedStep = /^(\d+[.)]|step\s*\d+|schritt\s*\d+)\s*:?\s*/i;
    if (numberedStep.test(line) && line.length > 25) {
      mode = "steps";
      steps.push(line.replace(numberedStep, ""));
      continue;
    }
    if (mode === "ingredients" || (mode === "intro" && looksLikeIngredientLine(line))) {
      if (line.length > 120 && ingredients.length) {
        mode = "steps";
        steps.push(line);
      } else {
        mode = "ingredients";
        ingredients.push(line);
      }
    } else if (mode === "steps") {
      steps.push(line);
    } else {
      intro.push(line);
    }
  }
  return { ingredients, steps, intro };
}

export function deriveTimes(raw: Pick<RawRecipe, "prepTime" | "cookTime" | "totalTime">, steps: Step[]): RecipeTimes {
  const sum = (kind: string) =>
    Math.round(
      steps.reduce((acc, s) => acc + s.timers.filter((t) => t.kind === kind).reduce((a, t) => a + t.seconds, 0), 0) / 60,
    ) || null;
  const bake = sum("bake");
  const rest = sum("rest");
  const stove = (sum("simmer") ?? 0) + (sum("cook") ?? 0) || null;

  let cook = raw.cookTime ?? stove;
  // If the source lumps baking into "cook time", show the split instead of double counting.
  if (raw.cookTime && bake && bake <= raw.cookTime) cook = raw.cookTime - bake || null;

  const prep = raw.prepTime;
  const total = raw.totalTime ?? ((prep ?? 0) + (cook ?? 0) + (bake ?? 0) + (rest ?? 0) || null);
  return { total, prep, cook, bake, rest };
}

export function heuristicDraft(raw: RawRecipe): RecipeDraft {
  let ingredientLines = raw.ingredients;
  let instructionLines = raw.instructions;
  let description = raw.description;

  if (!raw.structured && raw.text) {
    const split = splitFreeText(raw.text);
    ingredientLines = split.ingredients.map((text) => ({ text, group: null }));
    instructionLines = split.steps;
    if (!description && split.intro.length) description = split.intro.slice(0, 3).join(" ");
  }

  const steps = instructionLines.map(buildStep);
  const { servings, label } = parseServings(raw.yield);

  return {
    title: cleanTitle(raw.title, raw.siteName),
    description: description?.slice(0, 600) ?? null,
    imageUrl: raw.image,
    author: raw.author,
    sourceUrl: raw.url,
    linkedUrl: null,
    sourceType: raw.sourceType,
    servings,
    servingsLabel: label,
    times: deriveTimes(raw, steps),
    ingredients: ingredientLines.map((i) => parseIngredientLine(i.text, i.group)),
    steps,
    tags: [...new Set(raw.keywords.map((k) => k.toLowerCase()))].slice(0, 8),
    language: raw.language,
  };
}
