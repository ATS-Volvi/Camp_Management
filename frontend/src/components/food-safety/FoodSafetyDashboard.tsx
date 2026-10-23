import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFoodSafetyAudits, useNCRRecords } from "@/hooks/useFoodSafetyAudit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, TrendingUp, ClipboardList, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import FoodSafetyKpiDrilldown, { type FsKpiType } from "./FoodSafetyKpiDrilldown";

const RISK_COLORS = {
  compliant: "hsl(142, 71%, 45%)",
  moderate_risk: "hsl(38, 92%, 50%)",
  critical: "hsl(0, 84%, 60%)",
  pending: "hsl(220, 9%, 76%)",
};

export default function FoodSafetyDashboard() {
  const [campFilter, setCampFilter] = useState<string>("all");
  const [drilldown, setDrilldown] = useState<FsKpiType>(null);
  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data } = await supabase.from("camps").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: audits = [] } = useFoodSafetyAudits(campFilter === "all" ? undefined : campFilter);
  const { data: ncrs = [] } = useNCRRecords(campFilter === "all" ? undefined : campFilter);

  const completedAudits = audits.filter(a => a.status === "completed");
  const avgCompliance = completedAudits.length > 0
    ? Math.round(completedAudits.reduce((s, a) => s + a.compliance_pct, 0) / completedAudits.length)
    : 0;

  const gradeDistribution = [
    { name: "Compliant", value: completedAudits.filter(a => a.risk_grade === "compliant").length, color: RISK_COLORS.compliant },
    { name: "Moderate Risk", value: completedAudits.filter(a => a.risk_grade === "moderate_risk").length, color: RISK_COLORS.moderate_risk },
    { name: "Critical", value: completedAudits.filter(a => a.risk_grade === "critical").length, color: RISK_COLORS.critical },
  ];

  const openNCRs = ncrs.filter(n => n.status === "open").length;
  const overdueNCRs = ncrs.filter(n => n.status === "open" && n.target_date && new Date(n.target_date) < new Date()).length;

  // Camp-wise compliance
  const campCompliance = camps.map(camp => {
    const campAudits = completedAudits.filter(a => a.camp_id === camp.id);
    const avg = campAudits.length > 0 ? Math.round(campAudits.reduce((s, a) => s + a.compliance_pct, 0) / campAudits.length) : 0;
    return { name: camp.name, compliance: avg, audits: campAudits.length };
  }).filter(c => c.audits > 0);

  // Trend data (last 7 audits)
  const trendData = completedAudits.slice(0, 7).reverse().map(a => ({
    date: new Date(a.audit_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    compliance: a.compliance_pct,
  }));

  return (
    <>
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex justify-end">
        <Select value={campFilter} onValueChange={setCampFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Camps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card
          className="border-l-4 border-l-primary cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
          onClick={() => setDrilldown("total_audits")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Audits</p>
            <p className="text-2xl font-bold">{audits.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>
        <Card
          className="border-l-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
          style={{ borderLeftColor: RISK_COLORS.compliant }}
          onClick={() => setDrilldown("avg_compliance")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Avg Compliance</p>
            <p className="text-2xl font-bold">{avgCompliance}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>
        <Card
          className="border-l-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
          style={{ borderLeftColor: RISK_COLORS.compliant }}
          onClick={() => setDrilldown("compliant")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Compliant</p>
            <p className="text-2xl font-bold text-green-600">{gradeDistribution[0].value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>
        <Card
          className="border-l-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
          style={{ borderLeftColor: RISK_COLORS.moderate_risk }}
          onClick={() => setDrilldown("moderate")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Moderate</p>
            <p className="text-2xl font-bold text-amber-600">{gradeDistribution[1].value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>
        <Card
          className="border-l-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
          style={{ borderLeftColor: RISK_COLORS.critical }}
          onClick={() => setDrilldown("critical")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3" /> Critical</p>
            <p className="text-2xl font-bold text-red-600">{gradeDistribution[2].value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>
        <Card
          className="border-l-4 border-l-destructive cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
          onClick={() => setDrilldown("open_ncrs")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Open NCRs</p>
            <p className="text-2xl font-bold">{openNCRs}</p>
            {overdueNCRs > 0 && <Badge variant="destructive" className="text-[10px] mt-1">{overdueNCRs} Overdue</Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Compliance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="compliance" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No audits completed yet</div>
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedAudits.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={gradeDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {gradeDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Camp Compliance Bar Chart */}
      {campCompliance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Camp-wise Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campCompliance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="compliance" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Audits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {audits.slice(0, 10).map(audit => (
              <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${audit.risk_grade === "compliant" ? "bg-green-500" : audit.risk_grade === "moderate_risk" ? "bg-amber-500" : audit.risk_grade === "critical" ? "bg-red-500" : "bg-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium">{(audit as any).camps?.name || "—"} — {audit.audit_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(audit.audit_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={audit.status === "completed" ? "default" : "secondary"}>
                    {audit.status}
                  </Badge>
                  {audit.status === "completed" && (
                    <span className={`text-sm font-bold ${audit.compliance_pct >= 90 ? "text-green-600" : audit.compliance_pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                      {audit.compliance_pct}%
                    </span>
                  )}
                </div>
              </div>
            ))}
            {audits.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">No audits found. Create your first audit to get started.</p>}
          </div>
        </CardContent>
      </Card>
    </div>

      <FoodSafetyKpiDrilldown type={drilldown} onClose={() => setDrilldown(null)} audits={audits} ncrs={ncrs} />
    </>
  );
}
