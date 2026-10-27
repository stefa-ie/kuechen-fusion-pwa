"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Plus, Share, ShoppingBasket, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EditItemSheet } from "@/components/grocery/EditItemSheet";
import { GroceryRow, SortableGroceryRow } from "@/components/grocery/GroceryRow";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/Sheet";
import { TopBar } from "@/components/ui/TopBar";
import { cn } from "@/lib/cn";
import { useGrocery, useGroceryActions, useSession } from "@/lib/data/hooks";
import {
  DEFAULT_FILTER,
  filterGrocery,
  groupGrocery,
  mergeOrder,
  parseQuickAdd,
  type GroceryFilter,
  type GrocerySort,
} from "@/lib/grocery/view";
import { toast } from "@/lib/toast";
import { formatQuantity } from "@/lib/units";
import type { GroceryItem } from "@/lib/types";

const SORTS: GrocerySort[] = ["manual", "category", "recipe", "az", "newest"];

export default function GroceryPage() {
  const t = useTranslations("grocery");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data: session } = useSession();
  const { data: items = [], isLoading } = useGrocery();
  const { add, update, remove, reorder } = useGroceryActions();

  const [draft, setDraft] = useState("");
  const [sort, setSort] = useState<GrocerySort>("manual");
  const [filter, setFilter] = useState<GroceryFilter>(DEFAULT_FILTER);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState<"done" | "all" | null>(null);
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [showDone, setShowDone] = useState(true);

  const members = useMemo(() => new Map(session?.members.map((m) => [m.profileId, m]) ?? []), [session]);
  const shared = (session?.members.length ?? 0) > 1;
  const recipes = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) if (i.recipeId && i.recipeTitle) map.set(i.recipeId, i.recipeTitle);
    return [...map.entries()];
  }, [items]);
  const adders = useMemo(() => [...new Set(items.map((i) => i.addedBy).filter(Boolean))] as string[], [items]);

  const visible = filterGrocery(items, filter);
  const open = visible.filter((i) => !i.checked);
  const done = visible.filter((i) => i.checked);
  const groups = groupGrocery(open, sort);
  const preview = draft.trim() ? parseQuickAdd(draft) : [];
  const activeFilters = (filter.status !== "all" ? 1 : 0) + (filter.recipeId ? 1 : 0) + (filter.addedBy ? 1 : 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = open.map((i) => i.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    reorder.mutate(mergeOrder(items, next));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview.length) return;
    add.mutate(preview);
    setDraft("");
  };

  const share = async () => {
    const lines = items
      .filter((i) => !i.checked)
      .sort((a, b) => a.position - b.position)
      .map((i) => `• ${[formatQuantity(i.qty, i.unit, locale), i.name].filter(Boolean).join(" ")}${i.note ? `, ${i.note}` : ""}`);
    const text = `${t("title")}\n${lines.join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: t("title"), text });
      else {
        await navigator.clipboard.writeText(text);
        toast(t("copied"));
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  const rowProps = (item: GroceryItem) => ({
    item,
    member: shared && item.addedBy ? members.get(item.addedBy) : undefined,
    showRecipe: sort !== "recipe",
    onToggle: () => update.mutate({ id: item.id, patch: { checked: !item.checked } }),
    onEdit: () => setEditing(item),
  });

  return (
    <div>
      <TopBar
        title={t("title")}
        right={
          <>
            <button aria-label={t("share")} onClick={share} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
              <Share className="size-5" strokeWidth={1.6} />
            </button>
            <button aria-label={tc("more")} onClick={() => setMenuOpen(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
              <MoreHorizontal className="size-5" />
            </button>
          </>
        }
      />

      <form onSubmit={submit} className="px-3 pt-1">
        <div className="flex items-center gap-2 rounded-lg border border-line px-3 focus-within:border-ink">
          <Plus className="size-5 shrink-0 text-muted" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("addPlaceholder")}
            enterKeyHint="done"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
          />
          {draft.trim() && (
            <button type="submit" className="text-[15px] font-semibold">
              {t("add")}
            </button>
          )}
        </div>
        {preview.length > 0 && (
          <p className="px-1 pt-2 text-[13px] text-muted">
            {preview
              .map((p) => [formatQuantity(p.qty, p.unit, locale), p.name].filter(Boolean).join(" "))
              .join(" · ")}
            {" · "}
            {t(`categories.${preview[0].category ?? "other"}`)}
          </p>
        )}
      </form>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 py-3">
        <button onClick={() => setSortOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink/25 px-3.5 py-1.5 text-[14px]">
          <ArrowUpDown className="size-3.5" />
          {t(`sort.${sort}`)}
        </button>
        <button onClick={() => setFilterOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink/25 px-3.5 py-1.5 text-[14px]">
          <SlidersHorizontal className="size-3.5" />
          {t("filter")}
          {activeFilters > 0 && <span className="rounded-full bg-ink px-1.5 text-[11px] text-paper">{activeFilters}</span>}
        </button>
        {(["open", "done"] as const).map((s) => (
          <Chip key={s} active={filter.status === s} onClick={() => setFilter({ ...filter, status: filter.status === s ? "all" : s })}>
            {t(`status.${s}`)}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBasket className="size-6" />}
          action={
            <Link href="/box" className="text-[14px] underline underline-offset-4">
              {t("emptyAction")}
            </Link>
          }
        >
          {t("empty")}
        </EmptyState>
      ) : (
        <div className="px-4 pb-10">
          {open.length === 0 && filter.status !== "done" && (
            <p className="py-8 text-center text-[15px] text-muted">{visible.length ? t("allDone") : t("noMatches")}</p>
          )}

          {sort === "manual" ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={open.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-line">
                  {open.map((item) => (
                    <SortableGroceryRow key={item.id} {...rowProps(item)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            groups.map((g) => (
              <section key={g.key}>
                {g.label !== null || sort === "recipe" ? (
                  <h3 className="kicker pt-5 pb-1">
                    {sort === "category" ? t(`categories.${g.key}`) : (g.label ?? t("otherItems"))}
                  </h3>
                ) : null}
                <div className="divide-y divide-line">
                  {g.items.map((item) => (
                    <GroceryRow key={item.id} {...rowProps(item)} />
                  ))}
                </div>
              </section>
            ))
          )}

          {done.length > 0 && (
            <section className="mt-6">
              <div className="flex items-center justify-between border-t border-line pt-4">
                <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-1 text-[15px] font-semibold">
                  {t("doneCount", { count: done.length })}
                  <ChevronDown className={cn("size-4 transition-transform", !showDone && "-rotate-90")} />
                </button>
                <button onClick={() => setConfirmClear("done")} className="text-[14px] underline underline-offset-4">
                  {t("clearDone")}
                </button>
              </div>
              {showDone && (
                <div className="divide-y divide-line">
                  {done.map((item) => (
                    <GroceryRow key={item.id} {...rowProps(item)} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t("sortBy")}>
        <div className="pb-4">
          {SORTS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSort(s);
                setSortOpen(false);
              }}
              className="flex w-full items-center justify-between border-b border-line px-5 py-4 text-left"
            >
              <span>
                <span className="block text-[16px]">{t(`sort.${s}`)}</span>
                <span className="block text-[13px] text-muted">{t(`sortHint.${s}`)}</span>
              </span>
              {sort === s && <span className="size-2 rounded-full bg-ink" />}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t("filter")}>
        <div className="px-4 pb-8">
          <h4 className="kicker pt-2 pb-3">{t("statusLabel")}</h4>
          <div className="flex flex-wrap gap-2">
            {(["all", "open", "done"] as const).map((s) => (
              <Chip key={s} active={filter.status === s} onClick={() => setFilter({ ...filter, status: s })}>
                {t(`status.${s}`)}
              </Chip>
            ))}
          </div>
          {recipes.length > 0 && (
            <>
              <h4 className="kicker pt-6 pb-3">{t("byRecipe")}</h4>
              <div className="flex flex-wrap gap-2">
                <Chip active={!filter.recipeId} onClick={() => setFilter({ ...filter, recipeId: null })}>
                  {t("status.all")}
                </Chip>
                {recipes.map(([id, title]) => (
                  <Chip key={id} active={filter.recipeId === id} onClick={() => setFilter({ ...filter, recipeId: id })}>
                    {title}
                  </Chip>
                ))}
                <Chip active={filter.recipeId === "none"} onClick={() => setFilter({ ...filter, recipeId: "none" })}>
                  {t("otherItems")}
                </Chip>
              </div>
            </>
          )}
          {shared && adders.length > 0 && (
            <>
              <h4 className="kicker pt-6 pb-3">{t("byMember")}</h4>
              <div className="flex flex-wrap gap-2">
                <Chip active={!filter.addedBy} onClick={() => setFilter({ ...filter, addedBy: null })}>
                  {t("everyone")}
                </Chip>
                {adders.map((id) => {
                  const m = members.get(id);
                  return (
                    <Chip key={id} active={filter.addedBy === id} onClick={() => setFilter({ ...filter, addedBy: id })}>
                      {m ? `${m.avatar} ${m.displayName}` : "?"}
                    </Chip>
                  );
                })}
              </div>
            </>
          )}
          <button onClick={() => setFilter(DEFAULT_FILTER)} className="mt-8 text-[14px] underline underline-offset-4">
            {t("resetFilter")}
          </button>
        </div>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="pb-2">
          {[
            {
              label: t("uncheckAll"),
              run: () => items.filter((i) => i.checked).forEach((i) => update.mutate({ id: i.id, patch: { checked: false } })),
            },
            { label: t("clearDone"), run: () => setConfirmClear("done") },
            { label: t("clearAll"), run: () => setConfirmClear("all"), destructive: true },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => {
                setMenuOpen(false);
                a.run();
              }}
              className={cn("w-full border-b border-line px-5 py-4 text-left text-[16px] last:border-0", a.destructive && "text-accent")}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirmClear)}
        title={confirmClear === "all" ? t("clearAllConfirm") : t("clearDoneConfirm", { count: items.filter((i) => i.checked).length })}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onClose={() => setConfirmClear(null)}
        onConfirm={() => {
          remove.mutate((confirmClear === "all" ? items : items.filter((i) => i.checked)).map((i) => i.id));
        }}
      />

      <EditItemSheet
        item={editing}
        member={editing?.addedBy ? members.get(editing.addedBy) : undefined}
        onClose={() => setEditing(null)}
        onSave={(patch) => editing && update.mutate({ id: editing.id, patch })}
        onDelete={() => editing && remove.mutate([editing.id])}
      />
    </div>
  );
}
