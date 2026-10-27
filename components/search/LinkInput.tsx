"use client";

import { ClipboardPaste, Link2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { hostOf } from "@/lib/recipe-utils";

export function isUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)\S+\.\S+/i.test(value.trim()) || /https?:\/\/\S+/i.test(value);
}

export function normaliseUrl(value: string): string {
  const m = value.match(/https?:\/\/\S+/i);
  if (m) return m[0];
  return `https://${value.trim()}`;
}

/** Search field that doubles as a recipe-link importer. */
export function LinkInput({
  value,
  onChange,
  autoFocus,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const url = isUrl(value) ? normaliseUrl(value) : null;

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const importUrl = (u: string) => router.push(`/import?url=${encodeURIComponent(u)}`);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      onChange(text.trim());
      if (isUrl(text)) importUrl(normaliseUrl(text));
    } catch {
      ref.current?.focus();
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 px-3">
        <form
          className="flex h-10 flex-1 items-center gap-2 rounded-lg bg-wash px-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (url) importUrl(url);
            else ref.current?.blur();
          }}
        >
          {url ? <Link2 className="size-4 shrink-0 text-muted" /> : <Search className="size-4 shrink-0 text-muted" />}
          <input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("placeholder")}
            enterKeyHint={url ? "go" : "search"}
            inputMode="search"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
          />
          {value ? (
            <button type="button" aria-label={t("clear")} onClick={() => onChange("")} className="rounded-full bg-faint p-0.5 text-paper">
              <X className="size-3" strokeWidth={3} />
            </button>
          ) : (
            <button type="button" aria-label={t("paste")} onClick={paste} className="text-muted">
              <ClipboardPaste className="size-4" />
            </button>
          )}
        </form>
        {onCancel && (
          <button onClick={onCancel} className="text-[16px]">
            {t("cancel")}
          </button>
        )}
      </div>
      {url && (
        <button
          onClick={() => importUrl(url)}
          className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl border border-ink bg-ink px-4 py-3.5 text-left text-paper"
        >
          <Link2 className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{t("importFrom")}</span>
            <span className="block truncate text-[13px] text-paper/70">{hostOf(url) ?? url}</span>
          </span>
          <span className="text-[14px] font-semibold">{t("importCta")}</span>
        </button>
      )}
    </div>
  );
}
