import { useState } from "react";
import { Search, Filter, Download, Plus, MoreHorizontal, ChevronLeft, ChevronRight, UserPlus, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import AddMaintenanceForm from "@/components/maintenance/AddMaintenanceForm";
import StaffWorkloadPanel from "@/components/maintenance/StaffWorkloadPanel";
import AssignTicketDialog from "@/components/maintenance/AssignTicketDialog";
import AssignmentHistoryPanel from "@/components/maintenance/AssignmentHistoryPanel";
import { useAuth } from "@/contexts/AuthContext";

type TabFilter = "All Tasks" | "open" | "in_progress" | "completed";

interface MaintenanceTicket {
  id: string;
  camp_id: string;
  room_id: string | null;
  category: string;
  description: string;
  priority: "low" | "medium" | "high" | "emergency";
  status: "open" | "in_progress" | "completed";
  assigned_to: string | null;
  cost: number | null;
  created_at: string;
  camps?: { name: string };
  rooms?: { room_number: string; buildings?: { name: string } };
}

export default function RepairMaintenance() {
  const [activeTab, setActiveTab] = useState<TabFilter>("All Tasks");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState<MaintenanceTicket | null>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [historyTicketId, setHistoryTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mainTab, setMainTab] = useState("tickets");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const tabs: { label: string; value: TabFilter }[] = [
    { label: "All Tasks", value: "All Tasks" },
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
  ];

  const { data: camps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-for-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number, camp_id, buildings(name)")
        .order("room_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["maintenance-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select(`*, camps(name), rooms(room_number, buildings(name))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MaintenanceTicket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (ticket: {
      camp_id: string;
      room_id: string | null;
      category: string;
      description: string;
      priority: "low" | "medium" | "high" | "emergency";
      assigned_to: string | null;
    }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("maintenance_tickets").insert({ ...ticket, reported_by: authUser.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setDialogOpen(false);
      toast.success("Maintenance ticket created successfully");
    },
    onError: (error) => toast.error("Failed to create ticket: " + error.message),
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      camp_id: string;
      room_id: string | null;
      category: string;
      description: string;
      priority: "low" | "medium" | "high" | "emergency";
      status: "open" | "in_progress" | "completed";
      assigned_to: string | null;
      cost: number | null;
    }) => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setEditDialogOpen(false);
      setEditingTicket(null);
      toast.success("Ticket updated successfully");
    },
    onError: (error) => toast.error("Failed to update ticket: " + error.message),
  });

  const quickStatusUpdate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "open" | "in_progress" | "completed" }) => {
      const { error } = await supabase.from("maintenance_tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      toast.success("Status updated");
    },
    onError: (error) => toast.error("Failed to update status: " + error.message),
  });

  const assignTicket = useMutation({
    mutationFn: async ({ ticketId, staffName, notes }: { ticketId: string; staffName: string; notes: string }) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      const previousAssignee = ticket?.assigned_to || null;

      // Update ticket
      const { error: updateErr } = await supabase
        .from("maintenance_tickets")
        .update({ assigned_to: staffName, status: "in_progress" as const })
        .eq("id", ticketId);
      if (updateErr) throw updateErr;

      // Log assignment history
      await supabase.from("maintenance_assignment_history").insert({
        ticket_id: ticketId,
        assigned_to: staffName,
        assigned_from: previousAssignee,
        assigned_by: user?.id || null,
        action: previousAssignee ? "reassigned" : "assigned",
        notes: notes || null,
      });

      // Create notification
      await supabase.from("notifications").insert({
        employee_name: staffName,
        title: "Ticket Assigned",
        message: `Maintenance ticket for "${ticket?.category}" has been assigned to you. ${ticket?.description?.substring(0, 80)}...`,
        type: "assignment",
        reference_id: ticketId,
        reference_type: "maintenance_ticket",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["staff-workloads"] });
      queryClient.invalidateQueries({ queryKey: ["staff-ticket-counts"] });
      setAssignDialogOpen(false);
      setAssigningTicket(null);
      toast.success("Ticket assigned successfully");
    },
    onError: (error) => toast.error("Failed to assign: " + error.message),
  });

  const filtered = tickets.filter((t) => {
    const matchesTab = activeTab === "All Tasks" || t.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.camps?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const priorityClass: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    emergency: "bg-destructive/10 text-destructive",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  const statusClass: Record<string, string> = {
    in_progress: "bg-primary/10 text-primary",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    open: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  const statusLabel: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const handleEdit = (ticket: MaintenanceTicket) => {
    setEditingTicket(ticket);
    setEditDialogOpen(true);
  };

  const handleAssign = (ticket: MaintenanceTicket) => {
    setAssigningTicket(ticket);
    setAssignDialogOpen(true);
  };

  const handleViewHistory = (ticketId: string) => {
    setHistoryTicketId(ticketId);
    setHistorySheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Home / Repair & Maintenance</div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Repair & Maintenance</h1>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors">
            <Download size={16} /> Export
          </button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                <Plus size={16} /> Add Maintenance
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Maintenance Ticket</DialogTitle>
              </DialogHeader>
              <AddMaintenanceForm
                camps={camps}
                rooms={rooms}
                onSubmit={(data) => createTicket.mutate(data)}
                isLoading={createTicket.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="workload">Staff Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4 mt-4">
          {/* Status filter tabs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm">
                <Search size={16} className="text-muted-foreground" />
                <input
                  placeholder="Search tasks or staff..."
                  className="bg-transparent outline-none text-sm w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm">
                <Filter size={14} /> Filters
              </button>
            </div>
          </div>

          {/* Tickets table */}
          <div className="bg-card rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No maintenance tickets found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Camp Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Block</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Room</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Assigned To</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date Reported</th>
                    <th className="text-left p-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ticket) => (
                    <tr key={ticket.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{ticket.camps?.name || "-"}</td>
                      <td className="p-3">{ticket.rooms?.buildings?.name || "-"}</td>
                      <td className="p-3">{ticket.rooms?.room_number || "-"}</td>
                      <td className="p-3">{ticket.category}</td>
                      <td className="p-3 max-w-[200px] truncate">{ticket.description}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityClass[ticket.priority]}`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass[ticket.status]}`}>
                          {statusLabel[ticket.status]}
                        </span>
                      </td>
                      <td className="p-3">
                        {ticket.assigned_to ? (
                          <span className="text-sm">{ticket.assigned_to}</span>
                        ) : (
                          <button
                            onClick={() => handleAssign(ticket)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <UserPlus size={12} /> Assign
                          </button>
                        )}
                      </td>
                      <td className="p-3">{format(new Date(ticket.created_at), "dd MMM yyyy")}</td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-muted">
                              <MoreHorizontal size={16} className="text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(ticket)}>
                              Edit Ticket
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssign(ticket)}>
                              <UserPlus size={14} className="mr-2" />
                              {ticket.assigned_to ? "Reassign" : "Assign"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewHistory(ticket.id)}>
                              <History size={14} className="mr-2" />
                              Assignment History
                            </DropdownMenuItem>
                            {ticket.status !== "open" && (
                              <DropdownMenuItem onClick={() => quickStatusUpdate.mutate({ id: ticket.id, status: "open" })}>
                                Mark as Open
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== "in_progress" && (
                              <DropdownMenuItem onClick={() => quickStatusUpdate.mutate({ id: ticket.id, status: "in_progress" })}>
                                Mark as In Progress
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== "completed" && (
                              <DropdownMenuItem onClick={() => quickStatusUpdate.mutate({ id: ticket.id, status: "completed" })}>
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} /> Previous
            </button>
            <div className="text-sm text-muted-foreground">{filtered.length} tickets</div>
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {camps.map((camp) => (
              <div key={camp.id} className="bg-card rounded-xl border p-4">
                <h3 className="font-semibold text-foreground mb-3">{camp.name}</h3>
                <StaffWorkloadPanel campFilter={camp.id} />
              </div>
            ))}
            {camps.length === 0 && (
              <div className="col-span-2 text-center text-muted-foreground py-8">No camps found</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingTicket(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Ticket</DialogTitle>
          </DialogHeader>
          {editingTicket && (
            <AddMaintenanceForm
              camps={camps}
              rooms={rooms}
              onSubmit={(data) => updateTicket.mutate({ id: editingTicket.id, ...data })}
              isLoading={updateTicket.isPending}
              initialData={editingTicket}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <AssignTicketDialog
        open={assignDialogOpen}
        onOpenChange={(open) => { setAssignDialogOpen(open); if (!open) setAssigningTicket(null); }}
        ticket={assigningTicket}
        onAssign={(ticketId, staffName, notes) => assignTicket.mutate({ ticketId, staffName, notes })}
        isLoading={assignTicket.isPending}
      />

      {/* Assignment History Sheet */}
      <Sheet open={historySheetOpen} onOpenChange={setHistorySheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Assignment History</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {historyTicketId && <AssignmentHistoryPanel ticketId={historyTicketId} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
