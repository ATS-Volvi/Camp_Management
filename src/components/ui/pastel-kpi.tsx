import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PastelTone =
  | "blue" | "pink" | "mint" | "green" | "amber" | "indigo" | "violet" | "rose" | "sky" | "teal";

const tones: Record<PastelTone, { bg: string; ring: string; iconBg: string; icon: string; value: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-950/30",       ring: "ring-blue-100 dark:ring-blue-900/40",     iconBg: "bg-blue-100 dark:bg-blue-900/50",     icon: "text-blue-600 dark:text-blue-300",     value: "text-blue-700 dark:text-blue-200" },
  pink:   { bg: "bg-pink-50 dark:bg-pink-950/30",       ring: "ring-pink-100 dark:ring-pink-900/40",     iconBg: "bg-pink-100 dark:bg-pink-900/50",     icon: "text-pink-600 dark:text-pink-300",     value: "text-pink-700 dark:text-pink-200" },
  mint:   { bg: "bg-emerald-50 dark:bg-emerald-950/30", ring: "ring-emerald-100 dark:ring-emerald-900/40", iconBg: "bg-emerald-100 dark:bg-emerald-900/50", icon: "text-emerald-600 dark:text-emerald-300", value: "text-emerald-700 dark:text-emerald-200" },
  green:  { bg: "bg-green-50 dark:bg-green-950/30",     ring: "ring-green-100 dark:ring-green-900/40",   iconBg: "bg-green-100 dark:bg-green-900/50",   icon: "text-green-600 dark:text-green-300",   value: "text-green-700 dark:text-green-200" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-950/30",     ring: "ring-amber-100 dark:ring-amber-900/40",   iconBg: "bg-amber-100 dark:bg-amber-900/50",   icon: "text-amber-600 dark:text-amber-300",   value: "text-amber-700 dark:text-amber-200" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/30",   ring: "ring-indigo-100 dark:ring-indigo-900/40", iconBg: "bg-indigo-100 dark:bg-indigo-900/50", icon: "text-indigo-600 dark:text-indigo-300", value: "text-indigo-700 dark:text-indigo-200" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/30",   ring: "ring-violet-100 dark:ring-violet-900/40", iconBg: "bg-violet-100 dark:bg-violet-900/50", icon: "text-violet-600 dark:text-violet-300", value: "text-violet-700 dark:text-violet-200" },
  rose:   { bg: "bg-rose-50 dark:bg-rose-950/30",       ring: "ring-rose-100 dark:ring-rose-900/40",     iconBg: "bg-rose-100 dark:bg-rose-900/50",     icon: "text-rose-600 dark:text-rose-300",     value: "text-rose-700 dark:text-rose-200" },
  sky:    { bg: "bg-sky-50 dark:bg-sky-950/30",         ring: "ring-sky-100 dark:ring-sky-900/40",       iconBg: "bg-sky-100 dark:bg-sky-900/50",       icon: "text-sky-600 dark:text-sky-300",       value: "text-sky-700 dark:text-sky-200" },
  teal:   { bg: "bg-teal-50 dark:bg-teal-950/30",       ring: "ring-teal-100 dark:ring-teal-900/40",     iconBg: "bg-teal-100 dark:bg-teal-900/50",     icon: "text-teal-600 dark:text-teal-300",     value: "text-teal-700 dark:text-teal-200" },
};

interface PastelKpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: PastelTone;
  hint?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function PastelKpiCard({
  label, value, icon: Icon, tone = "blue", hint, onClick, className, compact,
}: PastelKpiCardProps) {
  const t = tones[tone];
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl ring-1 transition-all",
        t.bg, t.ring,
        compact ? "p-3" : "p-4",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-muted-foreground font-medium truncate", compact ? "text-[11px]" : "text-xs")}>{label}</p>
          <p className={cn("font-bold mt-1 leading-none", t.value, compact ? "text-2xl" : "text-3xl")}>
            {value}
          </p>
          {hint && <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{hint}</p>}
        </div>
        <div className={cn("rounded-xl flex items-center justify-center shrink-0", t.iconBg, compact ? "w-8 h-8" : "w-10 h-10")}>
          <Icon className={cn(t.icon, compact ? "h-4 w-4" : "h-5 w-5")} />
        </div>
      </div>
    </div>
  );
}
