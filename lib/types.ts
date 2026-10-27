export type TimerKind = "bake" | "rest" | "simmer" | "cook";

export interface StepTimer {
  label: string;
  seconds: number;
  kind: TimerKind;
}

export interface Ingredient {
  qty: number | null;
  qtyMax: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  raw: string;
  group: string | null;
}

export interface Step {
  text: string;
  bullets: string[];
  timers: StepTimer[];
}

/** All values in minutes. */
export interface RecipeTimes {
  total: number | null;
  prep: number | null;
  cook: number | null;
  bake: number | null;
  rest: number | null;
}

export type SourceType = "web" | "instagram" | "tiktok" | "youtube" | "manual";

export interface RecipeDraft {
  title: string;
  description: string | null;
  imageUrl: string | null;
  author: string | null;
  sourceUrl: string | null;
  /** Recipe page referenced by a social post ("link in bio"), if one was followed. */
  linkedUrl: string | null;
  sourceType: SourceType;
  servings: number | null;
  servingsLabel: string | null;
  times: RecipeTimes;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  language: string | null;
}

export interface Recipe extends RecipeDraft {
  id: string;
  householdId: string;
  createdBy: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  avatar: string;
  color: string;
  activeHouseholdId: string | null;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
}

export interface Member {
  profileId: string;
  displayName: string;
  avatar: string;
  color: string;
  role: "owner" | "member";
}

export interface Collection {
  id: string;
  householdId: string;
  name: string;
  recipeIds: string[];
  createdAt: string;
}

export interface CookedEntry {
  recipeId: string;
  profileId: string;
  cookedAt: string;
}

export interface RecipeNote {
  id: string;
  recipeId: string;
  profileId: string;
  body: string;
  createdAt: string;
}

export type GroceryCategory =
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "pantry"
  | "spices"
  | "frozen"
  | "drinks"
  | "household"
  | "other";

export interface GroceryItem {
  id: string;
  householdId: string;
  name: string;
  qty: number | null;
  unit: string | null;
  note: string | null;
  category: GroceryCategory;
  checked: boolean;
  position: number;
  recipeId: string | null;
  recipeTitle: string | null;
  addedBy: string | null;
  createdAt: string;
}

export type NewGroceryItem = Pick<GroceryItem, "name" | "qty" | "unit" | "note"> &
  Partial<Pick<GroceryItem, "category" | "recipeId" | "recipeTitle">>;
