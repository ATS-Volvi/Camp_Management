import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, History, FileText, TrendingDown, BarChart3 } from "lucide-react";
import GroceryItemsTab from "@/components/grocery/GroceryItemsTab";
import PriceHistoryTab from "@/components/grocery/PriceHistoryTab";
import InvoiceUploadTab from "@/components/grocery/InvoiceUploadTab";
import ConsumptionTab from "@/components/grocery/ConsumptionTab";
import GroceryReportsTab from "@/components/grocery/GroceryReportsTab";

export default function GroceryInventory() {
  const [activeTab, setActiveTab] = useState("items");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Grocery Inventory Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage grocery items, track prices, upload invoices, and monitor consumption
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package size={16} /> Inventory
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center gap-2">
            <History size={16} /> Price History
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText size={16} /> Invoices
          </TabsTrigger>
          <TabsTrigger value="consumption" className="flex items-center gap-2">
            <TrendingDown size={16} /> Consumption
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 size={16} /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items"><GroceryItemsTab /></TabsContent>
        <TabsContent value="prices"><PriceHistoryTab /></TabsContent>
        <TabsContent value="invoices"><InvoiceUploadTab /></TabsContent>
        <TabsContent value="consumption"><ConsumptionTab /></TabsContent>
        <TabsContent value="reports"><GroceryReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
