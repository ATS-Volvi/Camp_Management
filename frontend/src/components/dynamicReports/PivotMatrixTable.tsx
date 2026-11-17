import React, { useState } from "react";
import { PivotMatrixResult, PivotRowNode, ReportConfig } from "@/lib/dynamicReports/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown, Table2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablePager, usePaged } from "@/components/TablePager";

interface PivotMatrixTableProps {
  matrix: PivotMatrixResult;
  config: ReportConfig;
}

export default function PivotMatrixTable({ matrix, config }: PivotMatrixTableProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<"compact" | "standard">("standard");
  const pagedRows = usePaged(matrix.rows || [], 25);

  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setCollapsedKeys(new Set());
  const collapseAll = () => {
    const allParentKeys = new Set<string>();
    function collect(nodes: PivotRowNode[]) {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          allParentKeys.add(n.key);
          collect(n.children);
        }
      }
    }
    collect(matrix.rows);
    setCollapsedKeys(allParentKeys);
  };

  if (!matrix.rows || matrix.rows.length === 0 || matrix.columnHeaders.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Table2 size={24} />
        </div>
        <h3 className="text-base font-bold text-foreground">No Matrix Data to Display</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Drag dimension fields into <strong>Rows</strong> and at least one metric into <strong>Values</strong> above to generate your dynamic pivot report.
        </p>
      </div>
    );
  }

  const renderRow = (node: PivotRowNode): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedKeys.has(node.key);
    const indentPx = node.level * 20;

    const cellPad = density === "compact" ? "py-1.5 px-2.5 text-[11px]" : "py-2.5 px-3 text-xs";

    return (
      <React.Fragment key={node.key}>
        <TableRow
          className={`hover:bg-muted/40 transition-colors ${
            node.isSubtotal ? "bg-muted/20 font-semibold" : ""
          }`}
        >
          {/* Row Dimension Label */}
          <TableCell className={`font-medium border-r border-border ${cellPad}`}>
            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${indentPx}px` }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleCollapse(node.key)}
                  className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
              ) : (
                <span className="w-5 shrink-0 inline-block text-center text-muted-foreground/40">•</span>
              )}
              <span className="truncate">{node.value}</span>
            </div>
          </TableCell>

          {/* Matrix Cells */}
          {matrix.columnHeaders.map((cKey) => {
            const cell = node.cells[cKey];
            return (
              <TableCell key={cKey} className={`text-right font-mono ${cellPad}`}>
                {cell ? cell.formatted : "0"}
              </TableCell>
            );
          })}

          {/* Row Total */}
          <TableCell className={`text-right font-mono font-bold bg-muted/30 border-l border-border text-primary ${cellPad}`}>
            {node.rowTotal ? node.rowTotal.formatted : "0"}
          </TableCell>
        </TableRow>

        {/* Children Rows */}
        {hasChildren && !isCollapsed && node.children!.map((child) => renderRow(child))}
      </React.Fragment>
    );
  };

  const headerPad = density === "compact" ? "py-1.5 px-2.5 text-[11px]" : "py-2.5 px-3 text-xs";

  return (
    <div className="space-y-2">
      {/* Table Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-muted-foreground" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Pivot Matrix Report ({matrix.rows.length} Primary Groups)
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 rounded-full bg-muted border border-border">
            Sticky Headers & Totals
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Density Switcher */}
          <div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDensity("compact")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                density === "compact"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compact row density to view more rows at once"
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setDensity("standard")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                density === "standard"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Standard spacious row padding"
            >
              Standard
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          <Button
            size="sm"
            variant="ghost"
            onClick={expandAll}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground font-medium"
          >
            Expand All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={collapseAll}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground font-medium"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Main Table Container with Sticky Header & Sticky Grand Total */}
      <div className="border border-border rounded-xl overflow-auto max-h-[72vh] min-h-[460px] shadow-xs bg-card">
        <Table className="w-full text-xs relative">
          <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-xs border-b border-border shadow-2xs">
            <TableRow className="border-b border-border">
              <TableHead className={`font-bold text-foreground border-r border-border min-w-[200px] bg-muted/95 ${headerPad}`}>
                Group / Category
              </TableHead>
              {matrix.columnHeaders.map((cKey) => (
                <TableHead
                  key={cKey}
                  className={`font-bold text-right text-foreground whitespace-nowrap min-w-[120px] bg-muted/95 ${headerPad}`}
                >
                  {matrix.columnLabels[cKey] || cKey}
                </TableHead>
              ))}
              <TableHead className={`font-bold text-right text-foreground bg-muted border-l border-border min-w-[130px] ${headerPad}`}>
                Total
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {pagedRows.rows.map((rootNode) => renderRow(rootNode))}

            {/* Grand Total Row - Sticky to bottom of viewport table */}
            {config.showGrandTotals && (
              <TableRow className="sticky bottom-0 z-20 bg-[#0c2340] text-white hover:bg-[#122e50] font-bold border-t-2 border-border shadow-md">
                <TableCell className={`uppercase tracking-wider border-r border-slate-700 bg-[#0c2340] ${headerPad}`}>
                  Grand Total
                </TableCell>
                {matrix.columnHeaders.map((cKey) => {
                  const colTotal = matrix.columnTotals[cKey];
                  return (
                    <TableCell key={cKey} className={`text-right font-mono bg-[#0c2340] ${headerPad}`}>
                      {colTotal ? colTotal.formatted : "0"}
                    </TableCell>
                  );
                })}
                <TableCell className={`text-right font-mono bg-[#08182b] border-l border-slate-700 text-orange-400 ${headerPad}`}>
                  {matrix.grandTotal ? matrix.grandTotal.formatted : "0"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePager {...pagedRows} />
      </div>
    </div>
  );
}

