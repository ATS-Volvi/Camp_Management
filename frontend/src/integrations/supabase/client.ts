import { api } from '@/lib/apiClient';

// Export api as supabase client proxy so all components and hooks
// seamlessly route requests to the Tier 2 Express backend (/api/data/:table and domain routes)
export const supabase = api as any;
export default supabase;