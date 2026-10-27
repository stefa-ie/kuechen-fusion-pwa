"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { TopBar } from "@/components/ui/TopBar";

const PROPOSALS = [
  { id: "kf-circle", wide: false },
  { id: "kf-tile", wide: false },
  { id: "kf-wordmark", wide: true },
  { id: "kf-plate", wide: false },
] as const;

export default function BrandingPage() {
  const t = useTranslations("branding");

  return (
    <div className="pb-16">
      <TopBar back title={t("title")} />
      <p className="px-4 text-[15px] leading-relaxed text-ink-soft">{t("intro")}</p>

      <div className="mt-6 space-y-10">
        {PROPOSALS.map((p, i) => (
          <section key={p.id} className="px-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-[22px]">
                {i + 1}. {t(`${p.id}.name`)}
              </h2>
              <span className="flex gap-3 text-[13px]">
                <a href={`/branding/${p.id}.svg`} download className="flex items-center gap-1 underline underline-offset-2">
                  <Download className="size-3.5" />
                  SVG
                </a>
                <a href={`/branding/${p.id}.png`} download className="underline underline-offset-2">
                  PNG
                </a>
              </span>
            </div>
            <p className="mt-1 text-[14px] text-muted">{t(`${p.id}.body`)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className={`flex items-center justify-center rounded-xl border border-line bg-paper p-6 ${p.wide ? "col-span-2" : ""}`}>
                <img src={`/branding/${p.id}.svg`} alt={t(`${p.id}.name`)} className={p.wide ? "w-full" : "size-40"} />
              </div>
              {!p.wide && (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-wash p-6">
                  <div className="flex items-end gap-4">
                    <img src={`/branding/${p.id}.svg`} alt="" className="size-16 rounded-[16px]" />
                    <img src={`/branding/${p.id}.svg`} alt="" className="size-10 rounded-[10px]" />
                    <img src={`/branding/${p.id}.svg`} alt="" className="size-6 rounded-[5px]" />
                  </div>
                  <span className="text-[12px] text-muted">{t("sizes")}</span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 px-4">
        <h2 className="kicker">{t("homeScreen")}</h2>
        <div className="mt-4 rounded-[28px] bg-[linear-gradient(160deg,#d9d6cf,#a9a59c)] p-6">
          <div className="grid grid-cols-4 gap-y-4">
            {["icon-512.png", "maskable-512.png"].map((icon, i) => (
              <div key={icon} className="flex flex-col items-center gap-1">
                <img
                  src={`/icons/${icon}`}
                  alt=""
                  className={i === 0 ? "size-14 rounded-[14px] shadow" : "size-14 rounded-full shadow"}
                />
                <span className="text-[11px] text-white drop-shadow">{i === 0 ? "iOS" : "Android"}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[13px] text-muted">{t("regenerate")}</p>
      </section>
    </div>
  );
}
