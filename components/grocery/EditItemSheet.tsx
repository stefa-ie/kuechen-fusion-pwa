"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { CATEGORY_ORDER } from "@/lib/grocery/categorize";
import { parseNumber } from "@/lib/units";
import type { GroceryItem, Member } from "@/lib/types";

const field = "h-11 w-full rounded-lg border border-line bg-paper px-3 text-[16px] outline-none focus:border-ink";

export function EditItemSheet({
  item,
  member,
  onClose,
  onSave,
  onDelete,
}: {
  item: GroceryItem | null;
  member?: Member;
  onClose: () => void;
  onSave: (patch: Partial<GroceryItem>) => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={Boolean(item)} onClose={onClose}>
      {item && <EditForm key={item.id} item={item} member={member} onClose={onClose} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function EditForm({
  item,
  member,
  onClose,
  onSave,
  onDelete,
}: {
  item: GroceryItem;
  member?: Member;
  onClose: () => void;
  onSave: (patch: Partial<GroceryItem>) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("grocery");
  const tc = useTranslations("common");
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty != null ? String(item.qty) : "");
  const [unit, setUnit] = useState(item.unit ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [category, setCategory] = useState(item.category);

  return (
    <form
      className="space-y-3 px-4 pb-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
          name: name.trim(),
          qty: qty.trim() ? parseNumber(qty) : null,
          unit: unit.trim() || null,
          note: note.trim() || null,
          category,
        });
        onClose();
      }}
    >
      <h3 className="pt-1 font-serif text-[22px]">{t("editItem")}</h3>
      <label className="block">
        <span className="kicker mb-1.5 block">{t("name")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="kicker mb-1.5 block">{t("qty")}</span>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className={field} />
        </label>
        <label className="block">
          <span className="kicker mb-1.5 block">{t("unit")}</span>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, ml, EL…" className={field} />
        </label>
      </div>
      <label className="block">
        <span className="kicker mb-1.5 block">{t("note")}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </label>
      <label className="block">
        <span className="kicker mb-1.5 block">{t("category")}</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as GroceryItem["category"])} className={field}>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {t(`categories.${c}`)}
            </option>
          ))}
        </select>
      </label>
      {(item.recipeTitle || member) && (
        <p className="text-[13px] text-muted">
          {item.recipeTitle && t("fromRecipe", { title: item.recipeTitle })}
          {item.recipeTitle && member && " · "}
          {member && t("addedBy", { name: member.displayName })}
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          aria-label={tc("delete")}
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="text-accent!"
        >
          <Trash2 className="size-4" />
          {tc("delete")}
        </Button>
        <Button type="submit" variant="solid" className="flex-1">
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
