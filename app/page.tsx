"use client";

import { Link2, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/brand/Logo";
import { RecipeCarousel, RecipeGrid } from "@/components/recipe/RecipeCard";
import { CollectionThumb } from "@/components/recipe/SaveSheet";
import { SerifHeading, Spinner } from "@/components/ui/misc";
import { useCollections, useCooked, useRecipes, useSession } from "@/lib/data/hooks";

const EXAMPLES = [
  { label: "Ottolenghi", url: "https://ottolenghi.co.uk/pages/recipes/polenta-sardines-coriander-salsa" },
  { label: "Instagram Reel", url: "https://www.instagram.com/reel/C1DTWidJhcO/" },
];

export default function BrowsePage() {
  const t = useTranslations("browse");
  const router = useRouter();
  const { data: session, error } = useSession();
  const { data: recipes, isLoading } = useRecipes();
  const { data: collections = [] } = useCollections();
  const { data: cooked = [] } = useCooked();

  const recentlyCooked = [...cooked]
    .sort((a, b) => b.cookedAt.localeCompare(a.cookedAt))
    .map((c) => recipes?.find((r) => r.id === c.recipeId))
    .filter((r, i, arr): r is NonNullable<typeof r> => Boolean(r) && arr.indexOf(r) === i);
  const filledCollections = collections.filter((c) => c.recipeIds.length > 0);

  return (
    <div>
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

      <button
        onClick={() => router.push("/search?focus=1")}
        className="mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl border border-line px-4 py-3.5 text-left"
      >
        <Link2 className="size-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{t("importTitle")}</span>
          <span className="block text-[13px] text-muted">{t("importHint")}</span>
        </span>
      </button>

      {isLoading || !session ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : !recipes?.length ? (
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
          <SerifHeading>{t("recentlyAdded")}</SerifHeading>
          <RecipeCarousel recipes={recipes.slice(0, 10)} />

          {filledCollections.length > 0 && (
            <>
              <SerifHeading>{t("collections")}</SerifHeading>
              <div className="space-y-3 px-3">
                {filledCollections.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/box/${c.id}`} className="relative block overflow-hidden">
                    <div className="aspect-[16/10] w-full [&>*]:size-full">
                      <CollectionThumb collection={c} recipes={recipes} size="lg" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent" />
                    <div className="absolute top-4 left-4 right-4 text-paper">
                      <div className="text-[12px] font-bold tracking-[0.1em] uppercase">{t("recipeCount", { count: c.recipeIds.length })}</div>
                      <div className="mt-1 font-sans text-[24px] leading-tight font-bold">{c.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {recentlyCooked.length > 0 && (
            <>
              <SerifHeading>{t("recentlyCooked")}</SerifHeading>
              <RecipeCarousel recipes={recentlyCooked.slice(0, 10)} />
            </>
          )}

          {recipes.length > 10 && (
            <>
              <SerifHeading>{t("allRecipes")}</SerifHeading>
              <RecipeGrid recipes={recipes.slice(10, 30)} />
            </>
          )}
          <div className="h-6" />
        </>
      )}
    </div>
  );
}
