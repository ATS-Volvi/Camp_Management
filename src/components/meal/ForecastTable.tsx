import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMealForecast, MealCycle, MealType } from "@/hooks/useMealManagement";
import { Leaf, Drumstick } from "lucide-react";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];
const MEAL_LABELS: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export default function ForecastTable({ cycle }: { cycle: MealCycle }) {
  const { data: forecast = [] } = useMealForecast(cycle.id);

  const days = useMemo(() => {
    const out: string[] = [];
    const s = new Date(cycle.start_date);
    const e = new Date(cycle.end_date);
    while (s <= e) {
      out.push(s.toISOString().split("T")[0]);
      s.setDate(s.getDate() + 1);
    }
    return out;
  }, [cycle]);

  const get = (d: string, m: MealType) => forecast.find((f) => f.meal_date === d && f.meal_type === m);

  const totals = useMemo(() => {
    const t: Record<MealType, { veg: number; non_veg: number }> = {
      breakfast: { veg: 0, non_veg: 0 },
      lunch: { veg: 0, non_veg: 0 },
      dinner: { veg: 0, non_veg: 0 },
    };
    forecast.forEach((f) => {
      t[f.meal_type].veg += f.veg;
      t[f.meal_type].non_veg += f.non_veg;
    });
    return t;
  }, [forecast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Meal Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                {MEAL_TYPES.map((m) => (
                  <th key={m} className="text-left p-2 font-medium text-muted-foreground">
                    {MEAL_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d} className="border-b last:border-0">
                  <td className="p-2 font-medium">{new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" })}</td>
                  {MEAL_TYPES.map((m) => {
                    const f = get(d, m);
                    return (
                      <td key={m} className="p-2">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-emerald-600/30">
                            <Leaf className="mr-1 h-3 w-3 text-emerald-600" /> {f?.veg ?? 0}
                          </Badge>
                          <Badge variant="outline" className="border-orange-600/30">
                            <Drumstick className="mr-1 h-3 w-3 text-orange-600" /> {f?.non_veg ?? 0}
                          </Badge>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-muted/40 font-medium">
                <td className="p-2">Total</td>
                {MEAL_TYPES.map((m) => (
                  <td key={m} className="p-2">
                    <div className="flex gap-2">
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                        <Leaf className="mr-1 h-3 w-3" /> {totals[m].veg}
                      </Badge>
                      <Badge className="bg-orange-600 text-white hover:bg-orange-600">
                        <Drumstick className="mr-1 h-3 w-3" /> {totals[m].non_veg}
                      </Badge>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
