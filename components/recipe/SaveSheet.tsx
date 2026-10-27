"use client";

import { Bookmark, CheckCircle2, CookingPot, Heart, PlusCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PromptDialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import { useCollections, useHouseholdId, useRecipes } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { toast } from "@/lib/toast";
import type { Collection, Recipe } from "@/lib/types";
import { RecipeImage } from "./RecipeImage";

export function CollectionThumb({ collection, recipes, size = "sm" }: { collection: Collection; recipes: Recipe[]; size?: "sm" | "lg" }) {
  const images = collection.recipeIds
    .map((id) => recipes.find((r) => r.id === id)?.imageUrl)
    .filter((x): x is string => Boolean(x))
    .slice(0, 4);
  const Placeholder = /favorit/i.test(collection.name) ? Heart : CookingPot;
  const box = size === "sm" ? "size-12" : "aspect-square w-full";

  if (!images.length) {
    return (
      <div className={`${box} flex items-center justify-center bg-sand`}>
        <Placeholder className={size === "sm" ? "size-5 text-ink/30" : "size-14 text-ink/25"} fill="currentColor" strokeWidth={1} />
      </div>
    );
  }
  if (images.length < 4) return <RecipeImage src={images[0]} alt="" className={box} />;
  return (
    <div className={`${box} grid grid-cols-2 grid-rows-2 gap-px bg-paper`}>
      {images.map((src) => (
        <RecipeImage key={src} src={src} alt="" className="size-full" />
      ))}
    </div>
  );
}

/** NYT-style "Saved to your Recipe Box / Add to your folders" sheet. */
export function SaveSheet({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const t = useTranslations("save");
  const tc = useTranslations("common");
  const store = useStore();
  const invalidate = useInvalidate();
  const hid = useHouseholdId();
  const { data: collections = [] } = useCollections();
  const { data: recipes = [] } = useRecipes();
  const [creating, setCreating] = useState(false);

  const toggle = async (c: Collection) => {
    if (!hid) return;
    const included = !c.recipeIds.includes(recipe.id);
    await store.setInCollection(hid, c.id, recipe.id, included);
    invalidate("collections");
    toast(included ? t("addedTo", { name: c.name }) : t("removedFrom", { name: c.name }));
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 border-b border-line pb-4 text-[15px]">
          <Bookmark className="size-4" fill="currentColor" />
          <span>
            <b>{t("savedIn")}</b> {t("recipeBox")}
          </span>
        </div>
        <div className="flex items-center justify-between pt-5 pb-3">
          <h3 className="kicker">{t("addToFolders")}</h3>
          <button onClick={() => setCreating(true)} className="text-[15px] font-medium underline underline-offset-4">
            {t("new")}
          </button>
        </div>
        <ul>
          {collections.map((c) => {
            const included = c.recipeIds.includes(recipe.id);
            return (
              <li key={c.id}>
                <button onClick={() => toggle(c)} className="flex w-full items-center gap-3 py-2 text-left">
                  <CollectionThumb collection={c} recipes={recipes} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{c.name}</div>
                    <div className="text-[13px] text-muted">{t("recipeCount", { count: c.recipeIds.length })}</div>
                  </div>
                  {included ? (
                    <CheckCircle2 className="size-6 fill-ink text-paper" />
                  ) : (
                    <PlusCircle className="size-6" strokeWidth={1.3} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <Button className="mt-5 w-full" onClick={onClose}>
          {tc("done")}
        </Button>
      </div>
      <PromptDialog
        open={creating}
        title={t("createFolder")}
        placeholder={t("folderName")}
        confirmLabel={tc("create")}
        cancelLabel={tc("cancel")}
        onClose={() => setCreating(false)}
        onConfirm={async (name) => {
          if (!hid) return;
          const c = await store.createCollection(hid, name);
          await store.setInCollection(hid, c.id, recipe.id, true);
          invalidate("collections");
          toast(t("folderCreated", { name }));
        }}
      />
    </Sheet>
  );
}
