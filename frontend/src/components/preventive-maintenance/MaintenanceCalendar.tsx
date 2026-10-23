import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PMTask } from "@/hooks/usePreventiveMaintenance";
import { cn } from "@/lib/utils";

interface Props {
  tasks: PMTask[];
  onSelectTask?: (t: PMTask) => void;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  skipped: "bg-muted text-muted-foreground border-border",
};

export default function MaintenanceCalendar({ tasks, onSelectTask }: Props) {
  const [cursor, setCursor] = useState(new Date());
  const start = startOfMonth(cursor);
  const end = endOfMonth(cursor);
  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);
  const offset = start.getDay();

  const tasksByDay = useMemo(() => {
    const map = new Map<string, PMTask[]>();
    tasks.forEach(t => {
      const key = t.due_date;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [tasks]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{format(cursor, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setCursor(subMonths(cursor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={"e"+i} />)}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const isToday = isSameDay(day, new Date());
          return (
            <div key={key} className={cn(
              "min-h-[88px] border rounded-md p-1.5 text-xs bg-background",
              isToday && "ring-2 ring-primary"
            )}>
              <div className="font-medium mb-1">{format(day, "d")}</div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(t => (
                  <button key={t.id}
                    onClick={() => onSelectTask?.(t)}
                    className={cn(
                      "w-full text-left px-1.5 py-1 rounded border truncate",
                      STATUS_COLOR[t.status]
                    )}
                    title={`${t.pm_equipment?.name} — ${t.status}`}
                  >
                    {t.pm_equipment?.name ?? "Task"}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-muted-foreground px-1.5">+{dayTasks.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
