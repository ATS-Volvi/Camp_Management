import { useState, useEffect, useMemo } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeOrder, useSubmitOrder, MealType, Preference, MealCycle } from "@/hooks/useMealManagement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Leaf, Drumstick, Clock, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];
const MEAL_LABELS: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

interface Props {
  cycle: MealCycle;
  initialEmployeeId?: string;
  allowEmployeePicker?: boolean;
}

function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  while (s <= e) {
    out.push(s.toISOString().split("T")[0]);
    s.setDate(s.getDate() + 1);
  }
  return out;
}

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { expired: true, label: "Cut-off passed" };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { expired: false, label: `${days}d ${hours}h ${mins}m ${secs}s` };
}

export default function WeeklyOrderGrid({ cycle, initialEmployeeId, allowEmployeePicker = true }: Props) {
  const { user } = useAuth();
  const { data: employees = [] } = useEmployees();
  const linkedEmployee = useMemo(
    () => employees.find((e: any) => e.user_id === user?.id),
    [employees, user]
  );
  const [employeeId, setEmployeeId] = useState<string>(initialEmployeeId ?? linkedEmployee?.id ?? "");

  useEffect(() => {
    if (!employeeId && linkedEmployee?.id) setEmployeeId(linkedEmployee.id);
  }, [linkedEmployee, employeeId]);

  const { data: existing } = useEmployeeOrder(cycle.id, employeeId);
  const submit = useSubmitOrder();
  const countdown = useCountdown(cycle.cutoff_datetime);
  const days = useMemo(() => dateRange(cycle.start_date, cycle.end_date), [cycle]);

  // selections[date][meal] = preference | null
  const [sel, setSel] = useState<Record<string, Record<MealType, Preference | null>>>({});

  useEffect(() => {
    const s: Record<string, Record<MealType, Preference | null>> = {};
    days.forEach((d) => {
      s[d] = { breakfast: null, lunch: null, dinner: null };
    });
    (existing?.meal_order_items ?? []).forEach((it) => {
      if (s[it.meal_date]) s[it.meal_date][it.meal_type] = it.preference;
    });
    setSel(s);
  }, [existing, days.join(",")]);

  const setPref = (date: string, meal: MealType, pref: Preference | null) => {
    setSel((prev) => ({ ...prev, [date]: { ...prev[date], [meal]: pref } }));
  };

  const fillAll = (pref: Preference) => {
    const s: Record<string, Record<MealType, Preference | null>> = {};
    days.forEach((d) => {
      s[d] = { breakfast: pref, lunch: pref, dinner: pref };
    });
    setSel(s);
  };

  const totals = useMemo(() => {
    let count = 0;
    Object.values(sel).forEach((day) => Object.values(day).forEach((p) => p && count++));
    return count;
  }, [sel]);

  const handleSubmit = () => {
    if (!employeeId) {
      toast.error("Select an employee first");
      return;
    }
    const items: { meal_date: string; meal_type: MealType; preference: Preference }[] = [];
    Object.entries(sel).forEach(([date, meals]) => {
      Object.entries(meals).forEach(([m, p]) => {
        if (p) items.push({ meal_date: date, meal_type: m as MealType, preference: p });
      });
    });
    submit.mutate({ employee_id: employeeId, cycle_id: cycle.id, items });
  };

  const fmtDay = (d: string) => {
    const date = new Date(d);
    return {
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
    };
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{cycle.name ?? "Weekly Meal Order"}</CardTitle>
            <CardDescription>
              {cycle.start_date} → {cycle.end_date}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Badge variant={countdown.expired ? "destructive" : "secondary"} className="font-mono">
              {countdown.label}
            </Badge>
          </div>
        </div>

        {allowEmployeePicker && (
          <div className="space-y-1.5">
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {e.employee_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => fillAll("veg")} disabled={countdown.expired}>
            <Leaf className="mr-1 h-3 w-3 text-emerald-600" /> All Veg
          </Button>
          <Button size="sm" variant="outline" onClick={() => fillAll("non_veg")} disabled={countdown.expired}>
            <Drumstick className="mr-1 h-3 w-3 text-orange-600" /> All Non-Veg
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">{totals} meals selected</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Day</th>
                {MEAL_TYPES.map((m) => (
                  <th key={m} className="text-left p-2 font-medium text-muted-foreground">
                    {MEAL_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const f = fmtDay(d);
                return (
                  <tr key={d} className="border-b last:border-0">
                    <td className="p-2">
                      <div className="font-medium">{f.weekday}</div>
                      <div className="text-xs text-muted-foreground">{f.date}</div>
                    </td>
                    {MEAL_TYPES.map((m) => (
                      <td key={m} className="p-2">
                        <ToggleGroup
                          type="single"
                          value={sel[d]?.[m] ?? ""}
                          onValueChange={(v) => setPref(d, m, (v || null) as Preference | null)}
                          disabled={countdown.expired}
                        >
                          <ToggleGroupItem
                            value="veg"
                            size="sm"
                            className="data-[state=on]:bg-emerald-600 data-[state=on]:text-white"
                          >
                            <Leaf className="h-3 w-3 mr-1" /> Veg
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="non_veg"
                            size="sm"
                            className="data-[state=on]:bg-orange-600 data-[state=on]:text-white"
                          >
                            <Drumstick className="h-3 w-3 mr-1" /> Non-Veg
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={countdown.expired || submit.isPending || !employeeId}>
            <Save className="mr-2 h-4 w-4" />
            {existing ? "Update Order" : "Submit Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
