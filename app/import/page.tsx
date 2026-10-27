"use client";

import { AlertCircle, Check, Link2, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { RecipeEditor } from "@/components/recipe/RecipeEditor";
import { TimeCard } from "@/components/recipe/TimeCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/misc";
import { TopBar } from "@/components/ui/TopBar";
import { useHouseholdId } from "@/lib/data/hooks";
import { useInvalidate, useStore } from "@/lib/data/provider";
import type { ImportResult } from "@/lib/import/types";
import { hostOf } from "@/lib/recipe-utils";
import { toast } from "@/lib/toast";
import type { RecipeDraft } from "@/lib/types";

const STAGES = ["fetching", "reading", "structuring"] as const;

function findUrl(...values: (string | null)[]): string | null {
  for (const v of values) {
    const m = v?.match(/https?:\/\/[^\s"'<>]+/i);
    if (m) return m[0];
  }
  return null;
}

function ImportFlow() {
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const params = useSearchParams();
  const router = useRouter();
  const store = useStore();
  const hid = useHouseholdId();
  const invalidate = useInvalidate();

  // Share Target sends url, text and title; Instagram puts the link into "text".
  const sharedText = params.get("text");
  const url = findUrl(params.get("url"), sharedText, params.get("title"));
  const [pasted, setPasted] = useState(() => (sharedText && !findUrl(sharedText) ? sharedText : ""));
  const [result, setResult] = useState<ImportResult | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  const run = useCallback(
    async (text?: string) => {
      setLoading(true);
      setError(null);
      setStage(0);
      const ticker = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 1800);
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, text: text || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "fetch_failed");
        setResult(data as ImportResult);
        setDraft((data as ImportResult).draft);
      } catch (e) {
        setError(e instanceof Error ? e.message : "fetch_failed");
      } finally {
        clearInterval(ticker);
        setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    if (started.current || (!url && !pasted)) return;
    started.current = true;
    void run(pasted || undefined);
  }, [url, pasted, run]);

  const save = async () => {
    if (!draft || !hid) return;
    setSaving(true);
    try {
      const recipe = await store.createRecipe(hid, draft);
      invalidate("recipes");
      toast(t("saved"));
      router.replace(`/recipe/${recipe.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const showPaste = !loading && (!url || result?.needsText || error);

  return (
    <div className="pb-28">
      <TopBar back title={t("title")} />

      {url && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg bg-wash px-3 py-2.5 text-[14px]">
          <Link2 className="size-4 shrink-0" />
          <span className="truncate">{hostOf(url)}</span>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-6 px-8 py-20">
          <Spinner className="size-8" />
          <ul className="space-y-2 text-[15px]">
            {STAGES.map((s, i) => (
              <li key={s} className={i <= stage ? "text-ink" : "text-faint"}>
                {i < stage ? <Check className="mr-2 inline size-4" /> : <span className="mr-2 inline-block w-4" />}
                {t(`stage.${s}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && !loading && (
        <div className="mx-4 mt-6 flex gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4 text-[15px]">
          <AlertCircle className="size-5 shrink-0 text-accent" />
          <div>
            <div className="font-semibold">{t(`error.${error === "blocked" ? "blocked" : "generic"}`)}</div>
            <div className="mt-1 text-muted">{t("error.hint")}</div>
          </div>
        </div>
      )}

      {result?.needsText && !loading && (
        <div className="mx-4 mt-6 rounded-lg bg-wash p-4 text-[15px]">
          <div className="font-semibold">{t("needsText")}</div>
          {result.caption && <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-muted">{result.caption}</p>}
        </div>
      )}

      {showPaste && (
        <div className="mx-4 mt-6">
          <label className="kicker mb-2 block text-[12px] text-muted">{t("pasteLabel")}</label>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={8}
            placeholder={t("pastePlaceholder")}
            className="w-full rounded-lg border border-line p-3 text-[15px] outline-none focus:border-ink"
          />
          <Button variant="solid" className="mt-3 w-full" disabled={!pasted.trim()} onClick={() => run(pasted)}>
            <Sparkles className="size-4" />
            {t("analyze")}
          </Button>
        </div>
      )}

      {draft && !loading && !result?.needsText && (
        <>
          <div className="mx-4 mt-4 mb-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span className="rounded-full bg-wash px-2.5 py-1">{t(`method.${result?.method ?? "heuristic"}`)}</span>
            {draft.linkedUrl && <span className="rounded-full bg-wash px-2.5 py-1">{t("followedLink", { host: hostOf(draft.linkedUrl) ?? "" })}</span>}
            <span>{t("summary", { ingredients: draft.ingredients.length, steps: draft.steps.length })}</span>
          </div>
          <div className="my-4">
            <TimeCard recipe={draft} />
          </div>
          <RecipeEditor draft={draft} onChange={setDraft} />
        </>
      )}

      {draft && !loading && !result?.needsText && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper">
          <div className="mx-auto flex max-w-xl gap-3 px-4 py-3">
            <Button className="flex-1" onClick={() => router.back()}>
              {tc("cancel")}
            </Button>
            <Button variant="solid" className="flex-[2]" disabled={saving || !draft.title.trim()} onClick={save}>
              {saving ? <Spinner className="size-4 border-paper/30 border-t-paper" /> : t("save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <ImportFlow />
    </Suspense>
  );
}
