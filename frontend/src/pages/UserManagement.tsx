import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, Ban, RotateCcw, Edit, Search, Users, Copy } from "lucide-react";

const ROLES = ["super_admin", "camp_manager", "hr_admin", "store_keeper", "maintenance_supervisor", "security"] as const;

const roleColors: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  camp_manager: "bg-primary/10 text-primary border-primary/20",
  hr_admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  store_keeper: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  maintenance_supervisor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  security: "bg-green-500/10 text-green-600 border-green-500/20",
};

export default function UserManagement() {
  const { session } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", full_name: "", role: "security" as string, password: "" });
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; password: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      return data.users || [];
    },
    enabled: isSuperAdmin,
  });

  const createUser = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "create_user", ...userData },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateOpen(false);
      setTempPasswordInfo({ email: newUser.email, password: data.temp_password });
      setNewUser({ email: "", full_name: "", role: "security", password: "" });
      toast({ title: "User created successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ userId, disable }: { userId: string; disable: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "toggle_user_status", target_user_id: userId, is_disabled: disable },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User status updated" });
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "change_role", target_user_id: userId, new_role: role },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated" });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "reset_password", target_user_id: userId, target_email: email },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, vars) => {
      setTempPasswordInfo({ email: vars.email, password: data.temp_password });
      toast({ title: "Password reset", description: "Temporary password generated" });
    },
  });

  const filtered = users.filter((u: any) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Access denied. Super Admin role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm">Create, manage, and configure user accounts</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus size={16} /> Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={e => { e.preventDefault(); createUser.mutate(newUser); }}
            >
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input type="email" required value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <Input required value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-medium">Role *</label>
                <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Temporary Password (auto-generated if blank)</label>
                <Input value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank for auto-generated" />
              </div>
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Temp password display */}
      {tempPasswordInfo && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">Temporary credentials for {tempPasswordInfo.email}</p>
                <p className="text-sm text-muted-foreground mt-1">Password: <code className="bg-muted px-2 py-0.5 rounded text-foreground">{tempPasswordInfo.password}</code></p>
                <p className="text-xs text-muted-foreground mt-1">Share securely. User must change on first login.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(tempPasswordInfo.password);
                  toast({ title: "Copied!" });
                }}><Copy size={14} /> Copy</Button>
                <Button size="sm" variant="ghost" onClick={() => setTempPasswordInfo(null)}>Dismiss</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{users.length}</div><p className="text-xs text-muted-foreground">Total Users</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{users.filter((u: any) => !u.is_disabled).length}</div><p className="text-xs text-muted-foreground">Active Users</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{users.filter((u: any) => u.is_disabled).length}</div><p className="text-xs text-muted-foreground">Disabled Users</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{new Set(users.flatMap((u: any) => u.roles)).size}</div><p className="text-xs text-muted-foreground">Roles in Use</p></CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input className="pl-9" placeholder="Search users by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : filtered.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.roles?.[0] || ""}
                      onValueChange={v => changeRole.mutate({ userId: user.id, role: v })}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue>
                          <Badge variant="outline" className={`${roleColors[user.roles?.[0]] || ""} text-xs`}>
                            {user.roles?.[0]?.replace(/_/g, " ") || "No role"}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_disabled ? "destructive" : "default"} className="text-xs">
                      {user.is_disabled ? "Disabled" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleStatus.mutate({ userId: user.id, disable: !user.is_disabled })}
                        title={user.is_disabled ? "Enable user" : "Disable user"}
                      >
                        <Ban size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resetPassword.mutate({ userId: user.id, email: user.email })}
                        title="Reset password"
                      >
                        <RotateCcw size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
