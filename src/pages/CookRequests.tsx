import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Printer, CheckCircle, XCircle, Truck, Package, Eye, Send,
  AlertTriangle, FileText, UtensilsCrossed, ShoppingCart, Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCamps } from "@/hooks/useInventory";
import { useMealMenuTemplates, useCateringStock } from "@/hooks/useCatering";
import {
  useCookRequests,
  useCookRequestItems,
  useCreateCookRequest,
  useUpdateCookRequestStatus,
  useUpdateCookRequestItems,
  useIssueCookRequestItems,
  usePurchaseOrders,
  usePurchaseOrderItems,
  useUpdatePurchaseOrderStatus,
  useReceivePOItems,
} from "@/hooks/useCookRequests";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-destructive/10 text-destructive",
  partially_issued: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  completed: "bg-primary/10 text-primary",
  received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sent_to_vendor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function CookRequests() {
  const { user } = useAuth();
  const [campId, setCampId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("requests");
  const { data: camps } = useCamps();

  // Create request state
  const [showCreate, setShowCreate] = useState(false);
  const [bfCount, setBfCount] = useState(0);
  const [lunchCount, setLunchCount] = useState(0);
  const [dinnerCount, setDinnerCount] = useState(0);
  const [newNotes, setNewNotes] = useState("");

  // Approval dialog state
  const [approvalRequestId, setApprovalRequestId] = useState<string | null>(null);
  const [approvalMode, setApprovalMode] = useState<"approve" | "issue" | "view">("view");

  // PO dialog
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [showReceive, setShowReceive] = useState(false);

  const { data: requests } = useCookRequests(campId || undefined);
  const { data: bfTemplates } = useMealMenuTemplates("Breakfast");
  const { data: lunchTemplates } = useMealMenuTemplates("Lunch");
  const { data: dinnerTemplates } = useMealMenuTemplates("Dinner");
  const { data: stock } = useCateringStock(campId || undefined);
  const { data: purchaseOrders } = usePurchaseOrders(campId || undefined);

  const createRequest = useCreateCookRequest();
  const updateStatus = useUpdateCookRequestStatus();
  const updateItems = useUpdateCookRequestItems();
  const issueItems = useIssueCookRequestItems();
  const updatePOStatus = useUpdatePurchaseOrderStatus();
  const receivePO = useReceivePOItems();

  // Generate items from all 3 meal templates
  const generatedItems = useMemo(() => {
    const items: any[] = [];
    const addMealItems = (templates: any[] | undefined, mealType: string, headCount: number) => {
      if (!templates || !headCount) return;
      templates.forEach((t: any) => {
        items.push({
          ingredient_id: t.ingredient_id,
          meal_type: mealType,
          qty_per_person: t.qty_per_person,
          required_qty: Math.ceil(t.qty_per_person * headCount * 100) / 100,
          unit_cost: t.ingredients?.unit_cost || 0,
          name: t.ingredients?.name || "",
          unit: t.ingredients?.unit || "",
          category: t.ingredients?.category || "",
          headCount,
        });
      });
    };
    addMealItems(bfTemplates, "Breakfast", bfCount);
    addMealItems(lunchTemplates, "Lunch", lunchCount);
    addMealItems(dinnerTemplates, "Dinner", dinnerCount);
    return items;
  }, [bfTemplates, lunchTemplates, dinnerTemplates, bfCount, lunchCount, dinnerCount]);

  // Consolidated grocery list (merge same ingredients across meals)
  const consolidatedItems = useMemo(() => {
    const map: Record<string, any> = {};
    generatedItems.forEach((item) => {
      if (map[item.ingredient_id]) {
        map[item.ingredient_id].required_qty += item.required_qty;
      } else {
        map[item.ingredient_id] = { ...item };
      }
    });
    return Object.values(map);
  }, [generatedItems]);

  const handleCreateRequest = () => {
    if (!campId || (bfCount === 0 && lunchCount === 0 && dinnerCount === 0)) {
      toast({ title: "Please select camp and enter head count for at least one meal", variant: "destructive" });
      return;
    }
    const totalHead = Math.max(bfCount, lunchCount, dinnerCount);
    const items = generatedItems.map((g: any) => ({
      ingredient_id: g.ingredient_id,
      meal_type: g.meal_type,
      qty_per_person: g.qty_per_person,
      required_qty: g.required_qty,
      unit_cost: g.unit_cost,
    }));
    createRequest.mutate(
      {
        request: {
          camp_id: campId,
          meal_type: "daily",
          head_count: totalHead,
          bf_head_count: bfCount,
          lunch_head_count: lunchCount,
          dinner_head_count: dinnerCount,
          status: "pending",
          requested_by: user?.id,
          notes: newNotes,
        },
        items,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewNotes("");
          setBfCount(0);
          setLunchCount(0);
          setDinnerCount(0);
        },
      }
    );
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Cook Request</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin:10px 0}
      th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
      h2{margin:0}h3{margin:10px 0 5px}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold}</style></head><body>`);
    w.document.write(content.innerHTML);
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cook Requests & Purchase Orders</h1>
          <p className="text-muted-foreground text-sm">
            Daily cook grocery requests, approvals, store issuance, and vendor purchase orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={campId} onValueChange={setCampId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Camp" />
            </SelectTrigger>
            <SelectContent>
              {camps?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {campId && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Daily Request
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Cook Requests</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Cook Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!campId ? (
                <p className="text-muted-foreground text-center py-8">Select a camp to view requests</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>BF Count</TableHead>
                      <TableHead>Lunch Count</TableHead>
                      <TableHead>Dinner Count</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No requests found
                        </TableCell>
                      </TableRow>
                    )}
                    {requests?.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.request_date).toLocaleDateString()}</TableCell>
                        <TableCell>{r.bf_head_count || r.head_count}</TableCell>
                        <TableCell>{r.lunch_head_count || r.head_count}</TableCell>
                        <TableCell>{r.dinner_head_count || r.head_count}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[r.status] || ""}>{r.status.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.notes}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => { setApprovalRequestId(r.id); setApprovalMode("view"); }}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            {r.status === "pending" && (
                              <Button size="sm" variant="default" onClick={() => { setApprovalRequestId(r.id); setApprovalMode("approve"); }}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              </Button>
                            )}
                            {(r.status === "approved" || r.status === "partially_issued") && (
                              <Button size="sm" variant="secondary" onClick={() => { setApprovalRequestId(r.id); setApprovalMode("issue"); }}>
                                <Truck className="h-3 w-3 mr-1" /> Issue
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-orders">
          <PurchaseOrdersPanel
            campId={campId}
            purchaseOrders={purchaseOrders}
            userId={user?.id || ""}
            selectedPOId={selectedPOId}
            setSelectedPOId={setSelectedPOId}
            showReceive={showReceive}
            setShowReceive={setShowReceive}
            updatePOStatus={updatePOStatus}
            receivePO={receivePO}
          />
        </TabsContent>
      </Tabs>

      {/* ============ CREATE REQUEST DIALOG ============ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Daily Cook Request (BF + Lunch + Dinner)</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Breakfast Head Count</label>
              <Input type="number" value={bfCount} onChange={(e) => setBfCount(Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Lunch Head Count</label>
              <Input type="number" value={lunchCount} onChange={(e) => setLunchCount(Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Dinner Head Count</label>
              <Input type="number" value={dinnerCount} onChange={(e) => setDinnerCount(Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>

          {/* Meal-wise breakdown */}
          {generatedItems.length > 0 && (
            <div className="mt-4 space-y-4">
              {["Breakfast", "Lunch", "Dinner"].map((meal) => {
                const mealItems = generatedItems.filter((g) => g.meal_type === meal);
                if (mealItems.length === 0) return null;
                return (
                  <div key={meal}>
                    <h4 className="font-semibold text-sm text-foreground mb-1 flex items-center gap-2">
                      {meal}
                      <Badge variant="outline" className="text-xs">
                        {mealItems[0]?.headCount} pax • {mealItems.length} items
                      </Badge>
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Per Person</TableHead>
                          <TableHead>Required Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mealItems.map((item: any, idx: number) => (
                          <TableRow key={`${meal}-${idx}`}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.qty_per_person}</TableCell>
                            <TableCell className="font-medium">{item.required_qty}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.unit_cost}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}

              {/* Consolidated grocery summary */}
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-1">
                  📦 Consolidated Grocery List ({consolidatedItems.length} unique items)
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Required</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedItems.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="font-bold">{item.required_qty.toFixed(2)}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.unit_cost}</TableCell>
                        <TableCell className="font-medium">{(item.required_qty * item.unit_cost).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={5} className="text-right">Grand Total:</TableCell>
                      <TableCell>
                        {consolidatedItems.reduce((s: number, i: any) => s + i.required_qty * i.unit_cost, 0).toFixed(2)} SAR
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateRequest} disabled={createRequest.isPending}>
              <Send className="mr-2 h-4 w-4" /> Submit Daily Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ APPROVAL / ISSUE / VIEW DIALOG ============ */}
      {approvalRequestId && (
        <ApprovalDialog
          requestId={approvalRequestId}
          mode={approvalMode}
          campId={campId}
          userId={user?.id || ""}
          stock={stock}
          onClose={() => setApprovalRequestId(null)}
          updateStatus={updateStatus}
          updateItems={updateItems}
          issueItems={issueItems}
          onPrint={handlePrint}
          printRef={printRef}
          requests={requests}
        />
      )}
    </div>
  );
}

// ==========================================
// APPROVAL DIALOG (Structured View with PDF)
// ==========================================
function ApprovalDialog({
  requestId, mode, campId, userId, stock, onClose,
  updateStatus, updateItems, issueItems, onPrint, printRef, requests,
}: any) {
  const { data: items } = useCookRequestItems(requestId);
  const request = requests?.find((r: any) => r.id === requestId);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");

  useMemo(() => {
    if (items && localItems.length === 0) {
      setLocalItems(
        items.map((i: any) => ({
          ...i,
          approved_qty: i.approved_qty ?? i.required_qty,
          issued_qty: i.issued_qty ?? 0,
        }))
      );
    }
  }, [items]);

  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    stock?.forEach((s: any) => { map[s.ingredient_id] = s.balance || 0; });
    return map;
  }, [stock]);

  // Group by meal_type
  const mealGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    localItems.forEach((item) => {
      const meal = item.meal_type || "Other";
      if (!groups[meal]) groups[meal] = [];
      groups[meal].push(item);
    });
    return groups;
  }, [localItems]);

  // Consolidated grocery for PDF
  const consolidatedGrocery = useMemo(() => {
    const map: Record<string, any> = {};
    localItems.forEach((item) => {
      const key = item.ingredient_id;
      const qty = mode === "issue" ? item.issued_qty : (mode === "approve" ? item.approved_qty : item.required_qty);
      if (map[key]) {
        map[key].totalQty += (qty || 0);
        map[key].qtyPerPerson += (item.qty_per_person || 0);
      } else {
        map[key] = {
          name: item.ingredients?.name || "Unknown",
          unit: item.ingredients?.unit || "",
          qtyPerPerson: item.qty_per_person || 0,
          totalQty: qty || 0,
          rate: item.unit_cost || item.ingredients?.unit_cost || 0,
        };
      }
    });
    return Object.values(map);
  }, [localItems, mode]);

  const grandTotal = localItems.reduce((s: number, i: any) => {
    const qty = mode === "issue" ? i.issued_qty : (mode === "approve" ? i.approved_qty : i.required_qty);
    return s + (qty || 0) * (i.unit_cost || 0);
  }, 0);

  const campName = request?.camps?.name || "Camp";
  const requestDate = request?.request_date ? new Date(request.request_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

  // PDF Generation
  const generatePDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CAMP-365", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Grocery Requirement Report", 14, 25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Camp: ${campName}`, 14, 35);
    doc.text(`Date: ${requestDate}`, 14, 41);
    doc.text(`Status: ${(request?.status || "").replace(/_/g, " ").toUpperCase()}`, 14, 47);
    doc.text(`Breakfast: ${request?.bf_head_count || request?.head_count || 0} pax`, pageWidth / 2, 35);
    doc.text(`Lunch: ${request?.lunch_head_count || request?.head_count || 0} pax`, pageWidth / 2, 41);
    doc.text(`Dinner: ${request?.dinner_head_count || request?.head_count || 0} pax`, pageWidth / 2, 47);

    let y = 55;

    const mealOrder = ["Breakfast", "Lunch", "Dinner"];
    mealOrder.forEach((meal) => {
      const mealItems = mealGroups[meal];
      if (!mealItems || mealItems.length === 0) return;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${meal} Menu`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Item", "UOM", "Qty/Person"]],
        body: mealItems.map((item: any) => [
          item.ingredients?.name || "", item.ingredients?.unit || "", item.qty_per_person?.toString() || "0",
        ]),
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Consolidated Grocery List", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["#", "Item Name", "UOM", "Qty/Person", "Total Qty", "Rate (SAR)", "Total Price (SAR)"]],
      body: consolidatedGrocery.map((item: any, idx: number) => [
        (idx + 1).toString(), item.name, item.unit, item.qtyPerPerson.toFixed(3),
        item.totalQty.toFixed(2), item.rate.toFixed(2), (item.totalQty * item.rate).toFixed(2),
      ]),
      foot: [["", "", "", "", "", "Grand Total:", grandTotal.toFixed(2) + " SAR"]],
      theme: "grid",
      headStyles: { fillColor: [39, 174, 96], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: [236, 240, 241], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, finalY);
    doc.text("Camp-365 — Camp Management System", pageWidth - 14, finalY, { align: "right" });
    doc.save(`Grocery_Request_${campName}_${request?.request_date || "report"}.pdf`);
  }, [campName, requestDate, request, mealGroups, consolidatedGrocery, grandTotal]);

  const handleApprove = () => {
    const approvedItems = localItems.map((i: any) => ({ id: i.id, approved_qty: i.approved_qty }));
    updateItems.mutate(approvedItems, {
      onSuccess: () => {
        updateStatus.mutate({ id: requestId, status: "approved", approved_by: userId }, {
          onSuccess: () => {
            generatePDF();
            toast({ title: "Request approved & PDF downloaded" });
            onClose();
          },
        });
      },
    });
  };

  const handleReject = () => {
    updateStatus.mutate({ id: requestId, status: "rejected", rejection_reason: rejectionReason }, { onSuccess: onClose });
  };

  const handleIssue = () => {
    const issuedItems = localItems.map((i: any) => ({ id: i.id, ingredient_id: i.ingredient_id, issued_qty: i.issued_qty }));
    issueItems.mutate({ requestId, campId, items: issuedItems, issuedBy: userId }, { onSuccess: onClose });
  };

  const mealIcons: Record<string, string> = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙" };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {mode === "approve" ? "Approve Request" : mode === "issue" ? "Issue Items" : "Request Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-background rounded-lg px-3 py-2 border">
              <p className="text-xs text-muted-foreground">Camp</p>
              <p className="font-semibold text-sm">{campName}</p>
            </div>
            <div className="bg-background rounded-lg px-3 py-2 border">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-semibold text-sm">{requestDate}</p>
            </div>
            <div className="bg-background rounded-lg px-3 py-2 border">
              <p className="text-xs text-muted-foreground">Head Count</p>
              <p className="font-semibold text-sm">
                BF: {request?.bf_head_count || request?.head_count || 0} &bull; L: {request?.lunch_head_count || request?.head_count || 0} &bull; D: {request?.dinner_head_count || request?.head_count || 0}
              </p>
            </div>
            <div className="bg-background rounded-lg px-3 py-2 border">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={`${statusColors[request?.status] || ""} mt-0.5`}>{request?.status?.replace(/_/g, " ")}</Badge>
            </div>
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="h-[55vh] px-6">
          <div className="py-4 space-y-6" ref={printRef}>
            {/* SECTION 1: MEAL MENU */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                <UtensilsCrossed className="h-4 w-4" /> Meal Menu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {["Breakfast", "Lunch", "Dinner"].map((meal) => {
                  const mealItems = mealGroups[meal] || [];
                  const headCount = meal === "Breakfast" ? (request?.bf_head_count || request?.head_count || 0) :
                    meal === "Lunch" ? (request?.lunch_head_count || request?.head_count || 0) :
                    (request?.dinner_head_count || request?.head_count || 0);
                  return (
                    <Card key={meal} className="overflow-hidden">
                      <CardHeader className="py-2 px-3 bg-muted/50 border-b">
                        <CardTitle className="text-xs font-bold flex items-center justify-between">
                          <span>{mealIcons[meal]} {meal}</span>
                          <Badge variant="outline" className="text-xs">{headCount} pax</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {mealItems.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No items</p>
                        ) : (
                          <div className="divide-y">
                            {mealItems.map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                <span className="font-medium">{item.ingredients?.name}</span>
                                <span className="text-muted-foreground">{item.qty_per_person} {item.ingredients?.unit}/pax</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* SECTION 2: GROCERY LIST TABLE */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                <ShoppingCart className="h-4 w-4" /> Grocery List
                {mode === "approve" && <span className="text-xs font-normal normal-case ml-1">(Adjust approved quantities below)</span>}
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8 text-xs">#</TableHead>
                      <TableHead className="text-xs">Item Name</TableHead>
                      <TableHead className="text-xs">UOM</TableHead>
                      <TableHead className="text-xs text-right">Qty/Person</TableHead>
                      <TableHead className="text-xs text-right">Total Qty</TableHead>
                      {mode === "approve" && <TableHead className="text-xs text-right">Approved Qty</TableHead>}
                      {mode === "issue" && <TableHead className="text-xs text-right">Issue Qty</TableHead>}
                      <TableHead className="text-xs text-right">Rate (SAR)</TableHead>
                      <TableHead className="text-xs text-right">Total Price (SAR)</TableHead>
                      {mode !== "view" && <TableHead className="text-xs w-16">Stock</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localItems.map((item: any, idx: number) => {
                      const inStock = stockMap[item.ingredient_id] || 0;
                      const qty = mode === "issue" ? item.issued_qty : (mode === "approve" ? item.approved_qty : item.required_qty);
                      const unitCost = Number(item.unit_cost || 0);
                      const totalPrice = (Number(qty) || 0) * unitCost;
                      const isShort = inStock < (item.approved_qty || item.required_qty);
                      return (
                        <TableRow key={item.id} className={isShort && mode !== "view" ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-medium">
                            {item.ingredients?.name}
                            <Badge variant="outline" className="ml-1.5 text-[10px] py-0">{item.meal_type || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{item.ingredients?.unit}</TableCell>
                          <TableCell className="text-xs text-right">{item.qty_per_person}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{item.required_qty}</TableCell>
                          {mode === "approve" && (
                            <TableCell className="text-right">
                              <Input type="number" className="w-20 h-7 text-xs" value={item.approved_qty}
                                onChange={(e) => {
                                  const updated = [...localItems];
                                  updated[idx] = { ...updated[idx], approved_qty: Number(e.target.value) };
                                  setLocalItems(updated);
                                }}
                              />
                            </TableCell>
                          )}
                          {mode === "issue" && (
                            <TableCell className="text-right">
                              <Input type="number" className="w-20 h-7 text-xs" value={item.issued_qty}
                                onChange={(e) => {
                                  const updated = [...localItems];
                                  updated[idx] = { ...updated[idx], issued_qty: Number(e.target.value) };
                                  setLocalItems(updated);
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-xs text-right">{unitCost.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{totalPrice.toFixed(2)}</TableCell>
                          {mode !== "view" && (
                            <TableCell className="text-xs">
                              <span className={isShort ? "text-destructive font-bold" : "text-green-600 dark:text-green-400"}>
                                {inStock}
                              </span>
                              {isShort && <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-t font-bold text-sm">
                  <span>Grand Total ({localItems.length} items)</span>
                  <span className="text-primary text-lg">{grandTotal.toFixed(2)} SAR</span>
                </div>
              </div>
            </div>

            {request?.notes && (
              <div className="bg-muted/30 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{request.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center gap-2">
          {mode === "approve" && (
            <>
              <div className="flex-1">
                <Input placeholder="Rejection reason (if rejecting)" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="h-9" />
              </div>
              <Button variant="destructive" size="sm" onClick={handleReject} disabled={updateStatus.isPending}>
                <XCircle className="mr-1 h-4 w-4" /> Reject
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={updateItems.isPending || updateStatus.isPending}>
                <CheckCircle className="mr-1 h-4 w-4" /> Approve & Download PDF
              </Button>
            </>
          )}
          {mode === "issue" && (
            <Button size="sm" onClick={handleIssue} disabled={issueItems.isPending}>
              <Truck className="mr-1 h-4 w-4" /> Issue from Store
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={generatePDF}>
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// PURCHASE ORDERS PANEL
// ==========================================
function PurchaseOrdersPanel({
  campId, purchaseOrders, userId, selectedPOId, setSelectedPOId,
  showReceive, setShowReceive, updatePOStatus, receivePO,
}: any) {
  const { data: poItems } = usePurchaseOrderItems(selectedPOId);
  const [receiveItems, setReceiveItems] = useState<any[]>([]);

  useMemo(() => {
    if (poItems && showReceive) {
      setReceiveItems(poItems.map((i: any) => ({ ...i, received_qty: i.ordered_qty })));
    }
  }, [poItems, showReceive]);

  const selectedPO = purchaseOrders?.find((p: any) => p.id === selectedPOId);

  const handleApprovePO = () => {
    updatePOStatus.mutate(
      { id: selectedPOId!, status: "sent_to_vendor", approved_by: userId },
      { onSuccess: () => setSelectedPOId(null) }
    );
  };

  const handleReceive = () => {
    const items = receiveItems.map((i: any) => ({
      id: i.id, ingredient_id: i.ingredient_id, received_qty: i.received_qty,
    }));
    receivePO.mutate(
      { poId: selectedPOId!, campId, items },
      { onSuccess: () => { setShowReceive(false); setSelectedPOId(null); } }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Purchase Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {!campId ? (
          <p className="text-muted-foreground text-center py-8">Select a camp to view purchase orders</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No purchase orders found</TableCell>
                </TableRow>
              )}
              {purchaseOrders?.map((po: any) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.vendor_name || "—"}</TableCell>
                  <TableCell>{Number(po.total_amount).toFixed(2)} SAR</TableCell>
                  <TableCell><Badge className={statusColors[po.status] || ""}>{po.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedPOId(po.id); setShowReceive(false); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      {po.status === "draft" && (
                        <Button size="sm" onClick={() => { setSelectedPOId(po.id); setShowReceive(false); }}>
                          <Send className="h-3 w-3 mr-1" /> Send
                        </Button>
                      )}
                      {po.status === "sent_to_vendor" && (
                        <Button size="sm" variant="secondary" onClick={() => { setSelectedPOId(po.id); setShowReceive(true); }}>
                          <Package className="h-3 w-3 mr-1" /> Receive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {selectedPOId && (
          <Dialog open={true} onOpenChange={() => { setSelectedPOId(null); setShowReceive(false); }}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{showReceive ? "Receive Items" : "Purchase Order"} — {selectedPO?.po_number}</DialogTitle>
              </DialogHeader>
              <div className="text-sm mb-2 text-muted-foreground">{selectedPO?.notes}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Ordered</TableHead>
                    {showReceive && <TableHead>Received Qty</TableHead>}
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showReceive ? receiveItems : poItems)?.map((item: any, idx: number) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.ingredients?.name}</TableCell>
                      <TableCell>{item.required_qty}</TableCell>
                      <TableCell>{item.ordered_qty}</TableCell>
                      {showReceive && (
                        <TableCell>
                          <Input type="number" className="w-20 h-8" value={item.received_qty}
                            onChange={(e) => {
                              const updated = [...receiveItems];
                              updated[idx] = { ...updated[idx], received_qty: Number(e.target.value) };
                              setReceiveItems(updated);
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell>{item.unit_cost}</TableCell>
                      <TableCell>{Number(item.total_cost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DialogFooter>
                {showReceive ? (
                  <Button onClick={handleReceive} disabled={receivePO.isPending}>
                    <Package className="mr-1 h-4 w-4" /> Confirm Receipt & Update Stock
                  </Button>
                ) : selectedPO?.status === "draft" ? (
                  <Button onClick={handleApprovePO} disabled={updatePOStatus.isPending}>
                    <Send className="mr-1 h-4 w-4" /> Send to Vendor
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => { setSelectedPOId(null); setShowReceive(false); }}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
