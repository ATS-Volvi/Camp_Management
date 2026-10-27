import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, RotateCcw, Building2, Wrench, Package, ScanSearch } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import AIReportMessage from "@/components/ai-reports/AIReportMessage";

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";
const BACKEND_URL = rawBackendUrl.endsWith('/api') ? rawBackendUrl : `${rawBackendUrl}/api`;
const ANOMALY_URL = `${BACKEND_URL}/ai/anomaly`;

type Category = "all" | "occupancy" | "maintenance" | "inventory";

const categories: { value: Category; label: string; icon: React.ElementType; description: string }[] = [
  { value: "all", label: "Full Scan", icon: ScanSearch, description: "All modules" },
  { value: "occupancy", label: "Occupancy", icon: Building2, description: "Room & check-in anomalies" },
  { value: "maintenance", label: "Maintenance", icon: Wrench, description: "Ticket & repair anomalies" },
  { value: "inventory", label: "Inventory & Catering", icon: Package, description: "Stock & wastage anomalies" },
];

export default function AnomalyReport() {
  const [report, setReport] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [report]);

  const runScan = async (category: Category) => {
    if (isLoading) return;
    setActiveCategory(category);
    setReport("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const resp = await fetch(ANOMALY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ category }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setReport(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setReport(`❌ Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="text-destructive" size={24} />
            AI Anomaly Report
          </h1>
          <p className="text-muted-foreground text-sm">
            AI-powered detection of irregularities across occupancy, maintenance, and inventory
          </p>
        </div>
        {report && (
          <Button variant="outline" size="sm" onClick={() => { setReport(""); setActiveCategory(null); }}>
            <RotateCcw size={14} className="mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* Category Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.value;
          return (
            <Card
              key={cat.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isActive ? "ring-2 ring-primary border-primary" : ""
              } ${isLoading && !isActive ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => runScan(cat.value)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Icon size={28} className={isActive ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Output */}
      {(report || isLoading) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Scanning for anomalies...
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-destructive" />
                  Anomaly Report
                  <Badge variant="outline" className="ml-2 text-xs">
                    {activeCategory === "all" ? "Full Scan" : categories.find(c => c.value === activeCategory)?.label}
                  </Badge>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={scrollRef}
              className="max-h-[calc(100vh-380px)] overflow-y-auto"
            >
              <AIReportMessage content={report} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!report && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ScanSearch size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Select a category above to start anomaly detection</p>
            <p className="text-sm mt-1">The AI will analyze your live data and flag any irregularities</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
