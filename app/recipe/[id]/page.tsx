"use client";

import { Bookmark, CheckCircle2, ChevronLeft, ExternalLink, MoreHorizontal, Share, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
import { IngredientsPanel } from "@/components/recipe/IngredientsPanel";
import { NotesSection } from "@/components/recipe/NotesSection";
import { PreparationPanel } from "@/components/recipe/PreparationPanel";
import { RecipeImage } from "@/components/recipe/RecipeImage";
import { RecipeMenu, shareRecipe, useAddToGrocery } from "@/components/recipe/RecipeMenu";
import { SaveSheet } from "@/components/recipe/SaveSheet";
import { TimeCard } from "@/components/recipe/TimeCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { useRecipeCooking, useCooking } from "@/lib/cooking-state";
import { useCollections, useCooked, useHouseholdId, useRecipe, useSession } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { markViewed } from "@/lib/recent";
import { hostOf, savedInAny } from "@/lib/recipe-utils";
import { toast } from "@/lib/toast";

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("recipe");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: session } = useSession();
  const { data: collections } = useCollections();
  const { data: cooked } = useCooked();
  const store = useStore();
  const hid = useHouseholdId();
  const invalidate = useInvalidate();
  const addToGrocery = useAddToGrocery();
  const { servings, checked } = useRecipeCooking(id, recipe?.servings ?? null);
  const { setServings, toggleChecked, stepMode, setStepMode } = useCooking();
  const [tab, setTab] = useState<"ingredients" | "preparation">("ingredients");
  const [saveOpen, setSaveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (recipe) markViewed(recipe.id);
  }, [recipe]);

  if (isLoading || (!recipe && !session)) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }
  if (!recipe) {
    return <EmptyState icon={<Bookmark className="size-6" />}>{t("notFound")}</EmptyState>;
  }

  const saved = savedInAny(recipe.id, collections);
  const myCooked = cooked?.some((c) => c.recipeId === recipe.id && c.profileId === session?.profile.id);
  const othersCooked = cooked?.filter((c) => c.recipeId === recipe.id && c.profileId !== session?.profile.id) ?? [];
  const source = recipe.linkedUrl ?? recipe.sourceUrl;
  const factor = recipe.servings ? servings / recipe.servings : 1;

  return (
    <article className="pb-10">
      <header className="safe-top sticky top-0 z-30 bg-paper/95 backdrop-blur">
        <div className="flex h-12 items-center justify-between px-2">
          <button aria-label={tc("back")} onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
            <ChevronLeft className="size-7" strokeWidth={1.6} />
          </button>
          <div className="flex items-center">
            <button aria-label={t("share")} onClick={() => shareRecipe(recipe, tc("linkCopied"))} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
              <Share className="size-5" strokeWidth={1.6} />
            </button>
            <button aria-label={t("save")} onClick={() => setSaveOpen(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
              <Bookmark className="size-5" strokeWidth={1.6} fill={saved ? "currentColor" : "none"} />
            </button>
            <button aria-label={t("more")} onClick={() => setMenuOpen(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <RecipeImage src={recipe.imageUrl} alt={recipe.title} className="aspect-[4/3] w-full" />
      {source && (
        <a href={source} target="_blank" rel="noopener noreferrer" className="mt-1.5 flex items-center justify-end gap-1 px-4 text-[11px] text-muted">
          {recipe.sourceType !== "web" && recipe.sourceType !== "manual" && <Video className="size-3" />}
          {hostOf(source)}
          <ExternalLink className="size-3" />
        </a>
      )}

      <div className="px-4 pt-3">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.01em]">{recipe.title}</h1>
        {recipe.author && <p className="mt-2 text-[15px] font-semibold">{t("by", { author: recipe.author })}</p>}
        {recipe.sourceType !== "web" && recipe.sourceUrl && recipe.linkedUrl && (
          <p className="mt-1 text-[13px] text-muted">
            {t("viaSocial", { platform: recipe.sourceType })}{" "}
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {hostOf(recipe.sourceUrl)}
            </a>
          </p>
        )}
        {recipe.description && <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{recipe.description}</p>}
        {recipe.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {recipe.tags.map((tag) => (
              <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="rounded-full bg-wash px-3 py-1 text-[12px] text-ink-soft">
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <TimeCard recipe={recipe} />
      </div>

      <div className="px-4 pt-5">
        <Link href={`/recipe/${recipe.id}/cook`}>
          <Button className="w-full">{t("startCooking")}</Button>
        </Link>
      </div>

      <div className="sticky top-[calc(48px+env(safe-area-inset-top))] z-20 mt-6 grid grid-cols-2 border-b border-line bg-paper px-4">
        {(["ingredients", "preparation"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "kicker -mb-px border-b-2 py-3 text-[14px]",
              tab === key ? "border-ink text-ink" : "border-transparent text-muted",
            )}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {tab === "ingredients" ? (
        <IngredientsPanel
          recipe={recipe}
          servings={servings}
          onServingsChange={(n) => setServings(recipe.id, n)}
          checked={checked}
          onToggle={(i) => toggleChecked(recipe.id, i)}
          onAddToGrocery={() => addToGrocery(recipe, factor)}
        />
      ) : (
        <PreparationPanel recipe={recipe} mode={stepMode} onModeChange={setStepMode} />
      )}

      <div className="mx-4 mt-6 flex items-center justify-between border-t border-line py-4">
        <button
          onClick={async () => {
            if (!hid) return;
            await store.setCooked(hid, recipe.id, !myCooked);
            invalidate("cooked");
            if (!myCooked) toast(t("markedCooked"));
          }}
          className="flex items-center gap-2 text-[15px]"
        >
          {t("markCooked")}
          <CheckCircle2 className={cn("size-6", myCooked ? "fill-ink text-paper" : "fill-line text-paper")} />
        </button>
        {othersCooked.length > 0 && (
          <span className="text-[13px] text-muted">
            {t("cookedBy", {
              names: othersCooked
                .map((c) => session?.members.find((m) => m.profileId === c.profileId)?.displayName || "?")
                .join(", "),
            })}
          </span>
        )}
      </div>

      <NotesSection recipeId={recipe.id} />

      <SaveSheet recipe={recipe} open={saveOpen} onClose={() => setSaveOpen(false)} />
      <RecipeMenu
        recipe={recipe}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddToFolder={() => {
          setMenuOpen(false);
          setSaveOpen(true);
        }}
      />
    </article>
  );
}
