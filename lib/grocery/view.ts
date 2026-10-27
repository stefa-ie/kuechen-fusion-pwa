import { parseIngredientLine } from "../ingredients";
import type { GroceryItem, NewGroceryItem } from "../types";
import { categorize, CATEGORY_ORDER } from "./categorize";

export type GrocerySort = "manual" | "category" | "recipe" | "az" | "newest";
export type GroceryStatus = "open" | "done" | "all";

export interface GroceryFilter {
  status: GroceryStatus;
  recipeId: string | null;
  /** profile id of the person who added the item */
  addedBy: string | null;
}

export const DEFAULT_FILTER: GroceryFilter = { status: "all", recipeId: null, addedBy: null };

export interface GroceryGroup {
  key: string;
  /** category key, recipe title, or null for an ungrouped list */
  label: string | null;
  items: GroceryItem[];
}

/** Turns "2 kg Kartoffeln, Milch" or several pasted lines into grocery items. */
export function parseQuickAdd(input: string): NewGroceryItem[] {
  return input
    .split(/\n|,(?![^(]*\))|;/)
    .map((s) => s.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const ing = parseIngredientLine(line);
      const name = ing.name || line;
      return { name, qty: ing.qty, unit: ing.unit, note: ing.note, category: categorize(name) };
    });
}

export function filterGrocery(items: GroceryItem[], filter: GroceryFilter): GroceryItem[] {
  return items.filter(
    (i) =>
      (filter.status === "all" || (filter.status === "done" ? i.checked : !i.checked)) &&
      (!filter.recipeId || (filter.recipeId === "none" ? !i.recipeId : i.recipeId === filter.recipeId)) &&
      (!filter.addedBy || i.addedBy === filter.addedBy),
  );
}

export function groupGrocery(items: GroceryItem[], sort: GrocerySort): GroceryGroup[] {
  const byPosition = [...items].sort((a, b) => a.position - b.position);
  switch (sort) {
    case "manual":
      return [{ key: "all", label: null, items: byPosition }];
    case "az":
      return [{ key: "all", label: null, items: [...items].sort((a, b) => a.name.localeCompare(b.name)) }];
    case "newest":
      return [{ key: "all", label: null, items: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }];
    case "category":
      return CATEGORY_ORDER.map((c) => ({ key: c, label: c, items: byPosition.filter((i) => i.category === c) })).filter(
        (g) => g.items.length,
      );
    case "recipe": {
      const groups = new Map<string, GroceryGroup>();
      for (const item of byPosition) {
        const key = item.recipeId ?? "none";
        if (!groups.has(key)) groups.set(key, { key, label: item.recipeTitle, items: [] });
        groups.get(key)!.items.push(item);
      }
      return [...groups.values()].sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : 0));
    }
  }
}

/** Applies a reorder of a visible subset to the full list, keeping hidden items where they were. */
export function mergeOrder(all: GroceryItem[], visibleOrder: string[]): string[] {
  const sorted = [...all].sort((a, b) => a.position - b.position).map((i) => i.id);
  const visible = new Set(visibleOrder);
  let next = 0;
  return sorted.map((id) => (visible.has(id) ? visibleOrder[next++] : id));
}
