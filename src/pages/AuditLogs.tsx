import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, FileText } from "lucide-react";

const actionColors: Record<string, string> = {
  user_created: "bg-green-500/10 text-green-600",
  user_disabled: "bg-destructive/10 text-destructive",
  user_enabled: "bg-blue-500/10 text-blue-600",
  role_changed: "bg-amber-500/10 text-amber-600",
  password_reset_by_admin: "bg-orange-500/10 text-orange-600",
  user_updated: "bg-primary/10 text-primary",
};

export default function AuditLogs() {
  const { isSuperAdmin } = usePermissions();
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  const filtered = logs.filter((l: any) =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.table_name?.toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(l.details)?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={24} /> Audit Logs</h1>
        <p className="text-muted-foreground text-sm">Track all system actions including user, role, and permission changes</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input className="pl-9" placeholder="Search audit logs..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No logs found</TableCell></TableRow>
              ) : filtered.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={actionColors[log.action] || ""}>
                      {log.action?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.table_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                    {log.details ? JSON.stringify(log.details) : "-"}
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
