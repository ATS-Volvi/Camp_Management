import React, { useState } from "react";
import { PivotMatrixResult, PivotRowNode, ReportConfig } from "@/lib/dynamicReports/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown, Table2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PivotMatrixTableProps {
  matrix: PivotMatrixResult;
  config: ReportConfig;
}

export default function PivotMatrixTable({ matrix, config }: PivotMatrixTableProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

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

    return (
      <React.Fragment key={node.key}>
        <TableRow
          className={`hover:bg-muted/40 transition-colors ${
            node.isSubtotal ? "bg-muted/20 font-semibold" : ""
          }`}
        >
          {/* Row Dimension Label */}
          <TableCell className="font-medium text-xs border-r border-border py-2 px-3">
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
              <TableCell key={cKey} className="text-right text-xs font-mono py-2 px-3">
                {cell ? cell.formatted : "0"}
              </TableCell>
            );
          })}

          {/* Row Total */}
          <TableCell className="text-right text-xs font-mono font-bold py-2 px-3 bg-muted/30 border-l border-border text-primary">
            {node.rowTotal ? node.rowTotal.formatted : "0"}
          </TableCell>
        </TableRow>

        {/* Children Rows */}
        {hasChildren && !isCollapsed && node.children!.map((child) => renderRow(child))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-2">
      {/* Table Actions Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pivot Matrix ({matrix.rows.length} Primary Groups)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={expandAll}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
          >
            Expand All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={collapseAll}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="border border-border rounded-xl overflow-x-auto shadow-xs bg-card">
        <Table className="w-full text-xs">
          <TableHeader>
            <TableRow className="bg-muted/60 border-b border-border">
              <TableHead className="font-bold text-xs text-foreground border-r border-border min-w-[200px] py-2.5 px-3">
                Group / Category
              </TableHead>
              {matrix.columnHeaders.map((cKey) => (
                <TableHead
                  key={cKey}
                  className="font-bold text-xs text-right text-foreground py-2.5 px-3 whitespace-nowrap min-w-[120px]"
                >
                  {matrix.columnLabels[cKey] || cKey}
                </TableHead>
              ))}
              <TableHead className="font-bold text-xs text-right text-foreground py-2.5 px-3 bg-muted/80 border-l border-border min-w-[130px]">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {matrix.rows.map((rootNode) => renderRow(rootNode))}

            {/* Grand Total Row */}
            {config.showGrandTotals && (
              <TableRow className="bg-[#0c2340] text-white hover:bg-[#122e50] font-bold border-t-2 border-border">
                <TableCell className="py-2.5 px-3 text-xs uppercase tracking-wider border-r border-slate-700">
                  Grand Total
                </TableCell>
                {matrix.columnHeaders.map((cKey) => {
                  const colTotal = matrix.columnTotals[cKey];
                  return (
                    <TableCell key={cKey} className="text-right text-xs font-mono py-2.5 px-3">
                      {colTotal ? colTotal.formatted : "0"}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right text-xs font-mono py-2.5 px-3 bg-[#08182b] border-l border-slate-700 text-orange-400">
                  {matrix.grandTotal ? matrix.grandTotal.formatted : "0"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

