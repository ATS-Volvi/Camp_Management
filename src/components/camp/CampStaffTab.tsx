import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, KeyRound, Shield } from "lucide-react";
import { toast } from "sonner";

interface CampStaffTabProps {
  campId: string;
}

const roleAppRoleMap: Record<string, string> = {
  Warden: "Camp Manager",
  Supervisor: "Camp Manager",
  Electrician: "Maintenance Supervisor",
  Plumber: "Maintenance Supervisor",
  "Security Guard": "Security",
  Cook: "Store Keeper",
  Cleaner: "Store Keeper",
  Driver: "Store Keeper",
};

export default function CampStaffTab({ campId }: CampStaffTabProps) {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["camp-staff", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_type", "camp_staff")
        .eq("camp_id", campId)
        .order("staff_role");
      if (error) throw error;
      return data;
    },
  });

  const createLogin = useMutation({
    mutationFn: async ({ employeeId, email, password, staffRole }: {
      employeeId: string;
      email: string;
      password: string;
      staffRole: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("create-staff-login", {
        body: {
          email,
          password,
          employee_id: employeeId,
          staff_role: staffRole,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["camp-staff", campId] });
      setLoginDialogOpen(false);
      setEmail("");
      setPassword("");
      setSelectedStaff(null);
      toast.success(`Login created. Assigned role: ${data.role}`);
    },
    onError: (error) => {
      toast.error("Failed to create login: " + error.message);
    },
  });

  const handleCreateLogin = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setEmail(staffMember.email || "");
    setPassword("");
    setLoginDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading staff...</div>;
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No camp staff assigned. Add staff from Employee Master → Camp Staff tab.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Camp Staff ({staff.length})</h2>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>System Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium font-mono text-xs">{s.employee_id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-medium">
                    {s.staff_role || "—"}
                  </Badge>
                </TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell>{s.email || "—"}</TableCell>
                <TableCell>
                  {s.user_id ? (
                    <div className="flex items-center gap-1.5">
                      <Shield size={14} className="text-green-600" />
                      <span className="text-xs text-green-600 font-medium">
                        {roleAppRoleMap[s.staff_role] || "Active"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No login</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      s.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800"
                    }
                    variant="secondary"
                  >
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {!s.user_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateLogin(s)}
                      className="gap-1"
                    >
                      <KeyRound size={14} /> Create Login
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={(open) => { setLoginDialogOpen(open); if (!open) setSelectedStaff(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} /> Create Staff Login
            </DialogTitle>
            <DialogDescription>
              Create system login for <strong>{selectedStaff?.name}</strong> ({selectedStaff?.staff_role}).
              They will be assigned the <strong>{roleAppRoleMap[selectedStaff?.staff_role] || "Security"}</strong> role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
              <p className="font-medium">Access will be granted:</p>
              <p className="text-muted-foreground">
                Role: <strong>{roleAppRoleMap[selectedStaff?.staff_role] || "Security"}</strong>
              </p>
              <p className="text-muted-foreground">
                Camp: <strong>This camp only</strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoginDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!email || !password || password.length < 6) {
                  toast.error("Please provide a valid email and password (min 6 chars)");
                  return;
                }
                createLogin.mutate({
                  employeeId: selectedStaff.id,
                  email,
                  password,
                  staffRole: selectedStaff.staff_role,
                });
              }}
              disabled={createLogin.isPending}
            >
              {createLogin.isPending ? "Creating..." : "Create Login"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
