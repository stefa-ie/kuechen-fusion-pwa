"use client";

import { Settings, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Wordmark } from "@/components/brand/Logo";
import { AddRecipeButton } from "@/components/nav/AddRecipeButton";
import { RecipeCarousel, RecipeGrid } from "@/components/recipe/RecipeCard";
import { CollectionThumb } from "@/components/recipe/SaveSheet";
import { SerifHeading, Spinner } from "@/components/ui/misc";
import { useCollections, useCooked, useLatestRecipes, useRecipes, useSession } from "@/lib/data/hooks";
import type { Recipe } from "@/lib/types";

const EXAMPLES = [
  { label: "Ottolenghi", url: "https://ottolenghi.co.uk/pages/recipes/polenta-sardines-coriander-salsa" },
  { label: "Instagram Reel", url: "https://www.instagram.com/reel/C1DTWidJhcO/" },
];

export default function BrowsePage() {
  const t = useTranslations("browse");
  const { data: session, error } = useSession();
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: latest = [], isLoading: latestLoading } = useLatestRecipes();
  const { data: collections = [] } = useCollections();
  const { data: cooked = [] } = useCooked();
  const [seed] = useState(Math.random);

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const recentlyCooked = [...new Set([...cooked].sort((a, b) => b.cookedAt.localeCompare(a.cookedAt)).map((c) => c.recipeId))]
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => Boolean(r));
  const filled = collections.filter((c) => c.recipeIds.some((id) => byId.has(id)));
  const featured = filled.length ? filled[Math.floor(seed * filled.length)] : null;
  const featuredRecipes = featured
    ? featured.recipeIds.map((id) => byId.get(id)).filter((r): r is Recipe => Boolean(r)).slice(0, 4)
    : [];

  return (
    <div className="pb-20">
      <header className="safe-top sticky top-0 z-30 bg-paper/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-2">
          <Link href="/household" aria-label={t("household")} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
            {session ? (
              <span className="flex size-8 items-center justify-center rounded-full text-[16px]" style={{ backgroundColor: `${session.profile.color}14` }}>
                {session.profile.avatar}
              </span>
            ) : (
              <Users className="size-5" />
            )}
          </Link>
          <Wordmark />
          <Link href="/settings" aria-label={t("settings")} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
            <Settings className="size-5" strokeWidth={1.6} />
          </Link>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4 text-[14px]">
          {t("connectionError")} <span className="text-muted">({error.message})</span>
        </div>
      )}

      {isLoading || latestLoading || !session ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : !latest.length ? (
        <section className="px-6 pt-14 text-center">
          <div className="font-fraktur text-[64px] leading-none">KF</div>
          <h2 className="mt-4 font-serif text-[26px] leading-tight">{t("welcomeTitle")}</h2>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">{t("welcomeBody")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <Link
                key={ex.url}
                href={`/import?url=${encodeURIComponent(ex.url)}`}
                className="rounded-full border border-ink/25 px-4 py-2 text-[14px] font-medium hover:border-ink"
              >
                {t("tryExample", { name: ex.label })}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <>
          <SerifHeading className="pt-3">{t("newlyAdded")}</SerifHeading>
          <RecipeCarousel recipes={latest} />

          {featured && (
            <>
              <SerifHeading>{t("featuredCollections")}</SerifHeading>
              <Link href={`/box/${featured.id}`} className="relative mx-3 block overflow-hidden">
                <div className="aspect-square w-full [&>*]:size-full">
                  <CollectionThumb collection={featured} recipes={recipes} size="lg" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent" />
                <div className="absolute top-4 right-4 left-4 text-paper">
                  <div className="text-[12px] font-bold tracking-[0.1em] uppercase">
                    {t("recipeCount", { count: featured.recipeIds.length })}
                  </div>
                  <div className="mt-1 text-[24px] leading-tight font-bold">{featured.name}</div>
                </div>
              </Link>
              <div className="mt-4">
                <RecipeGrid recipes={featuredRecipes} />
              </div>
            </>
          )}

          {recentlyCooked.length > 0 && (
            <>
              <SerifHeading>{t("recentlyCooked")}</SerifHeading>
              <RecipeCarousel recipes={recentlyCooked.slice(0, 10)} />
            </>
          )}
        </>
      )}

      <AddRecipeButton />
    </div>
  );
}
