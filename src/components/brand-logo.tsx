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
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-brand shadow-glow">
        <img src={logoAsset.url} alt="" className="size-7 object-contain" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-sm font-extrabold uppercase tracking-[0.14em] text-foreground">
            MEC Frio
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Refrigeração
          </span>
        </span>
      )}
    </div>
  );
}
