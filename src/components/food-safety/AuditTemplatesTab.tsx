import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Settings, Pencil, Eye, ArrowLeft, GripVertical, AlertTriangle } from "lucide-react";
import {
  useAuditTemplates, useCreateAuditTemplate, useUpdateAuditTemplate,
  useDeleteAuditTemplate, useAddTemplateItem, useUpdateTemplateItem,
  useDeleteTemplateItem, AuditTemplateItem,
} from "@/hooks/useFoodSafetyAudit";

const CATEGORIES = [
  "Personal Hygiene", "Kitchen Hygiene", "Food Storage", "Food Preparation",
  "Food Serving", "Pest Control", "Water & Sanitation", "Documentation",
  "Temperature Control", "Staff Personal Hygiene", "Waste Management",
  "Equipment Cleanliness", "Expiry & FIFO Compliance",
];

const CATEGORY_TYPES = ["Safety", "Hygiene", "Storage", "Cooking", "Serving", "Utility", "Compliance", "General"];

const RESPONSE_TYPES = [
  { value: "yes_no", label: "Yes / No" },
  { value: "rating", label: "Score (0-2)" },
  { value: "remarks", label: "Remarks Only" },
];

interface NewItem {
  category: string;
  question: string;
  response_type: string;
  is_critical: boolean;
  photo_required: boolean;
  sort_order: number;
  weight: number;
  allow_remarks: boolean;
  ncr_enabled: boolean;
  severity_applicable: boolean;
  category_type: string;
}

const defaultItem = (): NewItem => ({
  category: CATEGORIES[0], question: "", response_type: "rating",
  is_critical: true, photo_required: true, sort_order: 0,
  weight: 2, allow_remarks: true, ncr_enabled: true,
  severity_applicable: true, category_type: "Safety",
});

