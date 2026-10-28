"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { applyFilters, EMPTY_FILTERS, FilterBar, type Filters, type SortKey } from "@/components/search/FilterBar";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { TopBar } from "@/components/ui/TopBar";
import { searchRecipes } from "@/lib/recipe-utils";
import type { Recipe } from "@/lib/types";
import { RecipeGrid } from "./RecipeCard";

export function RecipeListView({
  title,
  recipes,
  loading,
  empty,
  defaultSort = "newest",
  keepOrder,
}: {
  title: ReactNode;
  recipes: Recipe[];
  loading?: boolean;
  empty: { icon: ReactNode; text: ReactNode };
  defaultSort?: SortKey;
  /** Keep the given order (e.g. recently viewed) unless the user picks a sort. */
  keepOrder?: boolean;
}) {
  const t = useTranslations("box");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>(keepOrder ? "relevance" : defaultSort);
  const matched = useMemo(() => searchRecipes(recipes, query), [recipes, query]);
  const results = applyFilters(matched, filters, sort);

  return (
    <div className="pb-6">
      <TopBar back title={title} />
      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : !recipes.length ? (
        <EmptyState icon={empty.icon}>{empty.text}</EmptyState>
      ) : (
        <>
          <div className="mx-3 flex h-10 items-center gap-2 rounded-lg bg-wash px-3">
            <Search className="size-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
            />
          </div>
          <FilterBar
            recipes={matched}
            filters={filters}
            onChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            sortOptions={keepOrder ? ["relevance", "newest", "az", "quickest"] : ["newest", "az", "quickest"]}
          />
          <RecipeGrid recipes={results} menu />
        </>
      )}
    </div>
  );
}
