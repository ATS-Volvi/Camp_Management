import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Loader2, Eye } from "lucide-react";
import { useCateringInvoices, useCreateInvoice } from "@/hooks/useGroceryInventory";
import { useCamps } from "@/hooks/useInventory";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function InvoiceUploadTab() {
  const [campId, setCampId] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ camp_id: "", invoice_number: "", vendor_name: "", invoice_date: new Date().toISOString().split("T")[0], total_amount: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<any>(null);

  const { data: invoices = [], isLoading } = useCateringInvoices(campId || undefined);
  const { data: camps = [] } = useCamps();
  const createInvoice = useCreateInvoice();
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleUpload = async () => {
    if (!form.camp_id || !form.invoice_number) {
      toast({ title: "Missing fields", description: "Camp and invoice number are required.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      let file_url: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${form.camp_id}/${Date.now()}-${form.invoice_number.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
        const { error: upErr } = await supabase.storage.from("invoices").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        file_url = path;
      }

      const created: any = await createInvoice.mutateAsync({
        ...form,
        file_url,
        parsing_status: file ? "pending" : "manual",
      });

      // Auto-parse if file uploaded
      if (file && created?.id) {
        await handleParseInvoice(created.id, true);
      }

      setForm({ camp_id: "", invoice_number: "", vendor_name: "", invoice_date: new Date().toISOString().split("T")[0], total_amount: 0 });
      setFile(null);
      setAddOpen(false);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleParseInvoice = async (invoiceId: string, silent = false) => {
    setParsingId(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("parse-invoice", {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      const updates = data?.updates || [];
      const matched = updates.filter((u: any) => u.status === "updated").length;
      toast({
        title: "Invoice parsed",
        description: `${data?.items_parsed || 0} items extracted, ${matched} ingredient prices updated.`,
      });
      qc.invalidateQueries({ queryKey: ["catering-invoices"] });
      qc.invalidateQueries({ queryKey: ["grocery-items"] });
      qc.invalidateQueries({ queryKey: ["all-price-history"] });
    } catch (e: any) {
      if (!silent) toast({ title: "Parsing failed", description: e.message, variant: "destructive" });
    } finally {
      setParsingId(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "parsed": return <CheckCircle className="text-green-600" size={16} />;
      case "failed": return <AlertCircle className="text-destructive" size={16} />;
      case "processing": return <Loader2 className="text-blue-500 animate-spin" size={16} />;
      default: return <Clock className="text-amber-500" size={16} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-[200px]">
          <Select value={campId} onValueChange={v => setCampId(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="All Camps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Upload size={16} className="mr-1" /> Upload Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Upload Purchase Invoice</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Camp *</Label>
                <Select value={form.camp_id} onValueChange={v => setForm({ ...form, camp_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
                  <SelectContent>
                    {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Invoice Number *</Label><Input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} /></div>
                <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} /></div>
                <div><Label>Total Amount (SAR)</Label><Input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: +e.target.value })} /></div>
              </div>
              <div>
                <Label>Invoice File (PDF / Image)</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    <FileText size={14} /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  AI will auto-extract line items and update grocery prices.
                </p>
              </div>
              <Button onClick={handleUpload} disabled={uploading || createInvoice.isPending} className="w-full">
                {uploading ? <><Loader2 className="animate-spin mr-2" size={16} /> Uploading & parsing...</> : "Save & Parse Invoice"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount (SAR)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number || "—"}</TableCell>
                  <TableCell>{inv.camps?.name || "—"}</TableCell>
                  <TableCell>{inv.vendor_name || "—"}</TableCell>
                  <TableCell>{format(new Date(inv.invoice_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-mono">{Number(inv.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(inv.parsing_status)}
                      <Badge variant="outline" className="text-xs capitalize">{inv.parsing_status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {inv.file_url && inv.parsing_status !== "parsed" && (
                      <Button size="sm" variant="outline" onClick={() => handleParseInvoice(inv.id)} disabled={parsingId === inv.id}>
                        {parsingId === inv.id ? <Loader2 className="animate-spin" size={14} /> : "Parse"}
                      </Button>
                    )}
                    {inv.parsed_data && (
                      <Button size="sm" variant="ghost" onClick={() => setViewData(inv.parsed_data)}>
                        <Eye size={14} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewData} onOpenChange={(o) => !o && setViewData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Parsed Invoice Items</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Vendor:</span> {viewData.vendor_name}</div>
                <div><span className="text-muted-foreground">Invoice:</span> {viewData.invoice_number}</div>
                <div><span className="text-muted-foreground">Total:</span> SAR {viewData.total_amount}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(viewData.items || []).map((it: any, idx: number) => {
                    const upd = (viewData.updates || []).find((u: any) => u.name?.toLowerCase() === it.name?.toLowerCase());
                    return (
                      <TableRow key={idx}>
                        <TableCell>{it.name}</TableCell>
                        <TableCell>{it.quantity} {it.unit}</TableCell>
                        <TableCell className="font-mono">{it.unit_price}</TableCell>
                        <TableCell>
                          <Badge variant={upd?.status === "updated" ? "default" : "secondary"} className="text-xs">
                            {upd?.status || "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
