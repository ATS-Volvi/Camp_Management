import { CheckCircle2, BedDouble, UtensilsCrossed } from "lucide-react";
import { EXCEL_STANDARD_RATES } from "@/lib/excelRates";

export default function ExcelRateBanner() {
  const tiers = Object.values(EXCEL_STANDARD_RATES);

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm p-3.5 shadow-sm space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-foreground font-sans">
            Excel Mandays Rate Schedule Active
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline font-sans">
            — Company standard Accommodation &amp; Catering rates applied
          </span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/50 font-sans">
          Standard Tariff (SAR / day)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-sans">
        {tiers.map((t) => (
          <div
            key={t.roomType}
            className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/90 px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-1 border-b border-border/40 pb-1 mb-1.5">
              <span className="text-xs font-bold text-foreground tracking-wide">
                {t.roomType}
              </span>
              <span className="text-xs font-bold text-primary tabular-nums">
                SAR {t.combinedRate}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300" title="Room Accommodation Rate">
                <BedDouble className="h-3 w-3 text-blue-500/80" />
                <span>{t.accommodationRate}</span>
              </span>
              <span className="text-muted-foreground/40 font-light">+</span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300" title="Food / Catering Rate">
                <UtensilsCrossed className="h-3 w-3 text-orange-500/80" />
                <span>{t.cateringRate}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

