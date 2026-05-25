export type InventoryStatus = "available" | "allocated" | "maintenance" | string;

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  status: InventoryStatus;
  capacity?: number;
  monthly_rate?: number;
  monthlyRate?: number;
}

export interface BookingRecord {
  id: string;
  inventory_item_id: string;
  lead_id?: string | null;
  branch_id: string;
  start_date: string;
  end_date: string;
  monthly_rate_locked: number;
  total_value: number;
  status: string;
  notes?: string | null;
  created_at?: string;
}

export type Branch = { id: string; name: string; city?: string; note?: string };
