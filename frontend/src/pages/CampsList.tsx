import { useNavigate } from "react-router-dom";
import { Plus, Search, MapPin, Building2, Users, BedDouble, ArrowUpRight, LayoutGrid, List, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddCampDialog from "@/components/camps/AddCampDialog";
import CampsOverview from "@/components/camps/CampsOverview";
import CampsReports from "@/components/camps/CampsReports";
import { useCamps } from "@/hooks/useCampManagement";

export default function CampsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: camps = [], isLoading } = useCamps();

  const filtered = camps.filter(
    (c: any) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase()) ||
      (c.camp_code || "").toLowerCase().includes(search.toLowerCase())
  );

  const typeColors: Record<string, string> = {
    executive: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    staff: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    worker: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    mixed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Camp Management</h1>
          <p className="text-muted-foreground text-sm">Manage camps, blocks, and rooms</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} className="mr-1" /> Create Camp
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="camps">Camps</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-4">
          <CampsOverview camps={camps} />
        </TabsContent>

        {/* ── Camps Tab ── */}
        <TabsContent value="camps" className="mt-4 space-y-4">
          {/* Search + View Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search camps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                title="List view"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                title="Card view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading camps...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No camps found. Create your first camp to get started.
            </div>
          ) : viewMode === "list" ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Camp Code</TableHead>
                    <TableHead>Camp Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-center">Rooms</TableHead>
                    <TableHead className="text-center">Occupied</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead>Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((camp: any) => (
                    <TableRow
                      key={camp.id}
                      onClick={() => navigate(`/camps/${camp.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{camp.camp_code || "—"}</TableCell>
                      <TableCell className="font-medium">{camp.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {camp.location}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${typeColors[camp.camp_type] || ""}`}>
                          {camp.camp_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={camp.status === "active" ? "default" : "secondary"} className="text-xs">
                          {camp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{camp.project_name || "—"}</TableCell>
                      <TableCell className="text-center font-medium">{camp.totalRooms}</TableCell>
                      <TableCell className="text-center font-medium text-primary">{camp.totalOccupants}</TableCell>
                      <TableCell className="text-center font-medium text-green-600">{camp.vacantBeds}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{camp.managed_by || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((camp: any) => (
                <Card
                  key={camp.id}
                  onClick={() => navigate(`/camps/${camp.id}`)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{camp.name}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin size={14} /> {camp.location}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className={typeColors[camp.camp_type] || ""}>
                          {camp.camp_type}
                        </Badge>
                        <Badge variant={camp.status === "active" ? "default" : "secondary"} className="text-xs">
                          {camp.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {camp.camp_code && (
                      <p className="text-xs text-muted-foreground font-mono mb-2">{camp.camp_code}</p>
                    )}
                    {camp.project_name && (
                      <p className="text-sm text-muted-foreground mb-2">Project: {camp.project_name}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-sm border-t pt-3">
                      <div className="text-center">
                        <p className="font-bold">{camp.totalRooms}</p>
                        <p className="text-xs text-muted-foreground">Rooms</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-primary">{camp.totalOccupants}</p>
                        <p className="text-xs text-muted-foreground">Occupied</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{camp.vacantBeds}</p>
                        <p className="text-xs text-muted-foreground">Available</p>
                      </div>
                    </div>
                    {camp.managed_by && (
                      <p className="text-xs text-muted-foreground mt-2">Manager: {camp.managed_by}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Reports Tab ── */}
        <TabsContent value="reports" className="mt-4">
          <CampsReports camps={camps} />
        </TabsContent>
      </Tabs>

      <AddCampDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
