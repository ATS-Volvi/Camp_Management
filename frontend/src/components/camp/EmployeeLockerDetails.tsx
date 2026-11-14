import { useLockerData } from '@/hooks/useLockers';
import { lockerTone } from '@/lib/lockers';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Table,TableHeader,TableHead,TableRow,TableBody,TableCell } from '@/components/ui/table';
export default function EmployeeLockerDetails({employeeId,onClose}:{employeeId:string;onClose:()=>void}) {
 const {data,isLoading,isError}=useLockerData();
 const list=data?.allocations.filter(a=>a.employee_id===employeeId)||[];
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-w-3xl max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>Employee Locker History</DialogTitle></DialogHeader>
 {isLoading?<p>Loading…</p>:isError?<p role="alert">Unable to load locker history</p>:<><div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{list.filter(a=>!a.released_on).map(a=>{const l=data?.lockers.find(l=>l.id===a.locker_id);return <div key={a.id} className={`border rounded-md p-3 text-center ${lockerTone(l?.status||'Allocated')}`}><strong>{l?.number}</strong><div className="text-xs">{data?.camps.find(c=>c.id===l?.camp_id)?.name}</div></div>;})}</div>
 <Table><TableHeader><TableRow>{['Locker','Location','Allocated','Released','Condition','Key Returned'].map(t=><TableHead key={t}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>{list.map(a=>{const l=data?.lockers.find(l=>l.id===a.locker_id);return <TableRow key={a.id}><TableCell>{l?.number}</TableCell><TableCell>{data?.camps.find(c=>c.id===l?.camp_id)?.name} / {data?.blocks.find(b=>b.id===l?.block_id)?.name} / {data?.rooms.find(r=>r.id===l?.room_id)?.room_number||'—'}</TableCell><TableCell>{a.allocated_on}</TableCell><TableCell>{a.released_on||'Allocated'}</TableCell><TableCell>{a.release_condition||'—'}</TableCell><TableCell>{a.key_returned==null?'—':a.key_returned?'Yes':'No'}</TableCell></TableRow>;})}{!list.length&&<TableRow><TableCell colSpan={6}>No locker allocations</TableCell></TableRow>}</TableBody></Table></>}
 </DialogContent></Dialog>;
}
