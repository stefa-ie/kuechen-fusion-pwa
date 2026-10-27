import { cn } from "@/lib/cn";

export function RecipeImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-sand", className)} aria-hidden>
        <span className="font-fraktur text-[42px] text-ink/30">KF</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={cn("object-cover", className)} />;
}
