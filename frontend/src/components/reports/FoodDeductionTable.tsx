import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { emptyMealDeductions, type MealDeductions } from "@/lib/mealCosting";
import { statementAmount, sumFoodDeductions, type DepartmentCostRow } from "./departmentStatement";

const meals = ["breakfast", "lunch", "dinner", "ramadan"] as const;
function DeductionCells({ value }: { value: MealDeductions }) {
  return <>{meals.map(k => <TableCell key={k} className="text-right whitespace-nowrap"><div>{value[`${k}Count`]}</div><div className="text-xs text-muted-foreground">SAR {statementAmount(value[k])}</div></TableCell>)}<TableCell className="text-right font-semibold whitespace-nowrap">SAR {statementAmount(value.total)}</TableCell></>;
}

export function FoodDeductionSummary({ value }: { value: MealDeductions }) {
  return <Table aria-label="Food deductions summary"><TableHeader><TableRow><TableHead>Total Food Deductions</TableHead><TableHead className="text-right">BF count / amount</TableHead><TableHead className="text-right">Lunch count / amount</TableHead><TableHead className="text-right">Dinner count / amount</TableHead><TableHead className="text-right">Ramadan day-equiv. / amount</TableHead><TableHead className="text-right">Total deducted</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Leave + approved cancellations</TableCell><DeductionCells value={value} /></TableRow></TableBody></Table>;
}

export function LeaveFoodDeductionTable({ rows }: { rows: DepartmentCostRow[] }) {
  const leaves = rows.filter(r => (r.leaveDays || 0) > 0);
  if (!leaves.length) return null;
  return <section className="border-t p-3 space-y-2" aria-label="Leave food auto-deductions">
    <h4 className="font-semibold text-sm">Leave days — Food auto-deducted</h4>
    <Table><TableHeader><TableRow><TableHead>Employee / ID</TableHead><TableHead>Camp / Room</TableHead><TableHead>Leave dates (From — To)</TableHead><TableHead className="text-right">Leave days</TableHead><TableHead className="text-right">BF count / amount</TableHead><TableHead className="text-right">Lunch count / amount</TableHead><TableHead className="text-right">Dinner count / amount</TableHead><TableHead className="text-right">Ramadan day-equiv. / amount</TableHead><TableHead className="text-right">Deducted (SAR)</TableHead></TableRow></TableHeader>
      <TableBody>{leaves.map(r => <TableRow key={r.id}><TableCell><div>{r.name}</div><div className="text-xs font-mono text-muted-foreground">{r.emp_code}</div></TableCell><TableCell>{r.camp} / {r.room}</TableCell><TableCell className="whitespace-nowrap">{(r.leaves || []).map((l, i) => <div key={i}>{l.from} — {l.to}</div>)}</TableCell><TableCell className="text-right">{r.leaveDays}</TableCell><DeductionCells value={r.leaveFoodDeductions || emptyMealDeductions()} /></TableRow>)}
        <TableRow className="font-semibold bg-primary/10"><TableCell colSpan={3}>Total auto-deducted</TableCell><TableCell className="text-right">{leaves.reduce((s, r) => s + (r.leaveDays || 0), 0)}</TableCell><DeductionCells value={sumFoodDeductions(leaves, true)} /></TableRow>
      </TableBody></Table>
  </section>;
}