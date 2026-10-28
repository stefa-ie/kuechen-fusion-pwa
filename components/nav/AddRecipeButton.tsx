"use client";

import { ChevronRight, Link2, PenLine, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useTimers } from "@/lib/timers/store";

function Option({ href, icon, title, hint }: { href: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wash">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
      <ChevronRight className="size-5 text-faint" />
    </Link>
  );
}

export function AddRecipeButton() {
  const t = useTranslations("add");
  const [open, setOpen] = useState(false);
  const hasTimers = useTimers((s) => s.timers.length > 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-[15px] font-semibold text-paper shadow-[0_4px_16px_rgba(0,0,0,0.25)] active:scale-[0.98]",
          hasTimers ? "bottom-[calc(env(safe-area-inset-bottom)+120px)]" : "bottom-[calc(env(safe-area-inset-bottom)+72px)]",
        )}
      >
        <Plus className="size-5" />
        {t("title")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("title")}>
        <div className="pb-3">
          <Option href="/import" icon={<Link2 className="size-5" />} title={t("fromLink")} hint={t("fromLinkHint")} />
          <Option href="/recipe/new" icon={<PenLine className="size-5" />} title={t("newRecipe")} hint={t("newRecipeHint")} />
        </div>
      </Sheet>
    </>
  );
}
