"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EditorSaveBar, RecipeEditor } from "@/components/recipe/RecipeEditor";
import { TopBar } from "@/components/ui/TopBar";
import { useHouseholdId } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { emptyDraft } from "@/lib/recipe-utils";
import { toast } from "@/lib/toast";
import type { RecipeDraft } from "@/lib/types";

export default function NewRecipePage() {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const router = useRouter();
  const store = useStore();
  const hid = useHouseholdId();
  const invalidate = useInvalidate();
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!hid) return;
    setSaving(true);
    try {
      const recipe = await store.createRecipe(hid, draft);
      invalidate("recipes");
      toast(t("created"));
      router.replace(`/recipe/${recipe.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      <TopBar back title={t("newTitle")} />
      <div className="pt-2">
        <RecipeEditor draft={draft} onChange={setDraft} />
      </div>
      <EditorSaveBar
        saving={saving}
        disabled={!draft.title.trim() || !hid}
        label={tc("save")}
        cancelLabel={tc("cancel")}
        onCancel={() => router.back()}
        onSave={save}
      />
    </div>
  );
}
