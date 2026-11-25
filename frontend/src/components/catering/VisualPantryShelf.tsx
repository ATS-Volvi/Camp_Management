import { useState, useMemo } from "react";
import {
  Package, AlertTriangle, CheckCircle2, ChevronRight,
  TrendingDown, TrendingUp, Sparkles, SlidersHorizontal,
  Plus, Minus, Pencil, Check, X, ShieldAlert, Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VisualPantryShelfProps {
  stock: any[];
  onEditStock: (item: any) => void;
  onQuickSaveStock?: (ingredientId: string, newBalance: number, currentStockRow?: any) => Promise<void>;
  selectedDishIngredients?: any[];
  matchesDishFn?: (itemName?: string | null, recipeName?: string | null) => boolean;
}

// Category Icons & Badges
const categoryMeta: Record<string, { icon: string; color: string; border: string }> = {
  "Rice & Grains": { icon: "🌾", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  "Meat & Poultry": { icon: "🥩", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  "Vegetables": { icon: "🥦", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  "Dairy": { icon: "🧀", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  "Beverages": { icon: "🧃", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  "Spices": { icon: "🌶️", color: "bg-red-500/10 text-red-600 dark:text-red-400", border: "border-red-500/30" },
  "Bakery": { icon: "🍞", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", border: "border-orange-500/30" },
  "default": { icon: "📦", color: "bg-muted text-muted-foreground", border: "border-border" },
};

export default function VisualPantryShelf({
  stock = [],
  onEditStock,
  onQuickSaveStock,
  selectedDishIngredients = [],
  matchesDishFn,
}: VisualPantryShelfProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    stock.forEach((s: any) => {
      if (s.ingredients?.category) set.add(s.ingredients.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [stock]);

  // Filter stock by category
  const filteredStock = useMemo(() => {
    if (activeCategory === "All") return stock;
    return stock.filter((s: any) => s.ingredients?.category === activeCategory);
  }, [stock, activeCategory]);

  const handleStartQuickEdit = (s: any) => {
    setEditingCardId(s.ingredient_id);
    setTempQty(Number(s.balance ?? 0));
  };

  const handleConfirmQuickSave = async (s: any) => {
    if (onQuickSaveStock) {
      setIsSaving(true);
      try {
        await onQuickSaveStock(s.ingredient_id, tempQty, s);
        setEditingCardId(null);
      } finally {
        setIsSaving(false);
      }
    } else {
      onEditStock({
        ...s,
        balance: tempQty,
      });
      setEditingCardId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => {
          const count = cat === "All"
            ? stock.length
            : stock.filter((s: any) => s.ingredients?.category === cat).length;
          const meta = categoryMeta[cat] || categoryMeta.default;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{cat === "All" ? "🗄️" : meta.icon}</span>
              <span>{cat}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeCategory === cat ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual Shelf Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredStock.map((s: any) => {
          const balNum = Number(s.balance ?? 0);
          const minNum = Number(s.min_level ?? s.ingredients?.reorder_level ?? 5);
          const isLow = balNum <= minNum;
          const isCritical = balNum <= 0;
          const cat = s.ingredients?.category || "Miscellaneous";
          const meta = categoryMeta[cat] || categoryMeta.default;
          const isEditing = editingCardId === s.ingredient_id;

          // Dish recipe match
          const matchedRecipeIngredient = selectedDishIngredients.find(ri =>
            matchesDishFn ? matchesDishFn(s.ingredients?.name, ri.name) : false
          );

          // Battery meter levels (0 to 5 bars)
          const ratio = minNum > 0 ? balNum / (minNum * 2) : 1;
          const barsFilled = isCritical ? 0 : Math.min(5, Math.max(1, Math.round(ratio * 5)));

          return (
            <div
              key={s.id || s.ingredient_id}
              className={`group relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden p-4 shadow-sm hover:shadow-md ${
                isCritical
                  ? "bg-rose-500/5 border-rose-500/40 hover:border-rose-500/70"
                  : isLow
                  ? "bg-amber-500/5 border-amber-500/40 hover:border-amber-500/70"
                  : "bg-card border-border/80 hover:border-primary/40"
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${meta.color} ${meta.border}`}>
                    <span>{meta.icon}</span>
                    <span>{cat}</span>
                  </span>

                  {isLow ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                      {isCritical ? "Out of Stock" : "Low Stock"}
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600/90 text-white text-[10px] px-1.5 py-0 h-4 font-semibold">
                      In Stock
                    </Badge>
                  )}
                </div>

                {/* Ingredient Title & Pax Badge */}
                <h4 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">
                  {s.ingredients?.name}
                </h4>

                {matchedRecipeIngredient && (
                  <div className="mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      {matchedRecipeIngredient.qty_per_person} {matchedRecipeIngredient.unit}/pax
                    </span>
                  </div>
                )}

                {/* Big Stock Readout */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
                      Current Stock
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-mono font-black tracking-tight ${
                        isCritical ? "text-rose-600" : isLow ? "text-amber-600" : "text-foreground"
                      }`}>
                        {isEditing ? tempQty.toFixed(1) : balNum.toFixed(1)}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground font-mono">
                        {s.ingredients?.unit}
                      </span>
                    </div>
                  </div>

                  {/* Safety Reorder Floor */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
                      Reorder Min
                    </span>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {minNum} {s.ingredients?.unit}
                    </span>
                  </div>
                </div>

                {/* Visual Battery Stock Meter */}
                <div className="mt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(b => (
                      <div
                        key={b}
                        className={`h-2 flex-1 rounded-xs transition-all ${
                          b <= barsFilled
                            ? isCritical
                              ? "bg-rose-500"
                              : isLow
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono mt-1">
                    <span>Depleted</span>
                    <span>Safety Buffer</span>
                    <span>Surplus</span>
                  </div>
                </div>
              </div>

              {/* Card Footer / Quick Stepper Adjuster */}
              <div className="mt-4 pt-3 border-t border-border/50">
                {isEditing ? (
                  <div className="space-y-2">
                    {/* Stepper row */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTempQty(p => Math.max(0, +(p - 1).toFixed(1)))}
                        className="h-8 w-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center shrink-0 border"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={tempQty}
                        onChange={e => setTempQty(parseFloat(e.target.value) || 0)}
                        className="w-full text-center font-mono font-bold text-sm h-8 border rounded-lg bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setTempQty(p => +(p + 1).toFixed(1))}
                        className="h-8 w-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center shrink-0 border"
                      >
                        +
                      </button>
                    </div>

                    {/* Range Slider */}
                    <input
                      type="range"
                      min="0"
                      max={Math.max(100, Math.ceil(tempQty * 1.5 / 25) * 25, minNum * 3)}
                      step="1"
                      value={tempQty}
                      onChange={e => setTempQty(parseFloat(e.target.value) || 0)}
                      className="w-full h-2 bg-muted rounded appearance-none cursor-pointer accent-primary"
                    />

                    {/* Save / Cancel buttons */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmQuickSave(s)}
                        disabled={isSaving}
                        className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                      >
                        <Check size={12} /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCardId(null)}
                        disabled={isSaving}
                        className="h-7 text-xs px-2 text-muted-foreground"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleStartQuickEdit(s)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <SlidersHorizontal size={11} /> Quick Adjust
                    </button>
                    <button
                      onClick={() => onEditStock(s)}
                      className="text-[11px] font-semibold px-2 py-1 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1"
                    >
                      <Pencil size={11} /> Full Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredStock.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-xs bg-muted/20 border border-dashed rounded-2xl">
          No inventory cards found for this category or filter.
        </div>
      )}
    </div>
  );
}
