import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PMTask, useUpdateTask } from "@/hooks/usePreventiveMaintenance";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: PMTask | null;
}

export default function CompleteTaskDialog({ open, onOpenChange, task }: Props) {
  const update = useUpdateTask();
  const { user } = useAuth() as any;
  const [performedBy, setPerformedBy] = useState("");
  const [issues, setIssues] = useState("");
  const [action, setAction] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) {
      setPerformedBy(task?.assigned_to_name ?? user?.email ?? "");
      setIssues("");
      setAction("");
      setRemarks("");
    }
  }, [open, task, user]);

  if (!task) return null;

  const submit = async () => {
    await update.mutateAsync({
      id: task.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by_name: performedBy || null,
      issues_identified: issues || null,
      action_taken: action || null,
      remarks: remarks || null,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Maintenance — {task.pm_equipment?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Machine: <span className="font-medium text-foreground">{task.pm_equipment?.machine_code}</span> • Due: {task.due_date}
          </div>
          <div>
            <Label>Performed by</Label>
            <Input value={performedBy} onChange={e => setPerformedBy(e.target.value)} placeholder="Technician name" />
          </div>
          <div>
            <Label>Issues identified</Label>
            <Textarea value={issues} onChange={e => setIssues(e.target.value)} rows={2} placeholder="Any problems found?" />
          </div>
          <div>
            <Label>Action taken</Label>
            <Textarea value={action} onChange={e => setAction(e.target.value)} rows={2} placeholder="What was done?" />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={update.isPending}>Mark Completed</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
