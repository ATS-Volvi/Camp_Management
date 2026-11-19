import React from "react";
import { ComputedIngredientStatus } from "@/data/pantryCommandData";
import { X, Building2, Clock, AlertTriangle, CheckCircle2, DollarSign, Package, Calendar, Flame } from "lucide-react";
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
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-4 md:p-5 shadow-2xl backdrop-blur-2xl space-y-4 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-white/10">
            {ingredient.item.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">{ingredient.item.name}</h3>
              <Badge
                variant="outline"
                className={`text-[9px] font-mono uppercase font-bold ${
                  isRed
                    ? "border-rose-500/40 text-rose-300 bg-rose-500/20"
                    : isAmber
                    ? "border-amber-500/40 text-amber-300 bg-amber-500/20"
                    : "border-emerald-500/40 text-emerald-300 bg-emerald-500/20"
                }`}
              >
                {ingredient.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {ingredient.item.category} · {ingredient.item.storageType}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Hero Stock vs Threshold Metric */}
      <div className="grid grid-cols-2 gap-3 font-mono">
        <div
          className={`p-3 rounded-xl border text-center ${
            isRed
              ? "border-rose-500/40 bg-rose-950/20"
              : isAmber
              ? "border-amber-500/40 bg-amber-950/20"
              : "border-emerald-500/40 bg-emerald-950/20"
          }`}
        >
          <span className="text-[10px] text-slate-400 block">DAYS OF COVER</span>
          <span
            className={`text-2xl font-black block mt-0.5 ${
              isRed ? "text-rose-400" : isAmber ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {ingredient.daysOfCoverLeft}d
          </span>
          <span className="text-[9px] text-slate-500">
            {ingredient.remainingStock} {ingredient.item.unit} left
          </span>
        </div>

        <div className="p-3 rounded-xl border border-white/10 bg-slate-900/60 text-center">
          <span className="text-[10px] text-slate-400 block">SAFETY THRESHOLD</span>
          <span className="text-2xl font-black text-cyan-300 block mt-0.5">
            {ingredient.effectiveThreshold}d
          </span>
          <span className="text-[9px] text-slate-500">
            Lead time: {ingredient.item.leadTimeDays}d
          </span>
        </div>
      </div>

      {/* Burn Rate & Run-out Countdown */}
      <div className="p-3 rounded-xl border border-white/10 bg-slate-900/40 space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> Daily Burn Rate:
          </span>
          <span className="font-bold text-white">
            {ingredient.effectiveDailyUsage} {ingredient.item.unit} / day
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="h-3.5 w-3.5 text-rose-400" /> Stockout Forecast:
          </span>
          <span className="font-bold text-rose-400">
            {ingredient.urgencyLabel}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-cyan-400" /> Exhaustion Date:
          </span>
          <span className="text-cyan-300">
            {ingredient.exhaustionDateStr}
          </span>
        </div>
      </div>

      {/* Procurement & Supplier Specs */}
      <div className="p-3 rounded-xl border border-white/10 bg-slate-900/40 space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Primary Supplier:</span>
          <span className="font-bold text-white flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
            {ingredient.item.supplierName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Unit Price:</span>
          <span className="text-slate-200">
            SAR {ingredient.item.unitPriceSAR.toFixed(2)} / {ingredient.item.unit}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Suggested Reorder:</span>
          <span className="font-bold text-emerald-400">
            {ingredient.suggestedReorderQty} {ingredient.item.unit}
          </span>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-400">Est. Reorder Cost:</span>
          <span className="font-bold text-cyan-300 text-sm">
            SAR {ingredient.reorderCostSAR.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Close Action */}
      <Button
        onClick={onClose}
        variant="outline"
        size="sm"
        className="w-full text-xs bg-slate-900 border-white/10 hover:bg-slate-800 text-slate-300"
      >
        Close Card
      </Button>
    </div>
  );
}
