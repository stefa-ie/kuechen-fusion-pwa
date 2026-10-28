"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
import { EditorSaveBar, RecipeEditor } from "@/components/recipe/RecipeEditor";
import { Spinner } from "@/components/ui/misc";
import { TopBar } from "@/components/ui/TopBar";
import { useCanEdit, useRecipe } from "@/lib/data/hooks";
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

  const save = async () => {
    setSaving(true);
    try {
      await store.updateRecipe(recipe.id, draft);
      invalidate("recipes");
      toast(t("saved"));
      router.replace(`/recipe/${recipe.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      <TopBar back title={t("editTitle")} />
      <div className="pt-2">
        <RecipeEditor draft={draft} onChange={setDraft} />
      </div>
      <EditorSaveBar
        saving={saving}
        disabled={!draft.title.trim()}
        label={tc("save")}
        cancelLabel={tc("cancel")}
        onCancel={() => router.back()}
        onSave={save}
      />
    </div>
  );
}

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: recipe } = useRecipe(id);
  const canEdit = useCanEdit(recipe);

  useEffect(() => {
    if (recipe && !canEdit) router.replace(`/recipe/${id}`);
  }, [recipe, canEdit, id, router]);

  if (!recipe || !canEdit) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }
  return <Editor key={recipe.id} recipe={recipe} />;
}
