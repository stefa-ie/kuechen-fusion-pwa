"use client";

import { ExternalLink, FolderPlus, Pencil, Share, ShoppingBasket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import { useCanEdit, useGroceryActions } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { toast } from "@/lib/toast";
import type { Recipe } from "@/lib/types";

export async function shareRecipe(recipe: Recipe, fallbackMessage: string) {
  const url = recipe.linkedUrl ?? recipe.sourceUrl ?? window.location.origin + `/recipe/${recipe.id}`;
  if (navigator.share) {
    await navigator.share({ title: recipe.title, url }).catch(() => undefined);
  } else {
    await navigator.clipboard.writeText(url);
    toast(fallbackMessage);
  }
}

export function useAddToGrocery() {
  const { add } = useGroceryActions();
  const t = useTranslations("grocery");
  return async (recipe: Recipe, factor = 1) => {
    await add.mutateAsync(
      recipe.ingredients.map((i) => ({
        name: i.name,
        qty: i.qty != null ? i.qty * factor : null,
        unit: i.unit,
        note: i.note,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
      })),
    );
    toast(t("addedFromRecipe", { count: recipe.ingredients.length }));
  };
}

function Item({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between border-b border-line px-5 py-4 text-left text-[16px] ${danger ? "text-accent" : ""}`}
    >
      {children}
      {icon}
    </button>
  );
}

export function RecipeMenu({
  recipe,
  open,
  onClose,
  onAddToFolder,
}: {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
  onAddToFolder: () => void;
}) {
  const t = useTranslations("recipe");
  const tc = useTranslations("common");
  const router = useRouter();
  const store = useStore();
  const invalidate = useInvalidate();
  const addToGrocery = useAddToGrocery();
  const canEdit = useCanEdit(recipe);
  const [confirm, setConfirm] = useState(false);
  const source = recipe.linkedUrl ?? recipe.sourceUrl;

  return (
    <>
      <Sheet open={open} onClose={onClose}>
        <div className="pb-2">
          <Item icon={<FolderPlus className="size-5" />} onClick={onAddToFolder}>
            {t("addToFolder")}
          </Item>
          <Item
            icon={<ShoppingBasket className="size-5" />}
            onClick={() => {
              onClose();
              void addToGrocery(recipe);
            }}
          >
            {t("addAllToGrocery")}
          </Item>
          <Item icon={<Share className="size-5" />} onClick={() => void shareRecipe(recipe, tc("linkCopied"))}>
            {t("share")}
          </Item>
          {source && (
            <Item icon={<ExternalLink className="size-5" />} onClick={() => window.open(source, "_blank", "noopener")}>
              {t("openSource")}
            </Item>
          )}
          {canEdit && (
            <>
              <Item icon={<Pencil className="size-5" />} onClick={() => router.push(`/recipe/${recipe.id}/edit`)}>
                {t("edit")}
              </Item>
              <Item icon={<Trash2 className="size-5" />} onClick={() => setConfirm(true)} danger>
                {t("delete")}
              </Item>
            </>
          )}
        </div>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        title={t("deleteConfirm")}
        body={t("deleteConfirmBody")}
        confirmLabel={t("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await store.deleteRecipe(recipe.id);
          invalidate("recipes");
          invalidate("collections");
          onClose();
          toast(t("deleted"));
          router.push("/box");
        }}
      />
    </>
  );
}
