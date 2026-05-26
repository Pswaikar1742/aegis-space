export type InventoryStatus = "available" | "allocated" | "maintenance" | string;

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  status: InventoryStatus;
  capacity: number;
  monthly_rate: number;
  monthlyRate?: number;
}

export interface BookingRecord {
  id: string;
  inventory_item_id: string;
  lead_id?: string | null;
  branch_id: string;
  start_date: string;
  end_date: string;
  billing_cycle?: 'daily' | 'monthly' | string;
  monthly_rate_locked: number;
  total_value: number;
  status: string;
  notes?: string | null;
  created_at?: string;
}

export type Branch = { id: string; name: string; city?: string; note?: string };

export interface Lead { id: string; company_name: string; status: 'new' | 'proposal_sent' | 'closed_won' | 'workbench_halted'; deal_size: number; next_steps: string; }
export interface MemberPerks { member_id: string; monthly_credits: number; printing_quota: number; active_status: boolean; }
export interface MaintenanceTicket { id: string; branch_id: string; inventory_item_id?: string | null; description: string; status: 'open' | 'in_progress' | 'resolved' | string; }
export interface Visitor { id: string; branch_id?: string; visitor_name: string; company?: string | null; purpose: string; host_member_id?: string | null; status: string; checked_in_at?: string | null; checked_out_at?: string | null; }
export interface FacilityTask { id: string; task_type: string; description: string; priority: string; status: string; }

export type Persona = 'manager' | 'cfo' | 'tenant_admin' | 'member' | 'front_desk' | 'it_admin' | 'vendor';

export type SessionRecord = {
  persona: Persona;
  authenticatedAt: string;
};
