import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { QRCodeCanvas } from "qrcode.react";
import { useEmployees } from "@/hooks/useEmployees";
import { Download, Printer } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EmployeeQRDialog({ open, onClose }: Props) {
  const { data: employees = [] } = useEmployees();
  const [employeeId, setEmployeeId] = useState<string>("");
  const emp = employees.find((e: any) => e.id === employeeId);

  const handleDownload = () => {
    const canvas = document.getElementById("emp-qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${(emp as any)?.employee_id ?? employeeId}.png`;
    a.click();
  };

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Employee Meal QR</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {e.employee_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {emp && (
            <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-card">
              <QRCodeCanvas id="emp-qr-canvas" value={(emp as any).id} size={220} includeMargin />
              <div className="text-center">
                <div className="font-semibold">{(emp as any).name}</div>
                <div className="text-sm text-muted-foreground">{(emp as any).employee_id}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
