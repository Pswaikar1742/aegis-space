'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SPACES as DEMO_SPACES } from './FloorMap';
import type { InventoryItem, BookingRecord, Branch, Lead, MemberPerks, MaintenanceTicket, Visitor, FacilityTask, Persona, SessionRecord } from '../lib/types';
import { BACKEND_URL, KALYAN_BRANCH_ID, BKC_BRANCH_ID, HYD_BRANCH_ID, STARK_MEMBER_ID, SESSION_STORAGE_KEY, ACTIVE_BRANCH_STORAGE_KEY, MEMBER_LOCATION_STORAGE_KEY, MEMBER_LOCATION_FILTERS, PERSONA_CREDENTIALS } from '../lib/constants';

interface AegisContextType {
  persona: Persona;
  setPersona: (p: Persona) => void;
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  branchList: Branch[];
  memberLocationFilter: string;
  setMemberLocationFilter: (filter: string) => void;
  inventory: InventoryItem[];
  leads: Lead[];
  tickets: MaintenanceTicket[];
  bookings: BookingRecord[];
  perks: MemberPerks | null;
  visitors: Visitor[];
  tasks: FacilityTask[];
  analytics: { global_occupancy_rate: number; total_portfolio_revenue: number; branch_metrics: any[] };
  notifications: any[];
  openSlots: number;
  terminalLog: string;
  setTerminalLog: (log: string) => void;
  toasts: Array<{ id: string; message: string }>;
  addToast: (message: string) => void;
  fetchState: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  updateLeadStage: (leadId: string, stage: string) => Promise<void>;
  bookRoom: (itemId: string, role: string, billing_cycle?: string, notes?: string) => Promise<boolean>;
  reportIssue: (seatId: string, description: string) => Promise<{ success: boolean; message: string }>;
  lockSession: () => void;
}

const AegisContext = createContext<AegisContextType | null>(null);

export function useAegis() {
  const context = useContext(AegisContext);
  if (!context) throw new Error('useAegis must be used within an AegisProvider');
  return context;
}

