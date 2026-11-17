import React, { useState } from "react";
import { FieldDefinition } from "@/lib/dynamicReports/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GripVertical, Plus, Search, Database, Layers, ChevronLeft, ChevronRight } from "lucide-react";

interface FieldCatalogPaneProps {
  fields: FieldDefinition[];
  onAddField: (fieldId: string, targetZone: "rows" | "columns" | "values" | "filters") => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function FieldCatalogPane({
  fields,
  onAddField,
  collapsed = false,
  onToggleCollapse,
}: FieldCatalogPaneProps) {
  const [search, setSearch] = useState("");

  if (collapsed) {
    return (
      <div className="bg-card border border-border rounded-xl p-2 flex flex-col items-center gap-3 shadow-xs w-11 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Expand Fields Pane"
        >
          <ChevronRight size={15} />
        </Button>
        <div className="writing-vertical text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-2 select-none flex items-center gap-1.5">
          <Database size={11} className="text-primary" />
          <span>Fields ({fields.length})</span>
        </div>
      </div>
    );
  }

  const filteredFields = fields.filter(
    (f) =>
      f.label.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase())
  );

  const dimensions = filteredFields.filter((f) => f.category === "dimension");
  const measures = filteredFields.filter((f) => f.category === "measure");

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData("text/plain", fieldId);
    e.dataTransfer.setData("application/json", JSON.stringify({ fieldId }));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Database size={14} className="text-[#0c2340] dark:text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Fields & Measures
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {fields.length} available
          </span>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground ml-0.5"
              title="Collapse Pane"
            >
              <ChevronLeft size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Field Search Bar */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 pl-7 text-xs bg-muted/40 border-border/80 focus-visible:ring-1"
        />
      </div>

      {/* Dimensions Group */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
            Dimensions
          </span>
          <span className="font-mono text-[10px]">{dimensions.length}</span>
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
          {dimensions.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              className="group flex items-center justify-between px-2 py-1 rounded-md border border-border/60 bg-background hover:bg-blue-50/40 hover:border-blue-400 dark:hover:bg-blue-950/20 cursor-grab active:cursor-grabbing transition-all text-xs select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GripVertical size={12} className="text-muted-foreground/40 group-hover:text-foreground shrink-0" />
                <span className="inline-flex items-center justify-center w-5 h-4 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                  Aa
                </span>
                <span className="truncate font-medium text-foreground text-xs">{field.label}</span>
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
      <div className="space-y-1.5 pt-2 border-t border-border">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            Measures (Calculations)
          </span>
          <span className="font-mono text-[10px]">{measures.length}</span>
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
          {measures.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              className="group flex items-center justify-between px-2 py-1 rounded-md border border-border/60 bg-background hover:bg-amber-50/40 hover:border-amber-400 dark:hover:bg-amber-950/20 cursor-grab active:cursor-grabbing transition-all text-xs select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GripVertical size={12} className="text-muted-foreground/40 group-hover:text-foreground shrink-0" />
                <span className="inline-flex items-center justify-center w-5 h-4 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                  ∑
                </span>
                <span className="truncate font-medium text-foreground text-xs">{field.label}</span>
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
