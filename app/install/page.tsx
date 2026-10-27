"use client";

import { Check, Copy, Download, EllipsisVertical, PlusSquare, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/ui/TopBar";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span className="font-serif text-[26px] leading-none">{n}</span>
      <span className="flex-1 pt-0.5 text-[15px] leading-snug">{children}</span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-wash">{icon}</span>
    </li>
  );
}

export default function InstallPage() {
  const t = useTranslations("install");
  const [platform, setPlatform] = useState<Platform>("ios");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- browser-only values */
    setPlatform(detectPlatform());
    setLink(window.location.origin);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const shareLink = async () => {
    if (navigator.share) await navigator.share({ title: "Küchen Fusion", text: t("shareText"), url: link }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(link);
      toast(t("copied"));
    }
  };

  return (
    <div className="pb-10">
      <TopBar back title={t("title")} />
      <section className="flex flex-col items-center px-6 pt-4 text-center">
        <img src="/icons/icon-192.png" alt="" className="size-24 rounded-[22px] border border-line" />
        <h1 className="mt-5 font-serif text-[28px] leading-tight">{t("headline")}</h1>
        <p className="mt-2 max-w-sm text-[15px] text-ink-soft">{t("body")}</p>
      </section>

      {installed ? (
        <div className="mx-4 mt-8 flex items-center gap-3 rounded-xl bg-wash p-4 text-[15px]">
          <Check className="size-5" />
          {t("installed")}
        </div>
      ) : (
        <>
          {deferred && (
            <div className="px-4 pt-8">
              <Button
                variant="solid"
                size="lg"
                className="w-full"
                onClick={async () => {
                  await deferred.prompt();
                  const choice = await deferred.userChoice;
                  if (choice.outcome === "accepted") setInstalled(true);
                  setDeferred(null);
                }}
              >
                <Download className="size-5" />
                {t("installNow")}
              </Button>
            </div>
          )}

          <div className="mx-4 mt-8 grid grid-cols-3 gap-1 rounded-full bg-wash p-1">
            {(["ios", "android", "desktop"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn("h-9 rounded-full text-[14px] font-medium", platform === p ? "bg-paper shadow-sm" : "text-muted")}
              >
                {t(`platform.${p}`)}
              </button>
            ))}
          </div>

          <ol className="mx-4 mt-6 space-y-5">
            {platform === "ios" && (
              <>
                <Step n={1} icon={<span className="text-[13px] font-semibold">Safari</span>}>
                  {t("ios1")}
                </Step>
                <Step n={2} icon={<Share className="size-4" />}>
                  {t("ios2")}
                </Step>
                <Step n={3} icon={<PlusSquare className="size-4" />}>
                  {t("ios3")}
                </Step>
              </>
            )}
            {platform === "android" && (
              <>
                <Step n={1} icon={<span className="text-[13px] font-semibold">Chrome</span>}>
                  {t("android1")}
                </Step>
                <Step n={2} icon={<EllipsisVertical className="size-4" />}>
                  {t("android2")}
                </Step>
                <Step n={3} icon={<Download className="size-4" />}>
                  {t("android3")}
                </Step>
              </>
            )}
            {platform === "desktop" && (
              <>
                <Step n={1} icon={<span className="text-[13px] font-semibold">Chrome</span>}>
                  {t("desktop1")}
                </Step>
                <Step n={2} icon={<Download className="size-4" />}>
                  {t("desktop2")}
                </Step>
              </>
            )}
          </ol>
          <p className="mx-4 mt-6 text-[13px] leading-snug text-muted">{t("shareHint")}</p>
        </>
      )}

      <div className="mx-4 mt-8 rounded-xl border border-line p-4">
        <div className="kicker text-[12px] text-muted">{t("linkTitle")}</div>
        <div className="mt-2 truncate font-mono text-[14px]">{link}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              toast(t("copied"));
            }}
          >
            <Copy className="size-4" />
            {t("copy")}
          </Button>
          <Button variant="solid" onClick={shareLink}>
            <Share className="size-4" />
            {t("share")}
          </Button>
        </div>
      </div>
    </div>
  );
}
