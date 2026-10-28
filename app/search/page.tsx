"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { RecipeGrid } from "@/components/recipe/RecipeCard";
import { RecipeImage } from "@/components/recipe/RecipeImage";
import { allTags, applyFilters, EMPTY_FILTERS, FilterBar, type Filters, type SortKey } from "@/components/search/FilterBar";
import { isUrl, LinkInput } from "@/components/search/LinkInput";
import { EmptyState, SectionTitle } from "@/components/ui/misc";
import { useRecipes } from "@/lib/data/hooks";
import { searchRecipes, totalMinutes } from "@/lib/recipe-utils";

function SearchView() {
  const t = useTranslations("search");
  const params = useSearchParams();
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("relevance");

  const looksLikeUrl = isUrl(query);
  const filtering = filters !== EMPTY_FILTERS;
  const matches = useMemo(() => searchRecipes(recipes, looksLikeUrl ? "" : query), [recipes, query, looksLikeUrl]);
  const results = applyFilters(matches, filters, sort);
  const categories = useMemo(() => {
    const quick = recipes.filter((r) => (totalMinutes(r) ?? 999) <= 30);
    const tiles = allTags(recipes)
      .slice(0, 8)
      .map((tag) => ({ key: tag, label: tag, image: recipes.find((r) => r.tags.includes(tag) && r.imageUrl)?.imageUrl ?? null, q: tag }));
    if (quick.length) tiles.unshift({ key: "quick", label: t("under30"), image: quick.find((r) => r.imageUrl)?.imageUrl ?? null, q: "" });
    return tiles.slice(0, 9);
  }, [recipes, t]);

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 bg-paper/95 pb-2 backdrop-blur">
        <h1 className="py-3 text-center text-[17px] font-semibold">{t("title")}</h1>
        <LinkInput value={query} onChange={setQuery} autoFocus={params.get("focus") === "1"} onCancel={() => {
            setQuery("");
            setFilters(EMPTY_FILTERS);
          }}
        />
      </header>

      {looksLikeUrl ? (
        <p className="px-6 py-8 text-center text-[14px] text-muted">{t("urlHint")}</p>
      ) : query.trim() || filtering ? (
        <>
          <ul className="border-b border-line px-4 pb-2">
            {matches.slice(0, 3).map((r) => (
              <li key={r.id}>
                <Link href={`/recipe/${r.id}`} className="flex items-center gap-3 py-2">
                  <RecipeImage src={r.imageUrl} alt="" className="size-9 shrink-0" />
                  <span className="flex-1 truncate text-[15px]">{r.title}</span>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          <FilterBar
            recipes={matches}
            filters={filters}
            onChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            sortOptions={["relevance", "newest", "az", "quickest"]}
          />
          {results.length ? (
            <RecipeGrid recipes={results} />
          ) : (
            <EmptyState icon={<Search className="size-6" />}>{t("noResults")}</EmptyState>
          )}
        </>
      ) : (
        <>
          {categories.length > 0 && (
            <>
              <SectionTitle>{t("byCategory")}</SectionTitle>
              <div className="grid grid-cols-3 gap-3 px-3">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      if (c.key === "quick") {
                        setFilters({ ...EMPTY_FILTERS, maxMinutes: 30 });
                      } else {
                        setQuery(c.q);
                      }
                    }}
                    className="relative overflow-hidden rounded-lg"
                  >
                    <RecipeImage src={c.image} alt="" className="aspect-[4/5] w-full" />
                    <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-paper px-2 py-1.5 text-[13px] font-medium shadow">
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          <SectionTitle>{t("howTo")}</SectionTitle>
          <ol className="mx-4 space-y-3 text-[15px] text-ink-soft">
            {(["howTo1", "howTo2", "howTo3"] as const).map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="font-serif text-[20px] leading-none text-ink">{i + 1}</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ol>
          <div className="px-4 pt-6">
            <button onClick={() => router.push("/import")} className="text-[14px] underline underline-offset-4">
              {t("pasteText")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
