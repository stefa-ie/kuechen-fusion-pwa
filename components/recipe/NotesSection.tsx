"use client";

import { NotebookPen, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useHouseholdId, useNotes } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";

export function NotesSection({ recipeId }: { recipeId: string }) {
  const t = useTranslations("notes");
  const format = useFormatter();
  const store = useStore();
  const hid = useHouseholdId();
  const invalidate = useInvalidate();
  const { data: notes = [] } = useNotes(recipeId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <section className="mx-4 border-t border-line pt-5">
      <h3 className="flex items-center gap-2 text-[16px] font-semibold">
        <NotebookPen className="size-4" />
        {t("title")}
      </h3>
      {notes.length === 0 ? (
        <p className="mt-2 text-[15px] text-faint">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-wash px-4 py-3">
              <p className="text-[15px] whitespace-pre-wrap">{n.body}</p>
              <div className="mt-2 flex items-center justify-between text-[13px] text-muted">
                <span>{format.relativeTime(new Date(n.createdAt))}</span>
                <button
                  aria-label={t("delete")}
                  onClick={async () => {
                    await store.deleteNote(n.id);
                    invalidate("notes");
                  }}
                  className="rounded-full p-1 hover:bg-sand"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        {t("add")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("add")}>
        <div className="flex flex-col gap-3 px-4 pb-4">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder={t("placeholder")}
            className="w-full resize-none rounded-lg p-1 text-[16px] outline-none placeholder:text-faint"
          />
          <p className="text-center text-[13px] text-muted">{t("private")}</p>
          <Button
            disabled={!draft.trim()}
            onClick={async () => {
              if (!hid) return;
              await store.addNote(hid, recipeId, draft.trim());
              invalidate("notes");
              setDraft("");
              setOpen(false);
            }}
          >
            {t("save")}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
