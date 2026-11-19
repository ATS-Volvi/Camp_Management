import React from "react";
import { ComputedIngredientStatus } from "@/data/pantryCommandData";
import { X, Building2, Clock, AlertTriangle, CheckCircle2, ShoppingCart, Calendar, Flame, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IngredientDetailCardProps {
  ingredient: ComputedIngredientStatus;
  onClose: () => void;
}

export default function IngredientDetailCard({ ingredient, onClose }: IngredientDetailCardProps) {
  const isRed = ingredient.status === "red";
  const isAmber = ingredient.status === "amber";

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-lg space-y-4 text-foreground animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <span className="text-3xl p-2 rounded-xl bg-muted/50 border border-border">
            {ingredient.item.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">{ingredient.item.name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase ${
                  isRed
                    ? "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/15"
                    : isAmber
                    ? "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/15"
                    : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15"
                }`}
              >
                {isRed ? "Buy Urgently" : isAmber ? "Running Low" : "Plenty"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ingredient.item.category} · {ingredient.item.storageType}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Close Card"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Hero Stock vs Threshold Metric */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={`p-3 rounded-xl border text-center ${
            isRed
              ? "border-rose-500/40 bg-rose-500/10"
              : isAmber
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-emerald-500/40 bg-emerald-500/10"
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Food Remaining
          </span>
          <span
            className={`text-2xl font-black block mt-0.5 font-mono ${
              isRed
                ? "text-rose-600 dark:text-rose-400"
                : isAmber
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {ingredient.daysOfCoverLeft} Days
          </span>
          <span className="text-[10px] text-muted-foreground">
            {ingredient.remainingStock} {ingredient.item.unit} in kitchen
          </span>
        </div>

        <div className="p-3 rounded-xl border border-border bg-muted/30 text-center">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Safety Line
          </span>
          <span className="text-2xl font-black text-primary block mt-0.5 font-mono">
            {ingredient.effectiveThreshold} Days
          </span>
          <span className="text-[10px] text-muted-foreground">
            Takes {ingredient.item.leadTimeDays}d to deliver
          </span>
        </div>
      </div>

      {/* Daily Usage & Run-out Forecast */}
      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-amber-500" /> Daily Kitchen Usage:
          </span>
          <span className="font-bold font-mono text-foreground">
            {ingredient.effectiveDailyUsage} {ingredient.item.unit} / day
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-rose-500" /> Runs Out In:
          </span>
          <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
            {ingredient.urgencyLabel}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" /> Stockout Date:
          </span>
          <span className="font-medium text-foreground">
            {ingredient.exhaustionDateStr}
          </span>
        </div>
      </div>

      {/* Supplier & Reorder Calculation */}
      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Delivery Supplier:</span>
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {ingredient.item.supplierName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Unit Price:</span>
          <span className="font-mono text-foreground">
            SAR {ingredient.item.unitPriceSAR.toFixed(2)} per {ingredient.item.unit}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Recommended Order:</span>
          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {ingredient.suggestedReorderQty} {ingredient.item.unit}
          </span>
        </div>

        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Estimated Reorder Cost:</span>
          <span className="font-bold text-primary text-sm font-mono">
            SAR {ingredient.reorderCostSAR.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Close Action Button */}
      <Button
        onClick={onClose}
        variant="outline"
        size="sm"
        className="w-full text-xs"
      >
        Close Details
      </Button>
    </div>
  );
}