export default function AuditTemplatesTab() {
  const { data: templates = [] } = useAuditTemplates();
  const createTemplate = useCreateAuditTemplate();
  const updateTemplate = useUpdateAuditTemplate();
  const deleteTemplate = useDeleteAuditTemplate();
  const addItem = useAddTemplateItem();
  const updateItem = useUpdateTemplateItem();
  const deleteItem = useDeleteTemplateItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [auditType, setAuditType] = useState("daily");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<NewItem[]>([]);

  // Detail view
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AuditTemplateItem>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newItem, setNewItem] = useState<NewItem>(defaultItem());

  // Edit template meta
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [editTemplateMeta, setEditTemplateMeta] = useState({ id: "", name: "", audit_type: "", description: "" });

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleAddNewItem = () => {
    setItems([...items, defaultItem()]);
  };

  const updateNewItem = (idx: number, field: keyof NewItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const removeNewItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleCreate = () => {
    if (!name.trim() || items.length === 0) return;
    createTemplate.mutate({ name, audit_type: auditType, description, items }, {
      onSuccess: () => {
        setCreateOpen(false);
        setName(""); setDescription(""); setItems([]);
      }
    });
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Delete this template and all its questions?")) {
      deleteTemplate.mutate(id, { onSuccess: () => setSelectedTemplateId(null) });
    }
  };

  const startEditItem = (item: AuditTemplateItem) => {
    setEditingItemId(item.id);
    setEditData({ ...item });
  };

  const saveEditItem = () => {
    if (!editingItemId || !editData.question?.trim()) return;
    updateItem.mutate({ id: editingItemId, ...editData } as any, {
      onSuccess: () => { setEditingItemId(null); setEditData({}); }
    });
  };

  const handleAddItemToTemplate = () => {
    if (!selectedTemplateId || !newItem.question.trim()) return;
    const sortOrder = (selectedTemplate?.audit_template_items?.length || 0) + 1;
    addItem.mutate({ ...newItem, template_id: selectedTemplateId, sort_order: sortOrder } as any, {
      onSuccess: () => { setAddingNew(false); setNewItem(defaultItem()); }
    });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Delete this question?")) deleteItem.mutate(id);
  };

  // Template Detail View
  if (selectedTemplate) {
    const groupedItems = (selectedTemplate.audit_template_items || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, AuditTemplateItem[]>);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTemplateId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
            <p className="text-xs text-muted-foreground">{selectedTemplate.description || "No description"}</p>
          </div>
          <Badge variant="outline">{selectedTemplate.audit_type}</Badge>
          <Button variant="outline" size="sm" onClick={() => {
            setEditTemplateMeta({ id: selectedTemplate.id, name: selectedTemplate.name, audit_type: selectedTemplate.audit_type, description: selectedTemplate.description || "" });
            setEditTemplateOpen(true);
          }}>
            <Pencil className="h-3 w-3 mr-1" /> Edit Info
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(selectedTemplate.id)}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{selectedTemplate.audit_template_items?.length || 0} questions</p>
          <Button size="sm" onClick={() => { setAddingNew(true); setNewItem(defaultItem()); }}>
            <Plus className="h-3 w-3 mr-1" /> Add Question
          </Button>
        </div>

        {addingNew && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="col-span-2" placeholder="Question..." value={newItem.question} onChange={e => setNewItem({ ...newItem, question: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={newItem.response_type} onValueChange={v => setNewItem({ ...newItem, response_type: v })}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{RESPONSE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={newItem.category_type} onValueChange={v => setNewItem({ ...newItem, category_type: v })}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORY_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" className="w-[70px]" value={newItem.weight} onChange={e => setNewItem({ ...newItem, weight: Number(e.target.value) })} />
                <label className="flex items-center gap-1 text-xs"><Checkbox checked={newItem.is_critical} onCheckedChange={v => setNewItem({ ...newItem, is_critical: !!v })} /> Critical</label>
                <label className="flex items-center gap-1 text-xs"><Checkbox checked={newItem.photo_required} onCheckedChange={v => setNewItem({ ...newItem, photo_required: !!v })} /> Photo</label>
                <label className="flex items-center gap-1 text-xs"><Checkbox checked={newItem.ncr_enabled} onCheckedChange={v => setNewItem({ ...newItem, ncr_enabled: !!v })} /> NCR</label>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAddItemToTemplate} disabled={!newItem.question.trim()}>Save</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {Object.entries(groupedItems).map(([category, catItems]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="text-[10px]">{catItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[80px]">Category</TableHead>
                    <TableHead className="w-[60px]">Weight</TableHead>
                    <TableHead className="w-[60px]">Flags</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catItems.map(item => editingItemId === item.id ? (
                    <TableRow key={item.id} className="bg-primary/5">
                      <TableCell>{item.sort_order}</TableCell>
                      <TableCell>
                        <Input value={editData.question || ""} onChange={e => setEditData({ ...editData, question: e.target.value })} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Select value={editData.response_type || "rating"} onValueChange={v => setEditData({ ...editData, response_type: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{RESPONSE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={editData.category_type || "General"} onValueChange={v => setEditData({ ...editData, category_type: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORY_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 w-14" value={editData.weight ?? 1} onChange={e => setEditData({ ...editData, weight: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1 text-[10px]"><Checkbox checked={editData.is_critical} onCheckedChange={v => setEditData({ ...editData, is_critical: !!v })} />Crit</label>
                          <label className="flex items-center gap-1 text-[10px]"><Checkbox checked={editData.ncr_enabled} onCheckedChange={v => setEditData({ ...editData, ncr_enabled: !!v })} />NCR</label>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditItem}>✓</Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingItemId(null)}>✕</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-xs">{item.sort_order}</TableCell>
                      <TableCell className="text-sm">{item.question}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {RESPONSE_TYPES.find(r => r.value === item.response_type)?.label || item.response_type}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{item.category_type}</Badge></TableCell>
                      <TableCell className="text-center font-medium">{item.weight}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.is_critical && <AlertTriangle className="h-3 w-3 text-destructive" />}
                          {item.ncr_enabled && <span className="text-[9px] text-orange-500 font-bold">NCR</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditItem(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {/* Edit Template Meta Dialog */}
        <Dialog open={editTemplateOpen} onOpenChange={setEditTemplateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editTemplateMeta.name} onChange={e => setEditTemplateMeta({ ...editTemplateMeta, name: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={editTemplateMeta.audit_type} onValueChange={v => setEditTemplateMeta({ ...editTemplateMeta, audit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="surprise">Surprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={editTemplateMeta.description} onChange={e => setEditTemplateMeta({ ...editTemplateMeta, description: e.target.value })} rows={2} /></div>
              <Button className="w-full" onClick={() => {
                updateTemplate.mutate(editTemplateMeta, { onSuccess: () => setEditTemplateOpen(false) });
              }}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Template List View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Audit Templates</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Audit Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Template Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Kitchen Inspection" /></div>
                <div><Label>Audit Type</Label>
                  <Select value={auditType} onValueChange={setAuditType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="surprise">Surprise Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-semibold">Checklist Items</Label>
                  <Button variant="outline" size="sm" onClick={handleAddNewItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="p-3 mb-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={item.category} onValueChange={v => updateNewItem(idx, "category", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="col-span-2" placeholder="Question..." value={item.question} onChange={e => updateNewItem(idx, "question", e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Select value={item.response_type} onValueChange={v => updateNewItem(idx, "response_type", v)}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{RESPONSE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={item.category_type} onValueChange={v => updateNewItem(idx, "category_type", v)}>
                        <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORY_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" className="w-[60px]" placeholder="Wt" value={item.weight} onChange={e => updateNewItem(idx, "weight", Number(e.target.value))} />
                      <label className="flex items-center gap-1 text-xs"><Checkbox checked={item.is_critical} onCheckedChange={v => updateNewItem(idx, "is_critical", v)} /> Critical</label>
                      <label className="flex items-center gap-1 text-xs"><Checkbox checked={item.photo_required} onCheckedChange={v => updateNewItem(idx, "photo_required", v)} /> Photo</label>
                      <label className="flex items-center gap-1 text-xs"><Checkbox checked={item.ncr_enabled} onCheckedChange={v => updateNewItem(idx, "ncr_enabled", v)} /> NCR</label>
                      <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={() => removeNewItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Add checklist items to build your template</p>}
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={createTemplate.isPending || !name.trim() || items.length === 0}>
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTemplateId(t.id)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                <Badge variant="outline" className="text-[10px]">{t.audit_type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">{t.description || "No description"}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  <Settings className="h-3 w-3 mr-1" />
                  {t.audit_template_items?.length || 0} items
                </Badge>
                {t.is_active ? (
                  <Badge className="text-[10px] bg-green-100 text-green-700">Active</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No templates yet. Create your first audit template to get started.
          </div>
        )}
      </div>
    </div >
  );
}
