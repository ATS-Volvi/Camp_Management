import React from "react";
import { FieldDefinition } from "@/lib/dynamicReports/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GripVertical, Plus, Hash, Type, Calendar, HelpCircle } from "lucide-react";

interface FieldCatalogPaneProps {
  fields: FieldDefinition[];
  onAddField: (fieldId: string, targetZone: "rows" | "columns" | "values" | "filters") => void;
}

export default function FieldCatalogPane({ fields, onAddField }: FieldCatalogPaneProps) {
  const dimensions = fields.filter((f) => f.category === "dimension");
  const measures = fields.filter((f) => f.category === "measure");

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData("text/plain", fieldId);
    e.dataTransfer.setData("application/json", JSON.stringify({ fieldId }));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const getFieldIcon = (f: FieldDefinition) => {
    if (f.dataType === "number") return <Hash size={13} className="text-emerald-500 shrink-0" />;
    if (f.dataType === "date") return <Calendar size={13} className="text-amber-500 shrink-0" />;
    return <Type size={13} className="text-blue-500 shrink-0" />;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-5 shadow-xs">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Field Palette</span>
          <span className="text-[10px] lowercase font-normal opacity-75">drag or click +</span>
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Drag fields into Rows, Columns, or Values to build custom views.
        </p>
      </div>

      {/* Dimensions Group */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Dimensions ({dimensions.length})</span>
        </div>
        <div className="space-y-1">
          {dimensions.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/70 bg-background hover:bg-muted/50 hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GripVertical size={13} className="text-muted-foreground/60 group-hover:text-foreground shrink-0" />
                {getFieldIcon(field)}
                <span className="truncate font-medium text-foreground">{field.label}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title="Add to zone"
                  >
                    <Plus size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs w-36">
                  <DropdownMenuItem onClick={() => onAddField(field.id, "rows")}>
                    Add to Rows
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddField(field.id, "columns")}>
                    Add to Columns
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddField(field.id, "filters")}>
                    Add to Filters
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddField(field.id, "values")}>
                    Add to Values
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>

      {/* Measures Group */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Measures & Totals ({measures.length})</span>
        </div>
        <div className="space-y-1">
          {measures.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/70 bg-background hover:bg-muted/50 hover:border-emerald-400 cursor-grab active:cursor-grabbing transition-all text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GripVertical size={13} className="text-muted-foreground/60 group-hover:text-foreground shrink-0" />
                {getFieldIcon(field)}
                <span className="truncate font-medium text-foreground">{field.label}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title="Add to zone"
                  >
                    <Plus size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs w-36">
                  <DropdownMenuItem onClick={() => onAddField(field.id, "values")}>
                    Add to Values
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddField(field.id, "rows")}>
                    Add to Rows
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddField(field.id, "columns")}>
                    Add to Columns
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
