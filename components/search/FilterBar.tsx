"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { TIME_FILTERS, totalMinutes } from "@/lib/recipe-utils";
import type { Recipe } from "@/lib/types";

export type SortKey = "newest" | "az" | "quickest" | "relevance";

export interface Filters {
  maxMinutes: number | null;
  tags: string[];
  source: "all" | "web" | "social";
}

export const EMPTY_FILTERS: Filters = { maxMinutes: null, tags: [], source: "all" };

export function applyFilters(recipes: Recipe[], filters: Filters, sort: SortKey): Recipe[] {
  const out = recipes.filter((r) => {
    if (filters.maxMinutes) {
      const m = totalMinutes(r);
      if (!m || m > filters.maxMinutes) return false;
    }
    if (filters.tags.length && !filters.tags.every((t) => r.tags.includes(t))) return false;
    if (filters.source === "web" && r.sourceType !== "web") return false;
    if (filters.source === "social" && (r.sourceType === "web" || r.sourceType === "manual")) return false;
    return true;
  });
  if (sort === "az") out.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "quickest") out.sort((a, b) => (totalMinutes(a) ?? 9999) - (totalMinutes(b) ?? 9999));
  if (sort === "newest") out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

export function allTags(recipes: Recipe[]): string[] {
  const counts = new Map<string, number>();
  for (const r of recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/** "+ Filter | chip chip chip" row with a full filter sheet, as in NYT Cooking. */
export function FilterBar({
  recipes,
  filters,
  onChange,
  sort,
  onSortChange,
  sortOptions = ["newest", "az", "quickest"],
}: {
  recipes: Recipe[];
  filters: Filters;
  onChange: (f: Filters) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  sortOptions?: SortKey[];
}) {
  const t = useTranslations("filter");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const tags = useMemo(() => allTags(recipes), [recipes]);
  const toggleTag = (tag: string) =>
    onChange({ ...filters, tags: filters.tags.includes(tag) ? filters.tags.filter((x) => x !== tag) : [...filters.tags, tag] });
  const activeCount = (filters.maxMinutes ? 1 : 0) + filters.tags.length + (filters.source !== "all" ? 1 : 0);

  return (
    <>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 py-3">
        <button onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-1 pr-2 text-[15px] font-medium">
          <Plus className="size-4" />
          {t("filter")}
          {activeCount > 0 && <span className="ml-0.5 rounded-full bg-ink px-1.5 text-[11px] text-paper">{activeCount}</span>}
        </button>
        <span className="h-6 w-px shrink-0 bg-line" />
        {TIME_FILTERS.slice(0, 2).map((m) => (
          <Chip key={m} active={filters.maxMinutes === m} onClick={() => onChange({ ...filters, maxMinutes: filters.maxMinutes === m ? null : m })}>
            {t("under", { minutes: m })}
          </Chip>
        ))}
        {tags.slice(0, 6).map((tag) => (
          <Chip key={tag} active={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
            {tag}
          </Chip>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="text-[15px]">
          <b>{t("count", { count: applyFilters(recipes, filters, sort).length })}</b>
        </span>
        <button onClick={() => setSortOpen(true)} className="flex items-center gap-1 text-[15px]">
          {t("sortBy")} <b>{t(`sort.${sort}`)}</b>
          <ChevronDown className="size-4" />
        </button>
      </div>

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t("sortBy")}>
        <div className="pb-4">
          {sortOptions.map((key) => (
            <button
              key={key}
              onClick={() => {
                onSortChange(key);
                setSortOpen(false);
              }}
              className="flex w-full items-center justify-between border-b border-line px-5 py-4 text-left text-[16px]"
            >
              {t(`sort.${key}`)}
              {sort === key && <span className="size-2 rounded-full bg-ink" />}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={open} onClose={() => setOpen(false)} full>
        <div className="flex items-center justify-between px-4 pb-2">
          <button onClick={() => onChange(EMPTY_FILTERS)} className="text-[16px]">
            {t("reset")}
          </button>
          <span className="text-[16px] font-semibold">{t("filter")}</span>
          <button onClick={() => setOpen(false)} className="text-[16px] font-semibold">
            {tc("done")}
          </button>
        </div>
        <div className="px-4 pb-8">
          <h4 className="kicker pt-5 pb-3">{t("cookTimes")}</h4>
          <div className="flex flex-wrap gap-2">
            {TIME_FILTERS.map((m) => (
              <Chip key={m} active={filters.maxMinutes === m} onClick={() => onChange({ ...filters, maxMinutes: filters.maxMinutes === m ? null : m })}>
                {t("under", { minutes: m })}
              </Chip>
            ))}
          </div>
          <h4 className="kicker pt-6 pb-3">{t("source")}</h4>
          <div className="flex flex-wrap gap-2">
            {(["all", "web", "social"] as const).map((s) => (
              <Chip key={s} active={filters.source === s} onClick={() => onChange({ ...filters, source: s })}>
                {t(`sources.${s}`)}
              </Chip>
            ))}
          </div>
          {tags.length > 0 && (
            <>
              <h4 className="kicker pt-6 pb-3">{t("tags")}</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Chip key={tag} active={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                    {tag}
                  </Chip>
                ))}
              </div>
            </>
          )}
          <Button variant="solid" className="mt-8 w-full" onClick={() => setOpen(false)}>
            {t("show", { count: applyFilters(recipes, filters, sort).length })}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
