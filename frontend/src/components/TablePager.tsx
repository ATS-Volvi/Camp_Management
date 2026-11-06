import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Render-only paging for large client-side lists; totals and exports keep using the full list. */
export function usePaged<R extends unknown[]>(rows: R, size = 100) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  return { page: current, pages, setPage, total: rows.length, rows: rows.slice((current - 1) * size, current * size) as R };
}

export function TablePager({ page, pages, setPage, total }: { page: number; pages: number; setPage: (page: number) => void; total: number }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        <ChevronLeft size={16} /> Previous
      </Button>
      <span>Page {page} of {pages} · {total.toLocaleString()} rows</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
        Next <ChevronRight size={16} />
      </Button>
    </div>
  );
}
