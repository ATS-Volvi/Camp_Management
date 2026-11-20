import React, { useState } from "react";
import { SupplierOrderGroup, ComputedDishHealth } from "@/data/pantryCommandData";
import { ShoppingCart, CheckCircle2, Send, Building2, Clock, Sparkles, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface PantrySmartBuyListProps {
  supplierGroups: SupplierOrderGroup[];
  totalSAR: number;
  dishes?: ComputedDishHealth[];
  selectedDishFilter?: string;
}

export default function PantrySmartBuyList({
  supplierGroups,
  totalSAR,
  dishes,
  selectedDishFilter = "all",
}: PantrySmartBuyListProps) {
  const [purchaseSent, setPurchaseSent] = useState(false);
  const [generatedPoId, setGeneratedPoId] = useState<string>("");

  const handleSendPurchase = () => {
    const poNumber = `PO-${new Date().getFullYear()}-ARM-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedPoId(poNumber);
    setPurchaseSent(true);

    toast({
      title: "Purchase Order Dispatched!",
      description: `Dispatched ${poNumber} to ${supplierGroups.length} suppliers. Total: SAR ${totalSAR.toLocaleString()}.`,
    });
  };

  const totalItemsCount = supplierGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 md:p-6 shadow-sm space-y-4 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[#fe932c]" />
            <span>Suggested Reorder List</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold">
              Auto-Grouped by Supplier
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Any ingredient below or near the safety line is automatically added here to restore 12 days of reserve food.
          </p>
        </div>

        {/* Action Button */}
        <div>
          {purchaseSent ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold animate-in zoom-in duration-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{generatedPoId} DISPATCHED</span>
            </div>
          ) : (
            <Button
              onClick={handleSendPurchase}
              disabled={supplierGroups.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-xs transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Send to Purchase ({totalItemsCount} Items)
            </Button>
          )}
        </div>
      </div>

      {/* Supplier Groups */}
      {supplierGroups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          <Sparkles className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-80" />
          All ingredient stock is currently above the 5-day safety line. No urgent purchases needed!
        </div>
      ) : (
        <div className="space-y-3.5">
          {supplierGroups.map((group) => (
            <div
              key={group.supplierName}
              className="rounded-xl border border-border/70 bg-muted/20 p-3.5 hover:border-border transition-all space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-foreground text-sm">{group.supplierName}</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    Delivery time: {group.leadTimeDays} days
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Supplier Total:</span>
                  <span className="text-sm font-bold text-primary font-mono">
                    SAR {group.totalSAR.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-border/40 border-t border-border/40 pt-1.5">
                {group.items.map((it, idx) => {
                  const neededForDishes = dishes
                    ? dishes.filter((d) => d.dish.keyIngredientIds.includes(it.id))
                    : [];
                  const isNeededForSelectedDish =
                    selectedDishFilter && selectedDishFilter !== "all"
                      ? neededForDishes.some((d) => d.dish.id === selectedDishFilter)
                      : false;

                  return (
                    <div
                      key={idx}
                      className={`py-2 px-1.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                        isNeededForSelectedDish
                          ? "bg-[#fe932c]/10 border border-[#fe932c]/30"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              it.urgency === "critical"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                            title={it.urgency === "critical" ? "Urgent buy today" : "Order soon"}
                          />
                          <span className="font-semibold text-foreground">{it.name}</span>
                          {isNeededForSelectedDish && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#fe932c] text-slate-950 font-black uppercase tracking-wider">
                              Needed for Selected Dish
                            </span>
                          )}
                        </div>

                        {neededForDishes.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-4 mt-0.5">
                            <Utensils className="h-2.5 w-2.5 text-[#fe932c] shrink-0" />
                            <span>Needed for:</span>
                            <span className="text-foreground/90 font-medium truncate max-w-[320px]">
                              {neededForDishes.map((d) => d.dish.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 sm:gap-6 text-muted-foreground text-[11px] font-mono ml-4 sm:ml-0">
                        <span>
                          Order: <strong className="text-foreground">{it.suggestedQty} {it.unit}</strong>
                        </span>
                        <span className="hidden sm:inline">@ SAR {it.unitPriceSAR.toFixed(2)}</span>
                        <span className="text-foreground font-bold min-w-[70px] text-right">
                          SAR {it.subtotalSAR.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Grand Total Footer */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              <span>Total Estimated Reorder: </span>
              <strong className="text-foreground">{totalItemsCount} items</strong> across{" "}
              <strong className="text-foreground">{supplierGroups.length} vendors</strong>
            </div>

            <div className="text-base font-bold text-primary flex items-center gap-2 font-mono">
              <span className="text-xs text-muted-foreground font-normal">GRAND TOTAL:</span>
              <span>SAR {totalSAR.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
