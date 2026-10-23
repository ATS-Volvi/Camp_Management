import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ClipboardCheck, AlertTriangle, BarChart3, FileText, Settings, Building2 } from "lucide-react";
import FoodSafetyDashboard from "@/components/food-safety/FoodSafetyDashboard";
import AuditTemplatesTab from "@/components/food-safety/AuditTemplatesTab";
import AuditExecutionTab from "@/components/food-safety/AuditExecutionTab";
import NCRTrackingTab from "@/components/food-safety/NCRTrackingTab";
import AIInsightsTab from "@/components/food-safety/AIInsightsTab";
import MessFacilitiesTab from "@/components/food-safety/MessFacilitiesTab";

export default function FoodSafetyAudit() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Food Safety & Mess Audit
          </h1>
          <p className="text-muted-foreground mt-1">
            Hygiene inspections, compliance tracking & AI-powered risk analytics
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 h-12">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-1.5 text-xs">
            <ClipboardCheck className="h-4 w-4" /> Audits
          </TabsTrigger>
          <TabsTrigger value="ncr" className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="h-4 w-4" /> NCR Tracker
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-4 w-4" /> AI Insights
          </TabsTrigger>
          <TabsTrigger value="facilities" className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-4 w-4" /> Facilities
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs">
            <Settings className="h-4 w-4" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><FoodSafetyDashboard /></TabsContent>
        <TabsContent value="audits"><AuditExecutionTab /></TabsContent>
        <TabsContent value="ncr"><NCRTrackingTab /></TabsContent>
        <TabsContent value="ai"><AIInsightsTab /></TabsContent>
        <TabsContent value="facilities"><MessFacilitiesTab /></TabsContent>
        <TabsContent value="templates"><AuditTemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
