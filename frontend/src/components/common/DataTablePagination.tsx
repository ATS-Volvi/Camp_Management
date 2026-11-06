import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DataTablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  selectedCount?: number;
  className?: string;
}

export function DataTablePagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100],
  selectedCount,
  className,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalCount);

  // Generate page numbers with smart ellipsis window
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/15 text-xs text-muted-foreground",
        className
      )}
    >
      {/* ── Left Zone: Record Range & Selection Counter ── */}
      <div className="flex items-center gap-2 self-start sm:self-center font-medium">
        <span>
          Showing <strong className="text-foreground">{startRecord}</strong> to{" "}
          <strong className="text-foreground">{endRecord}</strong> of{" "}
          <strong className="text-foreground">{totalCount}</strong> entries
        </span>
        {typeof selectedCount === "number" && selectedCount > 0 && (
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* ── Center & Right Zone: Controls ── */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
        {/* Rows per page selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                onPageSizeChange(Number(val));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="h-8 w-[72px] text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page navigation controls */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex bg-background hover:bg-muted"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            title="First Page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            title="Previous Page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="h-8 w-7 flex items-center justify-center text-xs text-muted-foreground select-none"
                  >
                    …
                  </span>
                );
              }
              const pageNum = p as number;
              const isActive = pageNum === safeCurrentPage;
              return (
                <Button
                  key={`page-${pageNum}`}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 min-w-[32px] px-2 text-xs font-semibold",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs pointer-events-none"
                      : "bg-background hover:bg-muted text-foreground"
                  )}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            title="Next Page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex bg-background hover:bg-muted"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            title="Last Page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

