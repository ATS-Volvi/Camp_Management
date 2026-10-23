import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMessFacilities, useCreateMessFacility } from "@/hooks/useFoodSafetyAudit";

export default function MessFacilitiesTab() {
  const [open, setOpen] = useState(false);
  const [campId, setCampId] = useState("");
  const [name, setName] = useState("");
  const [facilityType, setFacilityType] = useState("main_kitchen");
  const [contractor, setContractor] = useState("");
  const [capacity, setCapacity] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [hygieneCertExpiry, setHygieneCertExpiry] = useState("");

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data } = await supabase.from("camps").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: facilities = [] } = useMessFacilities();
  const createFacility = useCreateMessFacility();

  const handleCreate = () => {
    if (!campId || !name) return;
    createFacility.mutate(
      {
        camp_id: campId,
        name,
        facility_type: facilityType,
        contractor_name: contractor || null,
        capacity: parseInt(capacity) || 0,
        license_expiry: licenseExpiry || null,
        hygiene_cert_expiry: hygieneCertExpiry || null,
      } as any,
      {
        onSuccess: () => {
          setOpen(false);
          setName(""); setContractor(""); setCapacity("");
        },
      }
    );
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 30 && diff > 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Mess Facilities
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Facility</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Mess Facility</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Camp *</Label>
                <Select value={campId} onValueChange={setCampId}>
                  <SelectTrigger><SelectValue placeholder="Select Camp" /></SelectTrigger>
                  <SelectContent>{camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Facility Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Kitchen" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={facilityType} onValueChange={setFacilityType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_kitchen">Main Kitchen</SelectItem>
                    <SelectItem value="satellite_kitchen">Satellite Kitchen</SelectItem>
                    <SelectItem value="dining_hall">Dining Hall</SelectItem>
                    <SelectItem value="cold_storage">Cold Storage</SelectItem>
                    <SelectItem value="dry_store">Dry Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contractor/Supplier</Label>
                <Input value={contractor} onChange={e => setContractor(e.target.value)} />
              </div>
              <div>
                <Label>Capacity (persons)</Label>
                <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>License Expiry</Label>
                  <Input type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)} />
                </div>
                <div>
                  <Label>Hygiene Cert Expiry</Label>
                  <Input type="date" value={hygieneCertExpiry} onChange={e => setHygieneCertExpiry(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!campId || !name || createFacility.isPending}>
                {createFacility.isPending ? "Adding..." : "Add Facility"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead>Hygiene Cert</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-sm">{f.name}</TableCell>
                  <TableCell className="text-sm">{camps.find(c => c.id === f.camp_id)?.name || "—"}</TableCell>
                  <TableCell className="text-xs">{f.facility_type.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm">{f.contractor_name || "—"}</TableCell>
                  <TableCell className="text-sm">{f.capacity}</TableCell>
                  <TableCell className="text-xs">
                    {f.license_expiry ? (
                      <span className="flex items-center gap-1">
                        {new Date(f.license_expiry).toLocaleDateString()}
                        {isExpired(f.license_expiry) && <Badge variant="destructive" className="text-[9px]">Expired</Badge>}
                        {isExpiringSoon(f.license_expiry) && <Badge className="text-[9px] bg-amber-100 text-amber-700">Expiring</Badge>}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.hygiene_cert_expiry ? (
                      <span className="flex items-center gap-1">
                        {new Date(f.hygiene_cert_expiry).toLocaleDateString()}
                        {isExpired(f.hygiene_cert_expiry) && <Badge variant="destructive" className="text-[9px]">Expired</Badge>}
                        {isExpiringSoon(f.hygiene_cert_expiry) && <Badge className="text-[9px] bg-amber-100 text-amber-700">Expiring</Badge>}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.status === "active" ? "default" : "secondary"} className="text-[10px]">{f.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {facilities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No facilities added yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
