"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useState } from "react";
import { RecipeEditor } from "@/components/recipe/RecipeEditor";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/misc";
import { TopBar } from "@/components/ui/TopBar";
import { useRecipe } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { toast } from "@/lib/toast";
import type { Recipe, RecipeDraft } from "@/lib/types";

function Editor({ recipe }: { recipe: Recipe }) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const router = useRouter();
  const store = useStore();
  const invalidate = useInvalidate();
  const [draft, setDraft] = useState<RecipeDraft>(recipe);
  const [saving, setSaving] = useState(false);

  return (
    <div className="pb-28">
      <TopBar back title={t("editTitle")} />
      <div className="pt-2">
        <RecipeEditor draft={draft} onChange={setDraft} />
      </div>
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper">
        <div className="mx-auto flex max-w-xl gap-3 px-4 py-3">
          <Button className="flex-1" onClick={() => router.back()}>
            {tc("cancel")}
          </Button>
          <Button
            variant="solid"
            className="flex-[2]"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await store.updateRecipe(recipe.id, draft);
              invalidate("recipes");
              toast(t("saved"));
              router.replace(`/recipe/${recipe.id}`);
            }}
          >
            {tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: recipe } = useRecipe(id);
  if (!recipe) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }
  return <Editor key={recipe.id} recipe={recipe} />;
}
