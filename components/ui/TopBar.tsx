"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function TopBar({
  title,
  back,
  right,
  className,
  transparent,
}: {
  title?: ReactNode;
  back?: boolean | string;
  right?: ReactNode;
  className?: string;
  transparent?: boolean;
}) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "safe-top sticky top-0 z-30",
        transparent ? "bg-transparent" : "border-b border-transparent bg-paper/95 backdrop-blur",
        className,
      )}
    >
      <div className="relative flex h-12 items-center justify-between px-2">
        <div className="flex min-w-10 items-center">
          {back && (
            <button
              aria-label="Back"
              onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
              className="flex size-10 items-center justify-center rounded-full hover:bg-wash"
            >
              <ChevronLeft className="size-7" strokeWidth={1.6} />
            </button>
          )}
        </div>
        {title && (
          <h1 className="pointer-events-none absolute inset-x-16 truncate text-center text-[17px] font-semibold">
            {title}
          </h1>
        )}
        <div className="flex min-w-10 items-center justify-end gap-1">{right}</div>
      </div>
    </header>
  );
}
