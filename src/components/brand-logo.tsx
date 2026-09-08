import { cn } from "@/lib/utils";
import logoAsset from "@/assets/averon-logo.png.asset.json";

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoAsset.url}
        alt="Averon"
        className="h-12 w-auto shrink-0 object-contain"
      />
      {!compact && (
        <span className="block font-display text-base font-extrabold uppercase tracking-[0.14em] text-foreground">
          Averon
        </span>
      )}
    </div>
  );
}
