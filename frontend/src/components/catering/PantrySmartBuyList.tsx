import React, { useState } from "react";
import { SupplierOrderGroup } from "@/data/pantryCommandData";
import { ShoppingCart, CheckCircle2, Send, FileSpreadsheet, Sparkles, Building2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface PantrySmartBuyListProps {
  supplierGroups: SupplierOrderGroup[];
  totalSAR: number;
}

export default function PantrySmartBuyList({ supplierGroups, totalSAR }: PantrySmartBuyListProps) {
  const [purchaseSent, setPurchaseSent] = useState(false);
  const [generatedPoId, setGeneratedPoId] = useState<string>("");

  const handleSendPurchase = () => {
    const poNumber = `PO-${new Date().getFullYear()}-ARM-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedPoId(poNumber);
    setPurchaseSent(true);

    toast({
      title: "Purchase Order Dispatched!",
      description: `Dispatched ${poNumber} to ${supplierGroups.length} suppliers. Total SAR ${totalSAR.toLocaleString()}.`,
    });
  };

  const totalItemsCount = supplierGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4 md:p-6 shadow-2xl backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-cyan-400" />
            <span>Smart Reorder & Buy List</span>
            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300">
              Auto-Aggregated
            </Badge>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-grouped by approved camp suppliers to restore 12 days safety cover buffer.
          </p>
        </div>

        {/* Action Button */}
        <div>
          {purchaseSent ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold animate-in zoom-in duration-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{generatedPoId} DISPATCHED</span>
            </div>
          ) : (
            <Button
              onClick={handleSendPurchase}
              disabled={supplierGroups.length === 0}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              <Send className="h-3.5 w-3.5" />
              Send to Purchase ({totalItemsCount} Items)
            </Button>
          )}
        </div>
      </div>

      {/* Supplier Groups */}
      {supplierGroups.length === 0 ? (
        <div className="text-center py-8 text-slate-400 font-mono text-xs">
          <Sparkles className="h-8 w-8 mx-auto text-emerald-400 mb-2 opacity-80" />
          All ingredient stock is currently above safety threshold limits.
        </div>
      ) : (
        <div className="space-y-3.5">
          {supplierGroups.map((group) => (
            <div
              key={group.supplierName}
              className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 hover:border-white/20 transition-all space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-bold text-white text-sm">{group.supplierName}</span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3 text-cyan-400" />
                    Lead Time: {group.leadTimeDays}d
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400 text-xs">Subtotal:</span>
                  <span className="text-sm font-bold text-cyan-300">
                    SAR {group.totalSAR.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-white/5 border-t border-white/5 pt-2">
                {group.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="py-1.5 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          it.urgency === "critical"
                            ? "bg-rose-500 shadow-[0_0_6px_#ef4444]"
                            : "bg-amber-500 shadow-[0_0_6px_#f59e0b]"
                        }`}
                      />
                      <span className="text-slate-200">{it.name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                      <span>
                        Qty: <strong className="text-white">{it.suggestedQty} {it.unit}</strong>
                      </span>
                      <span>@ SAR {it.unitPriceSAR.toFixed(2)}</span>
                      <span className="text-white font-bold min-w-[70px] text-right">
                        SAR {it.subtotalSAR.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Grand Total Footer */}
          <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
            <div className="text-xs text-slate-300">
              <span>Grand Reorder Estimate: </span>
              <strong className="text-white">{totalItemsCount} line items</strong> across{" "}
              <strong className="text-white">{supplierGroups.length} vendors</strong>
            </div>

            <div className="text-base font-bold text-cyan-400 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-normal">ESTIMATED TOTAL:</span>
              <span>SAR {totalSAR.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
