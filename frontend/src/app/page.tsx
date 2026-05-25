'use client';

import { useState, useEffect } from 'react';
import FloorMap, { SPACES as DEMO_SPACES, mapSpaceToInventory } from '../components/FloorMap';
import {
  LayoutDashboard, Users, BarChart3, Building2, Bell, Search,
  DollarSign, TrendingUp, CheckCircle2, Shield, Wrench, CreditCard, Printer,
  Zap, Send, Settings, UserCircle, Briefcase, Activity, LockKeyhole, Fingerprint, ShieldCheck, LogOut, Mail, MapPin, Layers3, CalendarRange
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const KALYAN_BRANCH_ID = "4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";
const BKC_BRANCH_ID = "8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e";
const HYD_BRANCH_ID = "9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f";
const STARK_MEMBER_ID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d";

interface InventoryItem { id: string; name: string; type: string; capacity: number; monthly_rate: number; status: 'available' | 'allocated' | 'maintenance'; }
interface Lead { id: string; company_name: string; status: 'new' | 'proposal_sent' | 'closed_won' | 'workbench_halted'; deal_size: number; next_steps: string; }
interface MemberPerks { member_id: string; monthly_credits: number; printing_quota: number; active_status: boolean; }
interface MaintenanceTicket { id: string; branch_id: string; inventory_item_id: string | null; description: string; status: 'open' | 'in_progress' | 'resolved'; }
interface Visitor { id: string; visitor_name: string; purpose: string; status: string; }
interface FacilityTask { id: string; task_type: string; description: string; priority: string; status: string; }
interface BookingRecord { id: string; inventory_item_id: string; lead_id: string | null; branch_id: string; start_date: string; end_date: string; monthly_rate_locked: number; total_value: number; status: string; notes: string | null; created_at?: string; }

type Persona = 'manager' | 'cfo' | 'tenant_admin' | 'member' | 'front_desk' | 'it_admin' | 'vendor';

type SessionRecord = {
  persona: Persona;
  authenticatedAt: string;
};

const NAV_ITEMS: { key: Persona; label: string; icon: any; category: string }[] = [
  { key: 'cfo', label: 'CFO Treasury', icon: BarChart3, category: 'Native' },
  { key: 'manager', label: 'Branch Manager', icon: LayoutDashboard, category: 'Native' },
  { key: 'tenant_admin', label: 'Tenant Admin', icon: Building2, category: 'Native' },
  { key: 'member', label: 'Coworking Member', icon: UserCircle, category: 'Native' },
  { key: 'front_desk', label: 'Front Desk / Security', icon: Shield, category: 'Integration' },
  { key: 'it_admin', label: 'IT / Network Admin', icon: Activity, category: 'Integration' },
  { key: 'vendor', label: 'Janitorial / Vendor', icon: Wrench, category: 'Integration' },
];

const SESSION_STORAGE_KEY = 'aegis-space-session';
const ACTIVE_BRANCH_STORAGE_KEY = 'aegis-space-active-branch';
const MEMBER_LOCATION_STORAGE_KEY = 'aegis-space-member-location';

// Branch shape used for dynamic loading
type Branch = { id: string; name: string; city?: string; note?: string };

type MemberLocationFilter = 'all' | 'hot_desk' | 'dedicated_desk' | 'meeting_room' | 'private_suite';

const MEMBER_LOCATION_FILTERS: Array<{ value: MemberLocationFilter; label: string; hint: string }> = [
  { value: 'all', label: 'All locations', hint: 'Every available slot in this branch' },
  { value: 'hot_desk', label: 'Hot desks', hint: 'Flexible shared desks' },
  { value: 'dedicated_desk', label: 'Dedicated desks', hint: 'Reserved personal seats' },
  { value: 'meeting_room', label: 'Meeting rooms', hint: 'Hourly or session booking spaces' },
  { value: 'private_suite', label: 'Private suites', hint: 'Enclosed team spaces' },
];

const PERSONA_CREDENTIALS: Record<Persona, { label: string; password: string; access: string }> = {
  cfo: { label: 'CFO Treasury', password: 'AegisSpace2026!CFO', access: 'Executive finance and portfolio reporting' },
  manager: { label: 'Branch Manager', password: 'AegisSpace2026!MGR', access: 'Operations, bookings, and floor control' },
  tenant_admin: { label: 'Tenant Admin', password: 'AegisSpace2026!TEN', access: 'Member perks and internal tenant workflows' },
  member: { label: 'Coworking Member', password: 'AegisSpace2026!MEM', access: 'End-user booking and activity access' },
  front_desk: { label: 'Front Desk / Security', password: 'AegisSpace2026!FRONT', access: 'Visitor check-in and access logging' },
  it_admin: { label: 'IT / Network Admin', password: 'AegisSpace2026!IT', access: 'Infrastructure and connectivity oversight' },
  vendor: { label: 'Janitorial / Vendor', password: 'AegisSpace2026!VEND', access: 'Facility task tracking and closeout' },
};

const PERSONA_OPTIONS = NAV_ITEMS.map((item) => ({
  value: item.key,
  label: item.label,
}));

function SessionGate({
  selectedPersona,
  onPersonaChange,
  password,
  onPasswordChange,
  error,
  onSubmit,
}: {
  selectedPersona: Persona;
  onPersonaChange: (persona: Persona) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const selectedPersonaConfig = PERSONA_CREDENTIALS[selectedPersona];

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(135deg,_#020617_0%,_#0f172a_55%,_#111827_100%)]" />
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:52px_52px]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.08fr_0.92fr] gap-6 items-stretch">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-slate-950/40 p-8 lg:p-10 overflow-hidden relative">
            <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <LockKeyhole className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">AegisSpace Central Gateway</p>
                <h1 className="text-2xl lg:text-4xl font-semibold tracking-tight">Enterprise Session Gate</h1>
              </div>
            </div>

            <p className="max-w-2xl text-sm lg:text-base text-slate-300 leading-7">
              Select a persona, enter the mock secure passphrase, and initiate a gated session.
              The dashboard behind this lock is still persona-driven, but it will not render until a secure session is established.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              {Object.entries(PERSONA_CREDENTIALS).slice(0, 3).map(([key, persona]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{persona.label}</p>
                  <p className="mt-2 text-sm text-slate-200">{persona.access}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Persona-bound access</p>
                  <p className="mt-1 text-slate-400">The selected workspace is stored with the session.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 flex items-start gap-3">
                <Fingerprint className="h-5 w-5 text-cyan-300 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Mock verification</p>
                  <p className="mt-1 text-slate-400">No backend auth required, just a deliberate gate.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 flex items-start gap-3">
                <Mail className="h-5 w-5 text-amber-300 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Easy demo password</p>
                  <p className="mt-1 text-slate-400">Use the persona passphrase shown in the right panel.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl shadow-slate-950/40 p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Secure login</p>
                <h2 className="text-xl font-semibold mt-1">Initiate Secure Session</h2>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-cyan-300" />
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Persona</label>
                <select
                  value={selectedPersona}
                  onChange={(event) => onPersonaChange(event.target.value as Persona)}
                  className="input !bg-slate-900 !border-slate-700 !text-slate-100"
                >
                  {PERSONA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mock password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder={`Enter ${PERSONA_CREDENTIALS[selectedPersona].label} passphrase`}
                  className="input !bg-slate-900 !border-slate-700 !text-slate-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Demo credential for this persona: <span className="text-slate-300 font-medium">{selectedPersonaConfig.password}</span>
                </p>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Session scope: {selectedPersonaConfig.access}
                </div>
              )}

              <button type="submit" className="btn-primary w-full !py-3.5 text-base">
                Initiate Secure Session
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400 leading-6">
              This gate is intentionally local and deterministic. It exists to separate personas at the UI layer while keeping the current dashboard behavior intact after authentication.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string; }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-brand-50 text-brand-600', emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600',
    blue: 'bg-blue-50 text-blue-600', slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card p-4 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.slate}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: 'badge-success', allocated: 'badge-danger', maintenance: 'badge-warning',
    new: 'badge-info', proposal_sent: 'badge-warning', closed_won: 'badge-success',
    workbench_halted: 'badge-danger', open: 'badge-warning', in_progress: 'badge-info', resolved: 'badge-success',
    pre_registered: 'badge-neutral', checked_in: 'badge-success', checked_out: 'badge-slate',
    pending: 'badge-warning', completed: 'badge-success',
  };
  return <span className={map[status] || 'badge-neutral'}>{status.replace(/_/g, ' ')}</span>;
}

function formatSeatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function seatTypeFilterLabel(filter: MemberLocationFilter) {
  const entry = MEMBER_LOCATION_FILTERS.find((item) => item.value === filter);
  return entry?.label ?? 'All locations';
}

export default function Home() {
  const [persona, setPersona] = useState<Persona>('manager');
  const [selectedPersona, setSelectedPersona] = useState<Persona>('manager');
  const [sessionPassword, setSessionPassword] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState(KALYAN_BRANCH_ID);
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const [memberLocationFilter, setMemberLocationFilter] = useState<MemberLocationFilter>('all');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [perks, setPerks] = useState<MemberPerks | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [tasks, setTasks] = useState<FacilityTask[]>([]);
  const [analytics, setAnalytics] = useState({ global_occupancy_rate: 0, total_portfolio_revenue: 0, branch_metrics: [] as any[] });
  const [bookingStartDate, setBookingStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookingEndDate, setBookingEndDate] = useState(() => {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return end.toISOString().slice(0, 10);
  });
  const [bookingAction, setBookingAction] = useState('');
    const [selectedSpace, setSelectedSpace] = useState<InventoryItem | null>(null);
    const [billingCycleChoice, setBillingCycleChoice] = useState<'monthly' | 'daily'>('monthly');
    const [bookingNote, setBookingNote] = useState('');
    function getAllowedBillingCycles(type: string) {
      switch ((type || '').toLowerCase()) {
        case 'meeting_room': return ['daily'] as const;
        case 'hot_desk': return ['monthly', 'daily'] as const;
        case 'dedicated_desk': return ['monthly'] as const;
        case 'private_suite': return ['monthly'] as const;
        default: return ['monthly'] as const;
      }
    }
  const [reportSeatId, setReportSeatId] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportAction, setReportAction] = useState('');
  
  const [terminalLog, setTerminalLog] = useState("System online. Awaiting operations...");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [openSlots, setOpenSlots] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);

  useEffect(() => {
    const storedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const storedBranch = window.sessionStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
    const storedLocation = window.sessionStorage.getItem(MEMBER_LOCATION_STORAGE_KEY);

    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SessionRecord;
        if (parsed?.persona && PERSONA_CREDENTIALS[parsed.persona]) {
          setPersona(parsed.persona);
          setSelectedPersona(parsed.persona);
          setIsAuthenticated(true);
        }
      } catch {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    if (storedBranch) {
      setActiveBranchId(storedBranch);
    }

    if (storedLocation && MEMBER_LOCATION_FILTERS.some((filter) => filter.value === storedLocation)) {
      setMemberLocationFilter(storedLocation as MemberLocationFilter);
    }

    setIsBootstrapped(true);
    // fetch branches early
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/branches`);
        if (!res.ok) return;
        const data = await res.json();
        setBranchList(data || []);
        // set default active branch to BKC if present, else Hyderabad, else first
        const ids = [BKC_BRANCH_ID, HYD_BRANCH_ID, KALYAN_BRANCH_ID];
        const pick = ids.map(id => data.find((b: any) => b.id === id)).find(Boolean) || data[0];
        if (pick) setActiveBranchId(pick.id);
      } catch (e) { console.error('Failed to fetch branches', e); }
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ persona, authenticatedAt: new Date().toISOString() } satisfies SessionRecord));
    window.sessionStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, activeBranchId);
    window.sessionStorage.setItem(MEMBER_LOCATION_STORAGE_KEY, memberLocationFilter);
  }, [isAuthenticated, persona, activeBranchId, memberLocationFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchState();
    fetchNotifications();
    const i = setInterval(() => { fetchState(); fetchNotifications(); }, 5000);
    return () => clearInterval(i);
  }, [isAuthenticated, activeBranchId]);

  const fetchState = async () => {
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
      // parse responses once to avoid double-consuming bodies
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

      // Compute open slots using demo spaces and inventory overlay
      try {
        let count = 0;
        for (const space of DEMO_SPACES) {
          const match = invData.find((i: any) => (i.name || '').toLowerCase().includes(space.label.toLowerCase().replace(/[^a-z0-9]+/g, ' ')));
          if (match) {
            if (match.status === 'available') count += 1;
          } else {
            // treat demo space as available
            count += 1;
          }
        }
        setOpenSlots(count);
      } catch (e) { setOpenSlots(0); }
    } catch (err) { console.error("Fetch error:", err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/notifications?branch_id=${activeBranchId}&unread_only=false`, { headers: { 'X-User-Role': 'manager', 'X-User-ID': STARK_MEMBER_ID } });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data || []);
    } catch (err) { console.error('Notifications fetch failed', err); }
  };

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

  const initiateSecureSession = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const expectedPassword = PERSONA_CREDENTIALS[selectedPersona].password;
    if (sessionPassword !== expectedPassword) {
      setSessionError(`Invalid passphrase for ${PERSONA_CREDENTIALS[selectedPersona].label}.`);
      return;
    }

    setPersona(selectedPersona);
    setIsAuthenticated(true);
    setSessionError('');
    setSessionPassword('');
    setTerminalLog(`Secure session initialized for ${PERSONA_CREDENTIALS[selectedPersona].label}.`);
  };

  const lockSession = () => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
    window.sessionStorage.removeItem(MEMBER_LOCATION_STORAGE_KEY);
    setIsAuthenticated(false);
    setSessionPassword('');
    setSessionError('');
    setActiveBranchId(KALYAN_BRANCH_ID);
    setMemberLocationFilter('all');
    setInventory([]);
    setLeads([]);
    setTickets([]);
    setPerks(null);
    setVisitors([]);
    setTasks([]);
    setBookings([]);
    setAnalytics({ global_occupancy_rate: 0, total_portfolio_revenue: 0, branch_metrics: [] });
    setTerminalLog('Session locked. Awaiting re-authentication...');
  };

  if (!isBootstrapped) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!isAuthenticated) {
    return (
      <SessionGate
        selectedPersona={selectedPersona}
        onPersonaChange={setSelectedPersona}
        password={sessionPassword}
        onPasswordChange={setSessionPassword}
        error={sessionError}
        onSubmit={initiateSecureSession}
      />
    );
  }

  const updateLeadStage = async (leadId: string, stage: string) => {
    setTerminalLog(`Progressing lead to: ${stage}...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${leadId}/stage`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Role": "manager", "X-User-ID": STARK_MEMBER_ID }, body: JSON.stringify({ status: stage }) });
      setTerminalLog(JSON.stringify(await res.json(), null, 2)); fetchState();
    } catch { setTerminalLog("CRM stage transition failed."); }
  };

  const bookRoom = async (itemId: string, role: string, billing_cycle: string = 'monthly', notes?: string) => {
    setTerminalLog(`Validating booking credits for ${role}...`);
    setBookingAction('Submitting booking request...');
    // If the itemId isn't present in the backend-fetched inventory, treat as demo/local booking
    const localMatch = inventory.find(i => i.id === itemId);
    if (!localMatch) {
      // Persist demo inventory to backend, then create a booking against it
      try {
        const demoSpace = DEMO_SPACES.find(s => s.id === itemId);
        const demoItem = demoSpace ? mapSpaceToInventory(demoSpace) : { id: itemId, name: itemId, type: 'hot_desk', status: 'available', monthly_rate: 220 };

        const createResp = await fetch(`${BACKEND_URL}/api/v1/inventory/demo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': role, 'X-User-ID': STARK_MEMBER_ID },
          body: JSON.stringify({
            branch_id: activeBranchId,
            external_id: itemId,
            name: demoItem.name,
            type: demoItem.type,
            capacity: demoItem.capacity || 1,
            monthly_rate: demoItem.monthly_rate || 0,
          }),
        });

        if (!createResp.ok) {
          throw new Error('Failed to create demo inventory');
        }

        const created = await createResp.json();

        // Now create a booking against the created inventory id
        const bookingResp = await fetch(`${BACKEND_URL}/api/v1/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': role, 'X-User-ID': STARK_MEMBER_ID },
          body: JSON.stringify({
            inventory_item_id: created.id,
            branch_id: activeBranchId,
            lead_id: leads.find((lead) => lead.company_name.toLowerCase().includes('stark'))?.id ?? null,
            start_date: bookingStartDate,
            end_date: bookingEndDate,
            billing_cycle: billing_cycle,
            notes: notes ?? `Reserved through AegisSpace Central Gateway by ${PERSONA_CREDENTIALS[persona].label}`,
          }),
        });

        const payload = await bookingResp.json();
        if (bookingResp.ok) {
          addToast('Booking successful');
          fetchState();
          return true;
        }

        // If booking failed after inventory creation, surface error
        setBookingAction(`Booking blocked: ${payload?.detail || 'request rejected'}`);
        setTerminalLog(`✗ BLOCKED:\n${JSON.stringify(payload, null, 2)}`);
        return false;
      } catch (err) {
        // Fallback to local demo booking if persistence fails
        console.error('Demo persist failed, falling back to local demo booking', err);
        const demoSpace = DEMO_SPACES.find(s => s.id === itemId);
        const demoItem = demoSpace ? mapSpaceToInventory(demoSpace) : { id: itemId, name: itemId, type: 'hot_desk', status: 'available', monthly_rate: 220 };
        const fakeId = `demo-${Date.now()}`;
        const newBooking = {
          id: fakeId,
          inventory_item_id: demoItem.id,
          lead_id: null,
          branch_id: activeBranchId,
          start_date: bookingStartDate,
          end_date: bookingEndDate,
          monthly_rate_locked: demoItem.monthly_rate || 0,
          total_value: billing_cycle === 'daily' ? Math.round((demoItem.monthly_rate || 0) / 30 * (Math.max((new Date(bookingEndDate).getTime() - new Date(bookingStartDate).getTime()) / (1000*60*60*24), 1))) : (demoItem.monthly_rate || 0),
          status: 'confirmed',
          notes: notes ?? `Demo booking by ${PERSONA_CREDENTIALS[persona].label}`,
          created_at: new Date().toISOString(),
        } as BookingRecord;
        setBookings((prev) => [newBooking, ...prev]);
        setInventory((prev) => {
        const normalized = {
          id: demoItem.id,
          name: demoItem.name,
          type: demoItem.type,
          status: 'allocated' as const,
          capacity: (demoItem.capacity ?? 1) as number,
          monthly_rate: (demoItem.monthly_rate ?? (demoItem as any).monthlyRate ?? 0) as number,
        } as InventoryItem;

        const exists = prev.find(p => p.id === demoItem.id);
        if (exists) return prev.map(p => p.id === demoItem.id ? { ...p, status: 'allocated' } : p);
        return [normalized, ...prev];
      });
        setOpenSlots((s) => Math.max(0, s - 1));
        addToast('Booking successful (demo)');
        setBookingAction(`Demo reserved ${demoItem.name} successfully.`);
        setTerminalLog(`✓ DEMO BOOKING: ${JSON.stringify(newBooking, null, 2)}`);
        return true;
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': role, 'X-User-ID': STARK_MEMBER_ID },
        body: JSON.stringify({
          inventory_item_id: itemId,
          branch_id: activeBranchId,
          lead_id: leads.find((lead) => lead.company_name.toLowerCase().includes('stark'))?.id ?? null,
          start_date: bookingStartDate,
          end_date: bookingEndDate,
            billing_cycle: billing_cycle,
            notes: notes ?? `Reserved through AegisSpace Central Gateway by ${PERSONA_CREDENTIALS[persona].label}`,
        }),
      });
      const payload = await res.json();
      if (res.ok) {
        setBookingAction(`Reserved ${inventory.find((seat) => seat.id === itemId)?.name || 'seat'} successfully.`);
        setTerminalLog(`✓ BOOKING CONFIRMED:\n${JSON.stringify(payload, null, 2)}`);
        addToast('Booking successful');
        fetchState();
        return true;
      } else {
        setBookingAction(`Booking blocked: ${payload?.detail || 'request rejected'}`);
        setTerminalLog(`✗ BLOCKED:\n${JSON.stringify(payload, null, 2)}`);
        fetchState();
        return false;
      }
    } catch {
      setBookingAction('Booking failed.');
      setTerminalLog('Booking failed.');
      return false;
    }
  };

  const reportIssue = async () => {
    if (!reportDescription.trim()) {
      setReportAction('Add a short description before submitting the report.');
      return;
    }

    setReportAction('Submitting maintenance report...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': 'member', 'X-User-ID': STARK_MEMBER_ID },
        body: JSON.stringify({
          branch_id: activeBranchId,
          inventory_item_id: reportSeatId || null,
          description: reportDescription,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setReportDescription('');
      setReportSeatId('');
      setReportAction('Issue reported successfully.');
      setTerminalLog(`✓ MAINTENANCE REPORTED:\n${JSON.stringify(await res.json(), null, 2)}`);
      fetchState();
    } catch (error) {
      setReportAction(`Report failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  };

  const renderDashboard = () => {
    const filteredMemberInventory = inventory.filter((item) => {
      if (item.status !== 'available') {
        return false;
      }

      if (memberLocationFilter === 'all') {
        return true;
      }

      return item.type === memberLocationFilter;
    });

    switch (persona) {
      case 'cfo': return (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Portfolio Revenue" value={`$${analytics.total_portfolio_revenue?.toLocaleString() || '0'}`} color="emerald" />
            <KpiCard icon={TrendingUp} label="Occupancy Rate" value={`${analytics.global_occupancy_rate || 0}%`} color="indigo" />
            <KpiCard icon={Building2} label="Active Branches" value={analytics.branch_metrics?.length || 0} color="blue" />
            <KpiCard icon={Users} label="Pipeline Leads" value={leads.length} color="amber" />
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-800">Global Yield Analytics</h3></div>
            <table className="data-table">
              <thead><tr><th>Branch</th><th>City</th><th>Occupied</th><th>Yield</th></tr></thead>
              <tbody>{analytics.branch_metrics?.map((b: any, i: number) => (
                <tr key={i}><td className="font-semibold text-slate-800">{b.name}</td><td>{b.city}</td><td className="font-mono">{b.occupied_items}/{b.total_items}</td><td className="font-mono font-bold text-emerald-600">${b.revenue?.toLocaleString()}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      );
      case 'manager': return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
          <div className="xl:col-span-2 space-y-6">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-800">Kalyan Center Floor Map</h3></div>
              <div className="p-4"><FloorMap inventory={inventory} onSelectSpace={(item) => { setSelectedSpace(item); const allowed = getAllowedBillingCycles(item?.type || ''); setBillingCycleChoice(allowed[0] ?? 'monthly'); }} /></div>
            </div>
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-800">CRM Lead Pipeline</h3></div>
              <table className="data-table">
                <thead><tr><th>Company</th><th>Status</th><th>Value</th><th>Actions</th></tr></thead>
                <tbody>{leads.map(l => (
                  <tr key={l.id}><td>{l.company_name}</td><td><StatusBadge status={l.status} /></td><td className="font-mono">${l.deal_size?.toLocaleString() || 0}</td>
                    <td className="space-x-2"><button onClick={() => updateLeadStage(l.id, 'closed_won')} className="text-xs text-emerald-600 font-semibold">Won</button>
                    <button onClick={() => updateLeadStage(l.id, 'workbench_halted')} className="text-xs text-rose-500 font-semibold">Halt</button></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div className="card p-5"><h3 className="text-sm font-semibold text-slate-800 mb-4">Maintenance Feed</h3>
            <div className="space-y-3">{tickets.map(t => (<div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">{t.description}<div className="mt-2"><StatusBadge status={t.status} /></div></div>))}</div>
          </div>
        </div>
      );
      case 'tenant_admin': return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Corporate Perks: Stark Industries</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-50 border border-brand-100 p-4 rounded-lg"><p className="text-xs text-brand-600 font-bold uppercase">Booking Credits</p><p className="text-2xl font-bold text-brand-800">{perks?.monthly_credits || 0}</p></div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg"><p className="text-xs text-blue-600 font-bold uppercase">Print Quota</p><p className="text-2xl font-bold text-blue-800">{perks?.printing_quota || 0}</p></div>
              </div>
            </div>
            <div className="card p-5"><h3 className="text-sm font-semibold text-slate-800 mb-4">Book Meeting Room (1 Credit/Hr)</h3>
                <div className="space-y-3">{inventory.filter(i => i.type === 'meeting_room').map(r => (
                <div key={r.id} className="flex justify-between items-center p-3 border rounded border-slate-200">
                  <div><p className="font-semibold text-sm">{r.name}</p><p className="text-xs text-slate-500">Cap: {r.capacity}</p></div>
                  <button onClick={() => bookRoom(r.id, 'tenant_admin', getAllowedBillingCycles(r.type)[0] ?? 'daily')} className="btn-primary !py-1 !px-3 text-xs">Book</button>
                </div>
              ))}</div>
            </div>
          </div>
          <div className="card p-5 flex flex-col"><h3 className="text-sm font-semibold text-slate-800 mb-3">ERP Transaction Logs</h3><pre className="flex-1 bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap">{terminalLog}</pre></div>
        </div>
      );
      case 'member': return (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-[1.18fr_0.82fr] gap-6">
            <div className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Member Booking Browser</h3>
                  <p className="text-sm text-slate-500 mt-1">Choose a location category, inspect the available seats, then reserve directly.</p>
                </div>
                <div className="flex flex-col gap-2 min-w-[280px]">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Branch location</label>
                  <select value={activeBranchId} onChange={(event) => setActiveBranchId(event.target.value)} className="input">
                    {branchList.length === 0 ? (
                      <option value={KALYAN_BRANCH_ID}>Kalyan Center</option>
                    ) : branchList.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name} - {branch.city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Booking window</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Start date</label>
                      <input type="date" value={bookingStartDate} onChange={(event) => setBookingStartDate(event.target.value)} className="input mt-2" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">End date</label>
                      <input type="date" value={bookingEndDate} onChange={(event) => setBookingEndDate(event.target.value)} className="input mt-2" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Maintenance report</p>
                  <div className="space-y-3">
                    <select value={reportSeatId} onChange={(event) => setReportSeatId(event.target.value)} className="input">
                      <option value="">Select a seat or space</option>
                      {inventory.map((seat) => (
                        <option key={seat.id} value={seat.id}>{seat.name} - {formatSeatType(seat.type)}</option>
                      ))}
                    </select>
                    <textarea
                      value={reportDescription}
                      onChange={(event) => setReportDescription(event.target.value)}
                      placeholder="Describe the issue, cleaning request, or service problem"
                      className="input min-h-[92px] resize-none"
                    />
                    <button onClick={reportIssue} className="btn-ghost w-full justify-center border border-slate-200">
                      Report issue to facility team
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Active branch</p>
                  <p className="mt-1 font-semibold text-slate-900 flex items-center gap-2"><MapPin size={14} />{(branchList.find((branch) => branch.id === activeBranchId) || { name: 'Kalyan Center' }).name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Location filter</p>
                  <p className="mt-1 font-semibold text-slate-900 flex items-center gap-2"><Layers3 size={14} />{seatTypeFilterLabel(memberLocationFilter)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Open slots</p>
                  <p className="mt-1 font-semibold text-slate-900 flex items-center gap-2"><CalendarRange size={14} />{openSlots}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {MEMBER_LOCATION_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setMemberLocationFilter(filter.value)}
                    className={memberLocationFilter === filter.value ? 'btn-primary !py-2 !px-3 text-xs' : 'btn-ghost !py-2 !px-3 text-xs'}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {filteredMemberInventory.length === 0 ? (
                  <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
                    No available slots match this location filter yet. Switch location or wait for availability to refresh.
                  </div>
                ) : filteredMemberInventory.map((seat) => (
                  <div key={seat.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{seat.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatSeatType(seat.type)} • Capacity {seat.capacity}</p>
                      </div>
                      <StatusBadge status={seat.status} />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-400">Monthly price</p>
                        <p className="text-lg font-bold text-slate-900">${seat.monthly_rate.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={billingCycleChoice} onChange={(e) => setBillingCycleChoice(e.target.value as 'monthly' | 'daily') } className="input text-xs">
                          <option value="monthly">Monthly</option>
                          <option value="daily">Daily</option>
                        </select>
                        <button onClick={() => bookRoom(seat.id, 'member', billingCycleChoice)} className="btn-primary !py-2 !px-4 text-xs">
                          Reserve
                        </button>
                        <button onClick={() => setSelectedSpace(seat)} className="btn-ghost !py-2 !px-4 text-xs">Select on map</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Booking modal shown when a space is selected on the map */}
              {selectedSpace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedSpace(null)} />
                  <div className="relative w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Book {selectedSpace.name}</p>
                        <p className="text-xs text-slate-500">{formatSeatType(selectedSpace.type)} • Capacity {selectedSpace.capacity}</p>
                      </div>
                      <button onClick={() => setSelectedSpace(null)} className="text-slate-400 hover:text-slate-700">Cancel</button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Booking window</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <input type="date" value={bookingStartDate} onChange={(e) => setBookingStartDate(e.target.value)} className="input" />
                          <input type="date" value={bookingEndDate} onChange={(e) => setBookingEndDate(e.target.value)} className="input" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Billing cycle</label>
                        <select value={billingCycleChoice} onChange={(e) => setBillingCycleChoice(e.target.value as 'monthly' | 'daily')} className="input mt-2">
                          <option value="monthly">Monthly</option>
                          <option value="daily">Daily</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Notes (optional)</label>
                        <input value={bookingNote} onChange={(e) => setBookingNote(e.target.value)} placeholder="Add a note for your booking" className="input mt-2" />
                      </div>

                      <div className="flex items-center justify-end gap-3 mt-2">
                        <button onClick={() => setSelectedSpace(null)} className="btn-ghost">Cancel</button>
                        <button onClick={async () => {
                          const ok = await bookRoom(selectedSpace.id, 'member', billingCycleChoice, bookingNote);
                          if (ok) {
                            setSelectedSpace(null);
                            setBookingNote('');
                          }
                        }} className="btn-primary">Book Now</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bookingAction ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{bookingAction}</div>
              ) : null}
              {reportAction ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{reportAction}</div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Live floor map</h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Polls every 5s</span>
                </div>
                <FloorMap inventory={inventory} onSelectSpace={(item) => { setSelectedSpace(item); const allowed = getAllowedBillingCycles(item?.type || ''); setBillingCycleChoice(allowed[0] ?? 'monthly'); }} />
              </div>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Recent bookings</h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Live branch feed</span>
                </div>
                {bookings.length === 0 ? (
                  <p className="text-sm text-slate-500">No bookings found for this branch yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scroll pr-1">
                    {bookings.slice(0, 6).map((booking) => {
                      const seat = inventory.find((item) => item.id === booking.inventory_item_id);
                      return (
                        <div key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{seat?.name || 'Booked seat'}</p>
                              <p className="text-xs text-slate-500 mt-1">{booking.start_date} to {booking.end_date}</p>
                            </div>
                            <StatusBadge status={booking.status} />
                          </div>
                          <p className="mt-2 text-xs text-slate-500">${booking.total_value.toLocaleString()} locked at ${booking.monthly_rate_locked.toLocaleString()}/mo</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="card p-5 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Activity Feed</h3>
                <pre className="flex-1 bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap">{terminalLog}</pre>
              </div>
            </div>
          </div>
        </div>
      );
      case 'front_desk': return (
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-800">Visitor Log</h3></div>
          {visitors.length === 0 ? <p className="p-6 text-sm text-slate-500">No visitors today.</p> :
          <table className="data-table">
            <thead><tr><th>Name</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{visitors.map(v => (
              <tr key={v.id}><td>{v.visitor_name}</td><td>{v.purpose}</td><td><StatusBadge status={v.status} /></td>
              <td><button className="text-xs font-semibold text-brand-600">Check-in</button></td></tr>
            ))}</tbody>
          </table>}
        </div>
      );
      case 'it_admin': return (
        <div className="card p-6 text-center animate-fade-in">
          <Activity size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800">Network & IT Console</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">Manage IoT endpoints, door access controllers, and bandwidth limits.</p>
        </div>
      );
      case 'vendor': return (
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-800">Facility & Cleaning Tasks</h3></div>
          {tasks.length === 0 ? <p className="p-6 text-sm text-slate-500">No pending facility tasks.</p> :
          <table className="data-table">
            <thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{tasks.map(t => (
              <tr key={t.id}><td>{t.description}</td><td><StatusBadge status={t.priority} /></td><td><StatusBadge status={t.status} /></td>
              <td><button className="text-xs font-semibold text-emerald-600">Mark Done</button></td></tr>
            ))}</tbody>
          </table>}
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-60 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow">{t.message}</div>
        ))}
      </div>
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-[72px]'} bg-slate-900 flex flex-col shrink-0 transition-all duration-300 border-r border-slate-800`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">A</div>
            {sidebarOpen && <h1 className="text-base font-bold text-white tracking-tight">AegisSpace</h1>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={lockSession} className="text-slate-400 hover:text-white" title="Lock session"><LogOut size={16} /></button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white"><Settings size={16} /></button>
          </div>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto custom-scroll space-y-4">
          <div>
            {sidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Native Workspaces</p>}
            {NAV_ITEMS.filter(n => n.category === 'Native').map(n => (
              <button key={n.key} onClick={() => setPersona(n.key)} className={persona === n.key ? 'nav-item-active w-full' : 'nav-item w-full'}>
                <n.icon size={18} />{sidebarOpen && <span className="text-sm font-medium">{n.label}</span>}
              </button>
            ))}
          </div>
          <div>
            {sidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Integrations</p>}
            {NAV_ITEMS.filter(n => n.category === 'Integration').map(n => (
              <button key={n.key} onClick={() => setPersona(n.key)} className={persona === n.key ? 'nav-item-active w-full' : 'nav-item w-full'}>
                <n.icon size={18} />{sidebarOpen && <span className="text-sm font-medium">{n.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{NAV_ITEMS.find(n => n.key === persona)?.label}</h2>
              <p className="text-[11px] text-slate-500">Session active for {PERSONA_CREDENTIALS[persona].label}</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck size={12} /> Secure Session
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 relative">
            <Search size={18} />
            <div className="relative">
              <button onClick={() => { const open = !notifOpen; setNotifOpen(open); if (open) fetchNotifications(); }} className="relative p-1 rounded hover:bg-slate-100">
                <Bell size={18} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold leading-none text-white bg-rose-500 rounded-full">{notifications.filter(n => !n.read).length}</span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-100 z-50">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="text-sm font-semibold">Notifications</div>
                    <div className="text-xs text-slate-400">{notifications.length} total</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500">No notifications</div>
                    ) : notifications.map((n) => (
                      <div key={n.id} className={`p-3 border-b border-slate-100 flex items-start justify-between ${n.read ? 'bg-white' : 'bg-emerald-50'}`}>
                        <div className="text-sm">
                          <div className="font-semibold">{n.type.replace(/_/g,' ')}</div>
                          <div className="text-xs text-slate-500 mt-1">{n.payload?.booking_id ? `Booking ${n.payload.booking_id}` : (n.payload?.lead_id ? `Lead ${n.payload.lead_id}` : '')}</div>
                          <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {!n.read && <button onClick={() => markNotificationRead(n.id)} className="text-xs text-emerald-700 font-semibold">Mark read</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={lockSession} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Lock</button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto custom-scroll p-6 max-w-7xl mx-auto w-full">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
}