export function AegisProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [persona, setPersona] = useState<Persona>('manager');
  const [activeBranchId, setActiveBranchId] = useState(KALYAN_BRANCH_ID);
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const [memberLocationFilter, setMemberLocationFilter] = useState<string>('all');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [perks, setPerks] = useState<MemberPerks | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [tasks, setTasks] = useState<FacilityTask[]>([]);
  const [analytics, setAnalytics] = useState({ global_occupancy_rate: 0, total_portfolio_revenue: 0, branch_metrics: [] as any[] });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [openSlots, setOpenSlots] = useState(0);
  const [terminalLog, setTerminalLog] = useState("System online. Awaiting operations...");
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    const storedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const storedBranch = window.sessionStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
    const storedLocation = window.sessionStorage.getItem(MEMBER_LOCATION_STORAGE_KEY);

    let currentPersona: Persona | null = null;
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SessionRecord;
        if (parsed?.persona && PERSONA_CREDENTIALS[parsed.persona]) {
          setPersona(parsed.persona);
          currentPersona = parsed.persona;
        }
      } catch {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    if (!currentPersona && pathname !== '/') {
      router.push('/');
      return;
    }

    if (storedBranch) setActiveBranchId(storedBranch);
    if (storedLocation) setMemberLocationFilter(storedLocation);

    setIsBootstrapped(true);
    
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/branches`);
        if (!res.ok) return;
        const data = await res.json();
        setBranchList(data || []);
        if (!storedBranch) {
          const ids = [BKC_BRANCH_ID, HYD_BRANCH_ID, KALYAN_BRANCH_ID];
          const pick = ids.map(id => data.find((b: any) => b.id === id)).find(Boolean) || data[0];
          if (pick) setActiveBranchId(pick.id);
        }
      } catch (e) { console.error('Failed to fetch branches', e); }
    })();
  }, [pathname, router]);

  useEffect(() => {
    if (!isBootstrapped || pathname === '/') return;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ persona, authenticatedAt: new Date().toISOString() }));
    window.sessionStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, activeBranchId);
    window.sessionStorage.setItem(MEMBER_LOCATION_STORAGE_KEY, memberLocationFilter);
  }, [persona, activeBranchId, memberLocationFilter, isBootstrapped, pathname]);

  const fetchState = async () => {
    if (pathname === '/') return;
    try {
      const hdrs = (role: string) => ({ 'X-User-Role': role, 'X-User-ID': STARK_MEMBER_ID });
      const [invRes, leadRes, ticketRes, perkRes, analyticsRes, visRes, taskRes, bookingsRes] = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/v1/inventory?branch_id=${activeBranchId}`),
        fetch(`${BACKEND_URL}/api/v1/leads?branch_id=${activeBranchId}`),
        fetch(`${BACKEND_URL}/api/v1/tickets?branch_id=${activeBranchId}`, { headers: hdrs('manager') }),
        fetch(`${BACKEND_URL}/api/v1/members/perks/${STARK_MEMBER_ID}`, { headers: hdrs('tenant_admin') }),
        fetch(`${BACKEND_URL}/api/v1/analytics/global`, { headers: hdrs('cfo') }),
        fetch(`${BACKEND_URL}/api/v1/visitors?branch_id=${activeBranchId}`, { headers: hdrs('front_desk') }),
        fetch(`${BACKEND_URL}/api/v1/facility/tasks?branch_id=${activeBranchId}`, { headers: hdrs('vendor') }),
        fetch(`${BACKEND_URL}/api/v1/bookings?branch_id=${activeBranchId}`),
      ]);
      const invData = invRes.status === 'fulfilled' && invRes.value.ok ? await invRes.value.json() : [];
      const leadsData = leadRes.status === 'fulfilled' && leadRes.value.ok ? await leadRes.value.json() : [];
      const ticketsData = ticketRes.status === 'fulfilled' && ticketRes.value.ok ? await ticketRes.value.json() : [];
      const perksData = perkRes.status === 'fulfilled' && perkRes.value.ok ? await perkRes.value.json() : null;
      const analyticsData = analyticsRes.status === 'fulfilled' && analyticsRes.value.ok ? await analyticsRes.value.json() : analytics;
      const visitorsData = visRes.status === 'fulfilled' && visRes.value.ok ? await visRes.value.json() : [];
      const tasksData = taskRes.status === 'fulfilled' && taskRes.value.ok ? await taskRes.value.json() : [];
      const bookingsData = bookingsRes.status === 'fulfilled' && bookingsRes.value.ok ? await bookingsRes.value.json() : [];

      setInventory(invData);
      setLeads(leadsData);
      setTickets(ticketsData);
      setPerks(perksData);
      setAnalytics(analyticsData);
      setVisitors(visitorsData);
      setTasks(tasksData);
      setBookings(bookingsData);

      let count = 0;
      for (const space of DEMO_SPACES) {
        const match = invData.find((i: any) => (i.name || '').toLowerCase().includes(space.label.toLowerCase().replace(/[^a-z0-9]+/g, ' ')));
        if (match) {
          if (match.status === 'available') count += 1;
        } else {
          count += 1;
        }
      }
      setOpenSlots(count);
    } catch (err) { console.error("Fetch error:", err); }
  };

  const fetchNotifications = async () => {
    if (pathname === '/') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/notifications?branch_id=${activeBranchId}&unread_only=false`, { headers: { 'X-User-Role': 'manager', 'X-User-ID': STARK_MEMBER_ID } });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data || []);
    } catch (err) { console.error('Notifications fetch failed', err); }
  };

  useEffect(() => {
    if (!isBootstrapped || pathname === '/') return;
    fetchState();
    fetchNotifications();
    const i = setInterval(() => { fetchState(); fetchNotifications(); }, 5000);
    return () => clearInterval(i);
  }, [isBootstrapped, activeBranchId, pathname]);

  const markNotificationRead = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/notifications/${id}`, { method: 'PATCH', headers: { 'X-User-Role': 'manager', 'X-User-ID': STARK_MEMBER_ID } });
      if (res.ok) {
        fetchNotifications();
        fetchState();
      }
    } catch (err) { console.error('Mark read failed', err); }
  };

  const addToast = (message: string) => {
    const id = `t-${Date.now()}`;
    setToasts((t) => [{ id, message }, ...t]);
    setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), 3500);
  };

  const lockSession = () => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
    window.sessionStorage.removeItem(MEMBER_LOCATION_STORAGE_KEY);
    router.push('/');
  };

  const updateLeadStage = async (leadId: string, stage: string) => {
    setTerminalLog(`Progressing lead to: ${stage}...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${leadId}/stage`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Role": "manager", "X-User-ID": STARK_MEMBER_ID }, body: JSON.stringify({ status: stage }) });
      setTerminalLog(JSON.stringify(await res.json(), null, 2)); fetchState();
    } catch { setTerminalLog("CRM stage transition failed."); }
  };

  const bookRoom = async (itemId: string, role: string, billing_cycle: string = 'monthly', notes?: string) => {
    setTerminalLog(`Validating booking credits for ${role}...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': role, 'X-User-ID': STARK_MEMBER_ID },
        body: JSON.stringify({
          inventory_item_id: itemId,
          branch_id: activeBranchId,
          lead_id: leads.find((lead) => lead.company_name.toLowerCase().includes('stark'))?.id ?? null,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); })(),
          billing_cycle: billing_cycle,
          notes: notes ?? `Reserved through AegisSpace Central Gateway by ${PERSONA_CREDENTIALS[persona].label}`,
        }),
      });
      const payload = await res.json();
      if (res.ok) {
        setTerminalLog(`✓ BOOKING CONFIRMED:\n${JSON.stringify(payload, null, 2)}`);
        addToast('Booking successful');
        fetchState();
        return true;
      } else {
        setTerminalLog(`✗ BLOCKED:\n${JSON.stringify(payload, null, 2)}`);
        fetchState();
        return false;
      }
    } catch {
      setTerminalLog('Booking failed.');
      return false;
    }
  };

  const reportIssue = async (seatId: string, description: string) => {
    if (!description.trim()) return { success: false, message: 'Add a short description before submitting the report.' };
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': 'member', 'X-User-ID': STARK_MEMBER_ID },
        body: JSON.stringify({ branch_id: activeBranchId, inventory_item_id: seatId || null, description: description }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTerminalLog(`✓ MAINTENANCE REPORTED:\n${JSON.stringify(await res.json(), null, 2)}`);
      fetchState();
      return { success: true, message: 'Issue reported successfully.' };
    } catch (error) {
      return { success: false, message: `Report failed: ${error instanceof Error ? error.message : 'unknown error'}` };
    }
  };

  if (!isBootstrapped) return <div className="min-h-screen bg-slate-950" />;

  return (
    <AegisContext.Provider value={{
      persona, setPersona, activeBranchId, setActiveBranchId, branchList,
      memberLocationFilter, setMemberLocationFilter, inventory, leads, tickets, bookings, perks,
      visitors, tasks, analytics, notifications, openSlots, terminalLog, setTerminalLog, toasts,
      addToast, fetchState, fetchNotifications, markNotificationRead, updateLeadStage, bookRoom, reportIssue, lockSession
    }}>
      {children}
    </AegisContext.Provider>
  );
}
