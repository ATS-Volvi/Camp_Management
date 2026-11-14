import { billingToday } from './stayBilling';
export const LOCKER_STATUSES = ['Available', 'Allocated', 'Under Maintenance', 'Damaged', 'Decommissioned'];
export const LOCKER_TYPES = ['Individual Locker', 'Double-door Locker', 'Multi-compartment Locker', 'Shared Locker', 'Custom Locker'];
export const LOCKER_CONDITIONS = ['Good', 'Needs Repair', 'Damaged'];
export const lockerTone = (status: string) => status === 'Available' ? 'bg-primary/10 text-primary border-primary/30' : status === 'Allocated' ? 'bg-accent text-accent-foreground border-primary/40' : status === 'Damaged' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-muted text-muted-foreground border-border';
export function lockerCharge(a: { allocated_on: string; released_on?: string | null; charge_mode: string; charge_rate: number }, from: string, to: string, today = billingToday()) {
 const start = [a.allocated_on, from].sort().at(-1) || from;
 const end = [to, today, ...(a.released_on ? [new Date(Date.parse(a.released_on + 'T00:00:00Z') - 86400000).toISOString().slice(0,10)] : [])].sort()[0];
 if (a.charge_mode === 'One-time') return a.allocated_on >= from && a.allocated_on <= to && a.allocated_on <= today ? Number(a.charge_rate) : 0;
 if (start > end || a.charge_mode === 'Free') return 0;
 const days = Math.floor((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
 return Math.round(days * Number(a.charge_rate) * (a.charge_mode === 'Monthly' ? 1 / 30 : 1) * 100) / 100;
}
export function lockerCapacityAvailable(l: { id: string; status: string; condition: string; capacity: number }, allocations: { locker_id: string; released_on: string | null }[]) {
 return ['Available', 'Allocated'].includes(l.status) && l.condition === 'Good' && allocations.filter(a => a.locker_id === l.id && !a.released_on).length < l.capacity;
}
