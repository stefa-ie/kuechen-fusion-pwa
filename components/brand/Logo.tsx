import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="font-fraktur text-[30px] leading-none">KF</span>
      <span className="h-6 w-px bg-ink" />
      <span className="font-serif text-[21px] font-bold tracking-tight">Küchen Fusion</span>
    </span>
  );
}
