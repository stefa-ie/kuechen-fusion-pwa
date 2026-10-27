"use client";

import { Bookmark, CheckCircle2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useCollections, useCooked } from "@/lib/data/hooks";
import { formatMinutes } from "@/lib/duration";
import { hostOf, savedInAny, totalMinutes } from "@/lib/recipe-utils";
import type { Recipe } from "@/lib/types";
import { RecipeImage } from "./RecipeImage";
import { RecipeMenu } from "./RecipeMenu";
import { SaveSheet } from "./SaveSheet";

export function RecipeCard({ recipe, className, menu }: { recipe: Recipe; className?: string; menu?: boolean }) {
  const locale = useLocale();
  const { data: collections } = useCollections();
  const { data: cooked } = useCooked();
  const [saveOpen, setSaveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const saved = savedInAny(recipe.id, collections);
  const wasCooked = cooked?.some((c) => c.recipeId === recipe.id);
  const minutes = totalMinutes(recipe);
  const byline = recipe.author ?? hostOf(recipe.linkedUrl ?? recipe.sourceUrl);

  return (
    <div className={cn("relative flex flex-col bg-paper shadow-[0_1px_4px_rgba(0,0,0,0.12)]", className)}>
      <Link href={`/recipe/${recipe.id}`} className="block">
        <RecipeImage src={recipe.imageUrl} alt={recipe.title} className="aspect-[4/3] w-full" />
      </Link>
      <div className="flex flex-1 flex-col px-2.5 pt-2 pb-2.5">
        <Link href={`/recipe/${recipe.id}`} className="line-clamp-2 text-[15px] leading-[1.25] font-bold">
          {recipe.title}
        </Link>
        {byline && <div className="mt-0.5 truncate text-[13px] text-muted">{byline}</div>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <div className="flex min-w-0 items-center gap-1 text-[12px] text-ink-soft">
            {wasCooked && <CheckCircle2 className="size-3.5 shrink-0" />}
            <span className="truncate">{minutes ? formatMinutes(minutes, locale) : "\u00a0"}</span>
          </div>
          {menu ? (
            <button
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
              className="-mr-1 -mb-1 rounded-full p-1 text-ink-soft hover:bg-wash"
            >
              <MoreHorizontal className="size-4" />
            </button>
          ) : (
            <button
              aria-label="Save"
              onClick={() => setSaveOpen(true)}
              className="-mr-1 -mb-1 rounded-full p-1 text-ink-soft hover:bg-wash"
            >
              <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
      <SaveSheet recipe={recipe} open={saveOpen} onClose={() => setSaveOpen(false)} />
      {menu && (
        <RecipeMenu
          recipe={recipe}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onAddToFolder={() => {
            setMenuOpen(false);
            setSaveOpen(true);
          }}
        />
      )}
    </div>
  );
}

export function RecipeGrid({ recipes, menu }: { recipes: Recipe[]; menu?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-3">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} menu={menu} />
      ))}
    </div>
  );
}

export function RecipeCarousel({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-3 pb-2">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} className="w-[46%] shrink-0 snap-start" />
      ))}
    </div>
  );
}
