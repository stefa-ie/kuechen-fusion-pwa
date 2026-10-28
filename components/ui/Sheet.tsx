"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  children,
  title,
  className,
  full,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  className?: string;
  full?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        className="animate-fade-in absolute inset-0 bg-black/35"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className={cn(
          "animate-sheet-up safe-bottom relative flex w-full max-w-xl flex-col rounded-t-2xl bg-paper shadow-2xl",
          full ? "h-[94dvh]" : "max-h-[90dvh]",
          className,
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-9 rounded-full bg-line" />
        </div>
        {title && <div className="px-5 pt-1 pb-3 text-center text-[15px] font-semibold">{title}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
