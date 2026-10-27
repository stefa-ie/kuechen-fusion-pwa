import { useLocale, useTranslations } from "next-intl";
import { formatMinutes } from "@/lib/duration";
import { totalMinutes } from "@/lib/recipe-utils";
import type { Recipe, RecipeTimes } from "@/lib/types";

const PARTS: (keyof Omit<RecipeTimes, "total">)[] = ["prep", "cook", "bake", "rest"];

export function TimeCard({ recipe }: { recipe: Pick<Recipe, "times"> }) {
  const t = useTranslations("times");
  const locale = useLocale();
  const total = totalMinutes(recipe);
  const parts = PARTS.filter((p) => recipe.times[p]);
  if (!total && !parts.length) return null;

  return (
    <div className="mx-4 rounded-xl border border-line">
      <div className="px-4 py-5 text-center">
        <div className="font-serif text-[30px] leading-none">{total ? formatMinutes(total, locale) : "–"}</div>
        <div className="mt-2 text-[12px] tracking-[0.12em] text-muted uppercase">{t("total")}</div>
      </div>
      {parts.length > 0 && (
        <div className="grid border-t border-line" style={{ gridTemplateColumns: `repeat(${parts.length}, minmax(0, 1fr))` }}>
          {parts.map((p, i) => (
            <div key={p} className={`px-2 py-3 text-center ${i ? "border-l border-line" : ""}`}>
              <div className="text-[15px] font-semibold">{formatMinutes(recipe.times[p], locale)}</div>
              <div className="mt-0.5 text-[11px] tracking-[0.08em] text-muted uppercase">{t(p)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
