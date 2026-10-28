import type { RecipeDraft, SourceType } from "../types";

export interface RawRecipe {
  url: string | null;
  sourceType: SourceType;
  title: string | null;
  description: string | null;
  image: string | null;
  author: string | null;
  siteName: string | null;
  yield: string | null;
  /** Minutes. */
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  ingredients: { text: string; group: string | null }[];
  instructions: string[];
  keywords: string[];
  language: string | null;
  text: string | null;
  structured: boolean;
}

export type ImportMethod = "schema+llm" | "llm" | "schema" | "heuristic";

export interface ImportResult {
  draft: RecipeDraft;
  method: ImportMethod;
  needsText: boolean;
  caption: string | null;
  warnings: string[];
}

export function emptyRaw(url: string | null, sourceType: SourceType): RawRecipe {
  return {
    url,
    sourceType,
    title: null,
    description: null,
    image: null,
    author: null,
    siteName: null,
    yield: null,
    prepTime: null,
    cookTime: null,
    totalTime: null,
    ingredients: [],
    instructions: [],
    keywords: [],
    language: null,
    text: null,
    structured: false,
  };
}
