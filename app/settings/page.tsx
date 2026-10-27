"use client";

import { Bell, ChevronRight, Cloud, Download, HardDrive, Palette, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Chip } from "@/components/ui/Chip";
import { SectionTitle } from "@/components/ui/misc";
import { TopBar } from "@/components/ui/TopBar";
import { useSession } from "@/lib/data/hooks";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { requestNotificationPermission } from "@/lib/timers/alarm";

function useNotificationPermission() {
  return useSyncExternalStore(
    () => () => {},
    () => ("Notification" in window ? Notification.permission : "unsupported"),
    () => "default",
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const initialPermission = useNotificationPermission();
  const [permission, setPermission] = useState<string | null>(null);
  const notif = permission ?? initialPermission;

  const setLocale = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const links = [
    { href: "/household", icon: Users, label: t("household") },
    { href: "/install", icon: Download, label: t("install") },
    { href: "/branding", icon: Palette, label: t("branding") },
  ];

  return (
    <div className="pb-10">
      <TopBar back="/" title={t("title")} />

      <SectionTitle>{t("language")}</SectionTitle>
      <div className="flex gap-2 px-4">
        <Chip active={locale === "de"} onClick={() => setLocale("de")}>
          Deutsch
        </Chip>
        <Chip active={locale === "en"} onClick={() => setLocale("en")}>
          English
        </Chip>
      </div>

      <SectionTitle>{t("notifications")}</SectionTitle>
      <div className="flex items-start gap-3 px-4">
        <Bell className="mt-0.5 size-5 shrink-0" strokeWidth={1.6} />
        <div className="flex-1">
          <p className="text-[15px]">{t(`notif.${notif === "granted" || notif === "denied" || notif === "unsupported" ? notif : "default"}`)}</p>
          {notif === "default" && (
            <button
              onClick={async () => setPermission(await requestNotificationPermission())}
              className="mt-2 text-[14px] font-semibold underline underline-offset-4"
            >
              {t("enableNotifications")}
            </button>
          )}
          <p className="mt-1 text-[13px] text-muted">{t("notifHint")}</p>
        </div>
      </div>

      <SectionTitle>{t("sync")}</SectionTitle>
      <div className="flex items-start gap-3 px-4">
        {session?.mode === "supabase" ? (
          <Cloud className="mt-0.5 size-5 shrink-0" strokeWidth={1.6} />
        ) : (
          <HardDrive className="mt-0.5 size-5 shrink-0" strokeWidth={1.6} />
        )}
        <p className="text-[15px]">{session?.mode === "supabase" ? t("syncCloud") : t("syncLocal")}</p>
      </div>

      <ul className="mt-8 border-t border-line">
        {links.map(({ href, icon: Icon, label }) => (
          <li key={href} className="border-b border-line">
            <Link href={href} className="flex items-center gap-3 px-4 py-4 text-[16px]">
              <Icon className="size-5" strokeWidth={1.6} />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center font-fraktur text-[22px]">Küchen Fusion</p>
    </div>
  );
}
