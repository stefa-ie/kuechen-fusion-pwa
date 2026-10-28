import type { Collection, Recipe, RecipeDraft } from "./types";

export function emptyDraft(): RecipeDraft {
  return {
    title: "",
    description: null,
    imageUrl: null,
    author: null,
    sourceUrl: null,
    linkedUrl: null,
    sourceType: "manual",
    servings: null,
    servingsLabel: null,
    times: { total: null, prep: null, cook: null, bake: null, rest: null },
    ingredients: [],
    steps: [],
    tags: [],
    language: null,
  };
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function totalMinutes(recipe: Pick<Recipe, "times">): number | null {
  const t = recipe.times;
  return t.total ?? ((t.prep ?? 0) + (t.cook ?? 0) + (t.bake ?? 0) + (t.rest ?? 0) || null);
}

export function savedInAny(recipeId: string, collections: Collection[] | undefined): boolean {
  return Boolean(collections?.some((c) => c.recipeIds.includes(recipeId)));
}

export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = query.trim().toLowerCase();
  if (!q) return recipes;
  const terms = q.split(/\s+/);
  return recipes
    .map((r) => {
      const hay = [r.title, r.author, r.description, ...r.tags, ...r.ingredients.map((i) => i.name)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const title = r.title.toLowerCase();
      const score = terms.reduce((s, t) => s + (title.includes(t) ? 3 : hay.includes(t) ? 1 : -100), 0);
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}

export const TIME_FILTERS = [20, 30, 45, 60] as const;
