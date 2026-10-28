"use client";

import { CheckCircle2, Clock, ClipboardList, LayoutGrid, List, MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RecipeCarousel, RecipeGrid } from "@/components/recipe/RecipeCard";
import { CollectionThumb } from "@/components/recipe/SaveSheet";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialog";
import { SectionTitle, Spinner } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useCollections, useHouseholdId, useRecipes } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import { searchRecipes } from "@/lib/recipe-utils";
import { toast } from "@/lib/toast";
import type { Collection } from "@/lib/types";

export default function RecipeBoxPage() {
  const t = useTranslations("box");
  const tc = useTranslations("common");
  const router = useRouter();
  const store = useStore();
  const hid = useHouseholdId();
  const invalidate = useInvalidate();
  const { data: recipes, isLoading } = useRecipes();
  const { data: collections = [] } = useCollections();
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [creating, setCreating] = useState(false);
  const [menuFor, setMenuFor] = useState<Collection | null>(null);
  const [renaming, setRenaming] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);

  const all = recipes ?? [];
  const results = query.trim() ? searchRecipes(all, query) : null;

  return (
    <div className="pb-6">
      <header className="safe-top sticky top-0 z-30 bg-paper/95 pb-2 backdrop-blur">
        <h1 className="py-3 text-center text-[17px] font-semibold">{t("title")}</h1>
        <div className="mx-3 flex h-10 items-center gap-2 rounded-lg bg-wash px-3">
          <Search className="size-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
          />
        </div>
      </header>

      {results ? (
        <div className="pt-3">
          <p className="px-4 pb-3 text-[15px]">
            <b>{t("results", { count: results.length })}</b>
          </p>
          <RecipeGrid recipes={results} menu />
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 px-3 pt-3">
            <Link href="/box/cooked">
              <Button className="w-full" size="md">
                <CheckCircle2 className="size-4 fill-ink text-paper" />
                {t("cooked")}
              </Button>
            </Link>
            <Link href="/grocery">
              <Button className="w-full" size="md">
                <ClipboardList className="size-4" />
                {t("grocery")}
              </Button>
            </Link>
          </div>
          <div className="px-3 pt-3">
            <Link href="/box/recent">
              <Button className="w-full" size="md" variant="soft">
                <Clock className="size-4" />
                {t("recentlyViewed")}
              </Button>
            </Link>
          </div>

          <SectionTitle>{t("recentlySaved")}</SectionTitle>
          {all.length > 0 && <RecipeCarousel recipes={all.slice(0, 8)} />}
          <div className="px-3 pt-3">
            <Button className="w-full" onClick={() => router.push("/box/all")}>
              {t("seeAll", { count: all.length })}
            </Button>
          </div>

          <SectionTitle
            action={
              <div className="flex items-center gap-3">
                <button onClick={() => setCreating(true)} className="flex items-center gap-1 text-[15px] font-medium">
                  <Plus className="size-4" />
                  {t("new")}
                </button>
                <button aria-label="Grid" onClick={() => setLayout("grid")} className={layout === "grid" ? "" : "text-faint"}>
                  <LayoutGrid className="size-5" fill={layout === "grid" ? "currentColor" : "none"} />
                </button>
                <button aria-label="List" onClick={() => setLayout("list")} className={layout === "list" ? "" : "text-faint"}>
                  <List className="size-5" />
                </button>
              </div>
            }
          >
            {t("folders")}
          </SectionTitle>

          <div className={cn("px-3", layout === "grid" ? "grid grid-cols-2 gap-x-3 gap-y-5" : "divide-y divide-line")}>
            {collections.map((c) => (
              <div key={c.id} className={layout === "list" ? "flex items-center gap-3 py-2" : ""}>
                <Link href={`/box/${c.id}`} className={layout === "list" ? "shrink-0" : "block"}>
                  <CollectionThumb collection={c} recipes={all} size={layout === "grid" ? "lg" : "sm"} />
                </Link>
                <div className={cn("flex items-start justify-between gap-2", layout === "grid" ? "pt-2" : "min-w-0 flex-1")}>
                  <Link href={`/box/${c.id}`} className="min-w-0">
                    <div className="text-[15px] leading-tight font-bold">{c.name}</div>
                    <div className="text-[13px] text-muted">
                      {c.recipeIds.length ? t("recipeCount", { count: c.recipeIds.length }) : t("empty")}
                    </div>
                  </Link>
                  <button aria-label={tc("more")} onClick={() => setMenuFor(c)} className="rounded-full p-1 hover:bg-wash">
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <PromptDialog
        open={creating}
        title={t("createFolder")}
        placeholder={t("folderName")}
        confirmLabel={tc("create")}
        cancelLabel={tc("cancel")}
        onClose={() => setCreating(false)}
        onConfirm={async (name) => {
          if (!hid) return;
          await store.createCollection(hid, name);
          invalidate("collections");
          toast(t("folderCreated", { name }));
        }}
      />
      <Sheet open={Boolean(menuFor)} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        <div className="pb-2">
          <button
            className="w-full border-b border-line px-5 py-4 text-left text-[16px]"
            onClick={() => {
              setRenaming(menuFor);
              setMenuFor(null);
            }}
          >
            {t("rename")}
          </button>
          <button
            className="w-full px-5 py-4 text-left text-[16px] text-accent"
            onClick={() => {
              setDeleting(menuFor);
              setMenuFor(null);
            }}
          >
            {t("deleteFolder")}
          </button>
        </div>
      </Sheet>
      <PromptDialog
        open={Boolean(renaming)}
        title={t("rename")}
        initialValue={renaming?.name}
        confirmLabel={tc("save")}
        cancelLabel={tc("cancel")}
        onClose={() => setRenaming(null)}
        onConfirm={async (name) => {
          if (!renaming) return;
          await store.renameCollection(renaming.id, name);
          invalidate("collections");
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("deleteFolderConfirm", { name: deleting?.name ?? "" })}
        body={t("deleteFolderBody")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await store.deleteCollection(deleting.id);
          invalidate("collections");
        }}
      />
    </div>
  );
}
