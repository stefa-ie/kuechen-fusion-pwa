import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "outline" | "solid" | "ghost" | "soft";

const VARIANTS: Record<Variant, string> = {
  outline: "border border-ink/25 bg-paper text-ink hover:border-ink active:bg-wash",
  solid: "border border-ink bg-ink text-paper hover:bg-ink-soft active:bg-black",
  ghost: "text-ink hover:bg-wash",
  soft: "bg-wash text-ink hover:bg-sand",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-13 px-6 text-base",
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-wash disabled:opacity-40",
        className,
      )}
    />
  );
}
