"use client";

import { Bookmark, LayoutGrid, Search, ShoppingBasket, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useTimers } from "@/lib/timers/store";

const TABS = [
  { href: "/", key: "browse", icon: LayoutGrid, match: (p: string) => p === "/" },
  { href: "/box", key: "box", icon: Bookmark, match: (p: string) => p.startsWith("/box") },
  { href: "/grocery", key: "grocery", icon: ShoppingBasket, match: (p: string) => p.startsWith("/grocery") },
  { href: "/timers", key: "timers", icon: Timer, match: (p: string) => p.startsWith("/timers") },
  { href: "/search", key: "search", icon: Search, match: (p: string) => p.startsWith("/search") },
] as const;

const HIDDEN_ON = [/^\/branding/, /^\/import/, /^\/recipe\/new/, /^\/recipe\/[^/]+\/edit/];

export function TabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const runningTimers = useTimers((s) => s.timers.filter((x) => x.status === "running").length);

  if (HIDDEN_ON.some((re) => re.test(pathname))) return null;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto grid h-[58px] max-w-xl grid-cols-5">
        {TABS.map(({ href, key, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[11px]",
                active ? "text-ink" : "text-faint",
              )}
            >
              <Icon
                className="size-[22px]"
                strokeWidth={active ? 2 : 1.5}
                fill={active && key === "box" ? "currentColor" : "none"}
              />
              <span className={active ? "font-medium" : undefined}>{t(key)}</span>
              {key === "timers" && runningTimers > 0 && (
                <span className="absolute top-1.5 left-[calc(50%+6px)] flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-paper">
                  {runningTimers}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
