import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFoodSafetyAudits, useNCRRecords } from "@/hooks/useFoodSafetyAudit";
import ReactMarkdown from "react-markdown";

export default function AIInsightsTab() {
  const { data: audits = [] } = useFoodSafetyAudits();
  const { data: ncrs = [] } = useNCRRecords();
  const [aiReport, setAiReport] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const completedAudits = audits.filter(a => a.status === "completed");

  // Category-wise NCR analysis
  const categoryBreakdown: Record<string, number> = {};
  ncrs.forEach(n => {
    categoryBreakdown[n.category] = (categoryBreakdown[n.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Compliance trend
  const last10 = completedAudits.slice(0, 10);
  const avgRecent = last10.length > 0 ? Math.round(last10.reduce((s, a) => s + a.compliance_pct, 0) / last10.length) : 0;
  const isImproving = last10.length >= 2 && last10[0].compliance_pct > last10[last10.length - 1].compliance_pct;

  const generateAIInsights = async () => {
    setLoading(true);
    try {
      const context = {
        total_audits: audits.length,
        completed_audits: completedAudits.length,
        avg_compliance: avgRecent,
        critical_audits: completedAudits.filter(a => a.risk_grade === "critical").length,
        open_ncrs: ncrs.filter(n => n.status === "open").length,
        overdue_ncrs: ncrs.filter(n => n.status !== "closed" && n.target_date && new Date(n.target_date) < new Date()).length,
        top_ncr_categories: topCategories,
        recent_audits: last10.map(a => ({
          date: a.audit_date,
          camp: (a as any).camps?.name,
          compliance: a.compliance_pct,
          grade: a.risk_grade,
        })),
      };

      const { data, error } = await supabase.functions.invoke("ai-food-safety-insights", {
        body: { context },
      });

      if (error) throw error;
      setAiReport(data.report || "No insights generated.");
    } catch (e: any) {
      setAiReport("Failed to generate insights: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> AI Risk Analytics & Insights
        </h2>
        <Button onClick={generateAIInsights} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {loading ? "Analyzing..." : "Generate AI Insights"}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Compliance (Recent)</p>
                <p className="text-3xl font-bold">{avgRecent}%</p>
              </div>
              {isImproving ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
            <p className="text-xs mt-1 text-muted-foreground">
              {isImproving ? "Trend: Improving ↑" : "Trend: Declining ↓"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Top Violation Categories
            </p>
            <div className="mt-2 space-y-1">
              {topCategories.length > 0 ? topCategories.map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-xs">
                  <span className="truncate">{cat}</span>
                  <Badge variant="destructive" className="text-[10px] ml-2">{count}</Badge>
                </div>
              )) : <p className="text-xs text-muted-foreground">No violations recorded</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Risk Assessment</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Critical Audits</span>
                <Badge variant="destructive" className="text-[10px]">{completedAudits.filter(a => a.risk_grade === "critical").length}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span>Open NCRs</span>
                <Badge variant="outline" className="text-[10px]">{ncrs.filter(n => n.status === "open").length}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span>Overdue Actions</span>
                <Badge variant="destructive" className="text-[10px]">
                  {ncrs.filter(n => n.status !== "closed" && n.target_date && new Date(n.target_date) < new Date()).length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Report */}
      {aiReport && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI-Generated Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{aiReport}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {!aiReport && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Click "Generate AI Insights" to get AI-powered risk analysis, trend predictions, and actionable recommendations.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
