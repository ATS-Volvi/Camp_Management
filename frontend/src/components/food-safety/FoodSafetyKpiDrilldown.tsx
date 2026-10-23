import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type FsKpiType =
  | "total_audits"
  | "avg_compliance"
  | "compliant"
  | "moderate"
  | "critical"
  | "open_ncrs"
  | null;

const titleMap: Record<Exclude<FsKpiType, null>, string> = {
  total_audits: "All Audits",
  avg_compliance: "Completed Audits — Compliance Breakdown",
  compliant: "Compliant Audits",
  moderate: "Moderate Risk Audits",
  critical: "Critical Audits",
  open_ncrs: "Open Non-Conformance Records",
};

interface Props {
  type: FsKpiType;
  onClose: () => void;
  audits: any[];
  ncrs: any[];
}

export default function FoodSafetyKpiDrilldown({ type, onClose, audits, ncrs }: Props) {
  if (!type) return null;

  const completed = audits.filter((a) => a.status === "completed");
  let rows: any[] = [];
  let mode: "audits" | "ncrs" = "audits";

  switch (type) {
    case "total_audits":
      rows = audits;
      break;
    case "avg_compliance":
      rows = completed;
      break;
    case "compliant":
      rows = completed.filter((a) => a.risk_grade === "compliant");
      break;
    case "moderate":
      rows = completed.filter((a) => a.risk_grade === "moderate_risk");
      break;
    case "critical":
      rows = completed.filter((a) => a.risk_grade === "critical");
      break;
    case "open_ncrs":
      rows = ncrs.filter((n) => n.status === "open");
      mode = "ncrs";
      break;
  }

  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {titleMap[type]} <span className="text-muted-foreground text-sm font-normal">({rows.length})</span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          {rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No records found.</p>
          ) : mode === "audits" ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Camp</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Compliance</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Risk Grade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-xs">{new Date(a.audit_date).toLocaleDateString()}</td>
                    <td className="p-3 font-medium">{a.camps?.name || "—"}</td>
                    <td className="p-3 capitalize text-muted-foreground">{a.audit_type}</td>
                    <td className="p-3">
                      <Badge variant={a.status === "completed" ? "default" : "secondary"} className="capitalize text-xs">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      {a.status === "completed" ? (
                        <span
                          className={`font-bold ${
                            a.compliance_pct >= 90
                              ? "text-green-600"
                              : a.compliance_pct >= 70
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {a.compliance_pct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {a.risk_grade ? (
                        <Badge
                          className={`text-xs border-0 capitalize ${
                            a.risk_grade === "compliant"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : a.risk_grade === "moderate_risk"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                : a.risk_grade === "critical"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a.risk_grade.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Raised</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Camp</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Target Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => {
                  const overdue = n.target_date && new Date(n.target_date) < new Date();
                  return (
                    <tr key={n.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-xs">
                        {n.created_at ? new Date(n.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3 font-medium">{n.camps?.name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{n.category || "—"}</td>
                      <td className="p-3">
                        <Badge
                          className={`text-xs border-0 capitalize ${
                            n.severity === "critical"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : n.severity === "major"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {n.severity || "—"}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">
                        {n.target_date ? (
                          <span className={overdue ? "text-red-600 font-semibold" : ""}>
                            {new Date(n.target_date).toLocaleDateString()}
                            {overdue && " (overdue)"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={n.status === "open" ? "destructive" : "default"} className="capitalize text-xs">
                          {n.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
