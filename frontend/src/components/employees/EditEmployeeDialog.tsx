import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateEmployee, CAMP_STAFF_ROLES, Employee } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "own" | "supplier" | "camp_staff";
  employee: Employee | null;
}

const emptyForm = {
  employee_id: "",
  name: "",
  designation: "",
  department: "",
  sap_department: "",
  employee_group: "",
  current_location: "",
  remarks: "",
  company: "",
  supplier_name: "",
  phone: "",
  email: "",
  nationality: "",
  passport_number: "",
  iqama_number: "",
  project: "",
  status: "active",
  staff_role: "",
  camp_id: "",
};

export default function EditEmployeeDialog({ open, onOpenChange, type, employee }: Props) {
  const updateEmployee = useUpdateEmployee();
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: camps = [] } = useQuery({
    queryKey: ["camps-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open && employee) {
      setForm({
        employee_id: employee.employee_id || "",
        name: employee.name || "",
        designation: employee.designation || "",
        department: employee.department || "",
        sap_department: employee.sap_department || "",
        employee_group: employee.employee_group || "",
        current_location: employee.current_location || "",
        remarks: employee.remarks || "",
        company: employee.company || "",
        supplier_name: employee.supplier_name || "",
        phone: employee.phone || "",
        email: employee.email || "",
        nationality: employee.nationality || "",
        passport_number: employee.passport_number || "",
        iqama_number: employee.iqama_number || "",
        project: employee.project || "",
        status: employee.status || "active",
        staff_role: employee.staff_role || employee.designation || "",
        camp_id: employee.camp_id || "",
      });
    }
  }, [open, employee]);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const isCampStaff = type === "camp_staff";

  const handleSubmit = () => {
    if (!employee) return;
    if (!form.employee_id.trim() || !form.name.trim()) return;
    if (isCampStaff && !form.staff_role) return;
    if (isCampStaff && !form.camp_id) return;

    updateEmployee.mutate(
      {
        id: employee.id,
        employee_id: form.employee_id.trim(),
        name: form.name.trim(),
        employee_type: type,
        designation: isCampStaff ? form.staff_role : (form.designation || null),
        department: form.department || null,
        sap_department: form.sap_department || null,
        employee_group: form.employee_group || null,
        current_location: form.current_location || null,
        remarks: form.remarks || null,
        company: form.company || null,
        supplier_name: type === "supplier" ? form.supplier_name || null : null,
        phone: form.phone || null,
        email: form.email || null,
        nationality: form.nationality || null,
        passport_number: form.passport_number || null,
        iqama_number: form.iqama_number || null,
        project: form.project || null,
        status: form.status,
        staff_role: isCampStaff ? form.staff_role : null,
        camp_id: isCampStaff && form.camp_id ? form.camp_id : null,
      } as any,
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const title = isCampStaff ? "Edit Camp Staff" : `Edit ${type === "own" ? "Own" : "Supplier"} Employee`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Update the employee details below.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Employee ID *</Label>
            <Input value={form.employee_id} onChange={(e) => update("employee_id", e.target.value)} placeholder="EMP-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="John Doe" />
          </div>

          {isCampStaff ? (
            <>
              <div className="space-y-1.5">
                <Label>Staff Role *</Label>
                <Select value={form.staff_role} onValueChange={(v) => update("staff_role", v)}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {CAMP_STAFF_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign to Camp *</Label>
                <Select value={form.camp_id} onValueChange={(v) => update("camp_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
                  <SelectContent>
                    {camps.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Select value={form.designation} onValueChange={(v) => update("designation", v)}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => update("department", v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department as per SAP</Label>
                <Input value={form.sap_department} onChange={(e) => update("sap_department", e.target.value)} placeholder="e.g. 1000-PSD" />
              </div>
              <div className="space-y-1.5">
                <Label>Employee Group</Label>
                <Input value={form.employee_group} onChange={(e) => update("employee_group", e.target.value)} placeholder="e.g. Skilled / Labour" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="ABC Corp" />
          </div>
          {type === "supplier" && (
            <div className="space-y-1.5">
              <Label>Supplier Name</Label>
              <Input value={form.supplier_name} onChange={(e) => update("supplier_name", e.target.value)} placeholder="Supplier Co." />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+966..." />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Nationality</Label>
            <Input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="Indian" />
          </div>
          <div className="space-y-1.5">
            <Label>Passport Number</Label>
            <Input value={form.passport_number} onChange={(e) => update("passport_number", e.target.value)} placeholder="A1234567" />
          </div>
          <div className="space-y-1.5">
            <Label>Iqama Number</Label>
            <Input value={form.iqama_number} onChange={(e) => update("iqama_number", e.target.value)} placeholder="2XXXXXXXXX" />
          </div>
          {!isCampStaff && (
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Input value={form.project} onChange={(e) => update("project", e.target.value)} placeholder="Project Alpha" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Current Location</Label>
            <Input value={form.current_location} onChange={(e) => update("current_location", e.target.value)} placeholder="e.g. Riyadh" />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input value={form.remarks} onChange={(e) => update("remarks", e.target.value)} placeholder="Any notes" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
