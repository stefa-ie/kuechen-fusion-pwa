"use client";

import { Bookmark, CheckCircle2, ChevronLeft, ExternalLink, MoreHorizontal, Share, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { use, useEffect, useState, type ReactNode } from "react";
import { CookSheet } from "@/components/recipe/CookSheet";
import { IngredientsPanel } from "@/components/recipe/IngredientsPanel";
import { NotesSection } from "@/components/recipe/NotesSection";
import { PreparationPanel } from "@/components/recipe/PreparationPanel";
import { RecipeImage } from "@/components/recipe/RecipeImage";
import { RecipeMenu, shareRecipe, useAddToGrocery } from "@/components/recipe/RecipeMenu";
import { SaveSheet } from "@/components/recipe/SaveSheet";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { useCooking, useRecipeCooking } from "@/lib/cooking-state";
import { useCollections, useCooked, useHouseholdId, useRecipe, useSession } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { formatMinutes } from "@/lib/duration";
import { markViewed } from "@/lib/recent";
import { hostOf, savedInAny, totalMinutes } from "@/lib/recipe-utils";
import { toast } from "@/lib/toast";
import type { RecipeTimes } from "@/lib/types";

const TIME_PARTS: (keyof Omit<RecipeTimes, "total">)[] = ["prep", "cook", "bake", "rest"];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-[16px]">
      <dt className="min-w-16 font-bold">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-4 mt-8 border-t-[5px] border-ink pt-3">
      <h2 className="kicker mb-4 text-[19px] tracking-[0.06em]">{title}</h2>
      {children}
    </section>
  );
}

function useScrolledPast<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, past] as const;
}

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("recipe");
  const tc = useTranslations("common");
  const tt = useTranslations("times");
  const locale = useLocale();
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: session } = useSession();
  const { data: collections } = useCollections();
  const { data: cooked } = useCooked();
  const store = useStore();
  const hid = useHouseholdId();
  const invalidate = useInvalidate();
  const addToGrocery = useAddToGrocery();
  const { servings } = useRecipeCooking(id, recipe?.servings ?? null);
  const { setServings, stepMode, setStepMode } = useCooking();
  const [saveOpen, setSaveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cookOpen, setCookOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [titleRef, titlePast] = useScrolledPast<HTMLHeadingElement>();

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
  const total = totalMinutes(recipe);
  const parts = TIME_PARTS.filter((p) => recipe.times[p]);
  const share = () => shareRecipe(recipe, tc("linkCopied"));

  return (
    <article className="pb-10">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex h-12 items-center gap-1 px-2">
          <button aria-label={tc("back")} onClick={() => router.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-wash">
            <ChevronLeft className="size-7" strokeWidth={1.6} />
          </button>
          <div className={cn("min-w-0 flex-1 truncate text-right text-[15px] font-bold transition-opacity", titlePast ? "opacity-100" : "opacity-0")}>
            {recipe.title}
          </div>
          <button aria-label={t("share")} onClick={share} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-wash">
            <Share className="size-5" strokeWidth={1.6} />
          </button>
          <button aria-label={t("save")} onClick={() => setSaveOpen(true)} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-wash">
            <Bookmark className="size-5" strokeWidth={1.6} fill={saved ? "currentColor" : "none"} />
          </button>
          <button aria-label={t("more")} onClick={() => setMenuOpen(true)} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-wash">
            <MoreHorizontal className="size-5" />
          </button>
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
        <h1 ref={titleRef} className="font-serif text-[36px] leading-[1.1] tracking-[-0.01em]">
          {recipe.title}
        </h1>
        {recipe.author && <p className="mt-3 text-[16px] font-bold">{t("by", { author: recipe.author })}</p>}
        {recipe.sourceType !== "web" && recipe.sourceUrl && recipe.linkedUrl && (
          <p className="mt-1 text-[13px] text-muted">
            {t("viaSocial", { platform: recipe.sourceType })}{" "}
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {hostOf(recipe.sourceUrl)}
            </a>
          </p>
        )}

        <dl className="mt-3 space-y-2">
          {total != null && (
            <Fact label={t("time")}>
              {formatMinutes(total, locale)}
              {parts.length > 0 && (
                <span className="text-muted">
                  {" "}
                  ({parts.map((p) => `${tt(p)} ${formatMinutes(recipe.times[p], locale)}`).join(", ")})
                </span>
              )}
            </Fact>
          )}
          {recipe.servings != null && <Fact label={t("yield")}>{t("servings", { count: recipe.servings })}</Fact>}
          {othersCooked.length > 0 && (
            <Fact label={t("cookedLabel")}>
              {othersCooked
                .map((c) => session?.members.find((m) => m.profileId === c.profileId)?.displayName || "?")
                .join(", ")}
            </Fact>
          )}
        </dl>

        <div className="mt-5 flex items-center gap-2.5">
          <button
            onClick={() => setSaveOpen(true)}
            className="flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[16px] font-semibold text-paper"
          >
            <Bookmark className="size-5" fill={saved ? "currentColor" : "none"} />
            {saved ? t("saved") : t("save")}
          </button>
          <button
            onClick={() => setCookOpen(true)}
            className="flex h-12 items-center rounded-full border border-ink/25 px-6 text-[16px] font-medium"
          >
            {t("cook")}
          </button>
          <button
            aria-label={t("share")}
            onClick={share}
            className="flex size-12 items-center justify-center rounded-full border border-ink/25"
          >
            <Share className="size-5" strokeWidth={1.6} />
          </button>
        </div>

        {recipe.description && (
          <div className="mt-5">
            <p className={cn("font-serif text-[18px] leading-relaxed text-ink-soft", !expanded && "line-clamp-3")}>
              {recipe.description}
            </p>
            {recipe.description.length > 140 && (
              <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-[15px] font-semibold underline">
                {expanded ? t("readLess") : t("readMore")}
              </button>
            )}
          </div>
        )}

        {recipe.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {recipe.tags.map((tag) => (
              <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="rounded-full bg-wash px-3 py-1 text-[12px] text-ink-soft">
                {tag}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <button
            onClick={async () => {
              if (!hid) return;
              await store.setCooked(hid, recipe.id, !myCooked);
              invalidate("cooked");
              if (!myCooked) toast(t("markedCooked"));
            }}
            className="flex items-center gap-2 text-[16px] font-medium"
          >
            {t("markCooked")}
            <CheckCircle2 className={cn("size-6", myCooked ? "fill-ink text-paper" : "fill-line text-paper")} />
          </button>
        </div>
      </div>

      <Section title={t("ingredients")}>
        <IngredientsPanel
          recipe={recipe}
          servings={servings}
          onServingsChange={(n) => setServings(recipe.id, n)}
          onAddToGrocery={() => addToGrocery(recipe, factor)}
        />
      </Section>

      <Section title={t("preparation")}>
        <PreparationPanel recipe={recipe} mode={stepMode} onModeChange={setStepMode} />
      </Section>

      <NotesSection recipeId={recipe.id} />

      <CookSheet recipe={recipe} open={cookOpen} onClose={() => setCookOpen(false)} />
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
