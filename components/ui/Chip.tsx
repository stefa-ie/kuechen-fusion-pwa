import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium whitespace-nowrap transition-colors",
        active ? "border-ink bg-ink text-paper" : "border-ink/20 bg-paper text-ink hover:border-ink/60",
        className,
      )}
    />
  );
}
