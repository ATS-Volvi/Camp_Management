import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const ROLES = ["super_admin", "camp_manager", "hr_admin", "store_keeper", "maintenance_supervisor", "security"] as const;

const moduleLabels: Record<string, string> = {
  dashboard: "Dashboard",
  employees: "Employee Master",
  camps: "Camp Management",
  checkinout: "Check-In / Out",
  maintenance: "Repair & Maintenance",
  inventory: "Inventory",
  assets: "Asset Management",
  assignments: "Item Assignments",
  attendance: "Attendance",
  catering: "Mess & Catering",
  visitors: "Visitor Management",
  reports: "Reports",
  alerts: "Alerts & Notifications",
  activities: "Activities",
  admin: "Administration",
};

export default function PermissionMatrix() {
  const { isSuperAdmin } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissions = [] } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data } = await supabase.from("permissions").select("*").order("module").order("feature").order("action");
      return data || [];
    },
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ["all-role-permissions"],
    queryFn: async () => {
      const { data } = await supabase.from("role_permissions").select("*");
      return data || [];
    },
  });

  const togglePermission = useMutation({
    mutationFn: async ({ role, permissionId, granted }: { role: string; permissionId: string; granted: boolean }) => {
      const existing = rolePermissions.find(
        (rp: any) => rp.role === role && rp.permission_id === permissionId
      );
      if (existing) {
        if (granted) {
          await supabase.from("role_permissions").update({ granted }).eq("id", existing.id);
        } else {
          await supabase.from("role_permissions").delete().eq("id", existing.id);
        }
      } else if (granted) {
        await supabase.from("role_permissions").insert({ role: role as any, permission_id: permissionId, granted: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-role-permissions"] });
      toast({ title: "Permission updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isGranted = (role: string, permId: string) =>
    rolePermissions.some((rp: any) => rp.role === role && rp.permission_id === permId && rp.granted);

  // Group permissions by module
  const grouped = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    acc[p.module] = acc[p.module] || [];
    acc[p.module].push(p);
    return acc;
  }, {});

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Access denied. Super Admin role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield size={24} /> Permission Matrix
        </h1>
        <p className="text-muted-foreground text-sm">Configure role-based permissions. Changes take effect immediately.</p>
      </div>

      {Object.entries(grouped).map(([module, perms]) => (
        <Card key={module}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{moduleLabels[module] || module}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Permission</TableHead>
                    {ROLES.map(r => (
                      <TableHead key={r} className="text-center text-xs">
                        {r.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(perms as any[]).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <span className="text-sm">{p.description || `${p.feature} - ${p.action}`}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">{p.action}</Badge>
                        </div>
                      </TableCell>
                      {ROLES.map(role => (
                        <TableCell key={role} className="text-center">
                          <Checkbox
                            checked={isGranted(role, p.id)}
                            onCheckedChange={checked =>
                              togglePermission.mutate({ role, permissionId: p.id, granted: !!checked })
                            }
                            disabled={role === "super_admin"}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
