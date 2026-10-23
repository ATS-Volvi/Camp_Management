import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddEmployee, CAMP_STAFF_ROLES } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "own" | "supplier" | "camp_staff";
}

export default function AddEmployeeDialog({ open, onOpenChange, type }: Props) {
  const addEmployee = useAddEmployee();
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    employee_id: "",
    name: "",
    designation: "",
    department: "",
    company: "",
    supplier_name: "",
    phone: "",
    email: "",
    nationality: "",
    passport_number: "",
    project: "",
    status: "active",
    staff_role: "",
    camp_id: "",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const isCampStaff = type === "camp_staff";

  const handleSubmit = () => {
    if (!form.employee_id.trim() || !form.name.trim()) return;
    if (isCampStaff && !form.staff_role) return;
    if (isCampStaff && !form.camp_id) return;

    addEmployee.mutate(
      {
        employee_id: form.employee_id.trim(),
        name: form.name.trim(),
        employee_type: type,
        designation: isCampStaff ? form.staff_role : (form.designation || null),
        department: form.department || null,
        company: form.company || null,
        supplier_name: type === "supplier" ? form.supplier_name || null : null,
        phone: form.phone || null,
        email: form.email || null,
        nationality: form.nationality || null,
        passport_number: form.passport_number || null,
        project: form.project || null,
        status: form.status,
        staff_role: isCampStaff ? form.staff_role : null,
        camp_id: isCampStaff && form.camp_id ? form.camp_id : null,
      } as any,
      {
        onSuccess: () => {
          setForm({
            employee_id: "", name: "", designation: "", department: "", company: "",
            supplier_name: "", phone: "", email: "", nationality: "", passport_number: "",
            project: "", status: "active", staff_role: "", camp_id: "",
          });
          onOpenChange(false);
        },
      }
    );
  };

  const title = isCampStaff ? "Add Camp Staff" : `Add ${type === "own" ? "Own" : "Supplier"} Employee`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isCampStaff
              ? "Add a staff member and assign them to a camp."
              : "Fill in the employee details below."}
          </DialogDescription>
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
          {!isCampStaff && (
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Input value={form.project} onChange={(e) => update("project", e.target.value)} placeholder="Project Alpha" />
            </div>
          )}
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
          <Button onClick={handleSubmit} disabled={addEmployee.isPending}>
            {addEmployee.isPending ? "Adding..." : isCampStaff ? "Add Camp Staff" : "Add Employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
