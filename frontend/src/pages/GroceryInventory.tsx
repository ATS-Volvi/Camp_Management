import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, History, FileText, TrendingDown, BarChart3, Layers } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import GroceryItemsTab from "@/components/grocery/GroceryItemsTab";
import PriceHistoryTab from "@/components/grocery/PriceHistoryTab";
import InvoiceUploadTab from "@/components/grocery/InvoiceUploadTab";
import ConsumptionTab from "@/components/grocery/ConsumptionTab";
import GroceryReportsTab from "@/components/grocery/GroceryReportsTab";
import VisualPantryShelfPage from "@/pages/VisualPantryShelfPage";

export default function GroceryInventory() {
  const [activeTab, setActiveTab] = useState("shelf");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Grocery Inventory Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage physical shelf items, stock levels, price history, invoice uploads, and consumption
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="shelf" className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <Layers size={16} /> 🗄️ Visual Pantry Shelf
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package size={16} /> Table Inventory
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

        <TabsContent value="shelf">
          <ErrorBoundary fallbackTitle="Visual Pantry Shelf Error">
            <VisualPantryShelfPage />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="items">
          <ErrorBoundary fallbackTitle="Pantry Inventory Error">
            <GroceryItemsTab />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="prices">
          <ErrorBoundary fallbackTitle="Price History Error">
            <PriceHistoryTab />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="invoices">
          <ErrorBoundary fallbackTitle="Invoice Upload Error">
            <InvoiceUploadTab />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="consumption">
          <ErrorBoundary fallbackTitle="Consumption Log Error">
            <ConsumptionTab />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="reports">
          <ErrorBoundary fallbackTitle="Grocery Reports Error">
            <GroceryReportsTab />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
