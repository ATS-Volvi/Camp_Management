import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PagedResult<T> {
  page: number;
  pages: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  total: number;
  rows: T[];
  from: number;
  to: number;
}

/** Render-only paging for client-side lists; totals and exports keep using the full list. */
export function usePaged<T>(rows: T[], initialSize = 50): PagedResult<T> {
  const [pageSize, setPageSize] = useState<number>(initialSize);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  const total = rows.length;
  const effectiveSize = pageSize <= 0 ? (total || 1) : pageSize;
  const pages = Math.max(1, Math.ceil(total / effectiveSize));
  const current = Math.min(Math.max(1, page), pages);

  const startIdx = (current - 1) * effectiveSize;
  const endIdx = pageSize <= 0 ? total : Math.min(startIdx + effectiveSize, total);
  const pagedRows = rows.slice(startIdx, endIdx);

  return {
    page: current,
    pages,
    pageSize,
    setPage,
    setPageSize,
    total,
    rows: pagedRows,
    from: total === 0 ? 0 : startIdx + 1,
    to: endIdx,
  };
}

interface TablePagerProps {
  page: number;
  pages: number;
  setPage: (page: number) => void;
  total: number;
  from?: number;
  to?: number;
  pageSize?: number;
  setPageSize?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function TablePager({
  page,
  pages,
  setPage,
  total,
  from,
  to,
  pageSize,
  setPageSize,
  pageSizeOptions = [25, 50, 100, 250],
  className = "",
}: TablePagerProps) {
  if (total <= 0) return null;

  const currentFrom = from ?? (pages <= 1 ? 1 : (page - 1) * (pageSize || 50) + 1);
  const currentTo = to ?? (pages <= 1 ? total : Math.min(page * (pageSize || 50), total));

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-muted/20 border-t text-xs text-muted-foreground ${className}`}>
      {/* Showing count */}
      <div className="font-medium text-foreground/80">
        Showing <span className="font-semibold text-foreground">{currentFrom.toLocaleString()}</span> to{" "}
        <span className="font-semibold text-foreground">{currentTo.toLocaleString()}</span> of{" "}
        <span className="font-semibold text-foreground">{total.toLocaleString()}</span> records
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {setPageSize && pageSize !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => setPageSize(Number(val))}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
                <SelectItem value="-1" className="text-xs">
                  All
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page navigation controls */}
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} className="mr-0.5" /> Prev
            </Button>

            <span className="px-2 font-medium">
              Page {page} of {pages}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight size={14} className="ml-0.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= pages}
              onClick={() => setPage(pages)}
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
