'use client';

import { useState, useEffect } from 'react';
import FloorMap from '../components/FloorMap';
import {
  LayoutDashboard, Users, BarChart3, Building2, Bell, Search,
  DollarSign, TrendingUp, CheckCircle2, Shield, Wrench, CreditCard, Printer,
  Zap, Send, Settings, UserCircle, Briefcase, Activity
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const KALYAN_BRANCH_ID = "4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";
const STARK_MEMBER_ID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d";

interface InventoryItem { id: string; name: string; type: string; capacity: number; monthly_rate: number; status: 'available' | 'allocated' | 'maintenance'; }
interface Lead { id: string; company_name: string; status: 'new' | 'proposal_sent' | 'closed_won' | 'workbench_halted'; deal_size: number; next_steps: string; }
interface MemberPerks { member_id: string; monthly_credits: number; printing_quota: number; active_status: boolean; }
interface MaintenanceTicket { id: string; branch_id: string; inventory_item_id: string | null; description: string; status: 'open' | 'in_progress' | 'resolved'; }
interface Visitor { id: string; visitor_name: string; purpose: string; status: string; }
interface FacilityTask { id: string; task_type: string; description: string; priority: string; status: string; }

type Persona = 'manager' | 'cfo' | 'tenant_admin' | 'member' | 'front_desk' | 'it_admin' | 'vendor';

const NAV_ITEMS: { key: Persona; label: string; icon: any; category: string }[] = [
  { key: 'cfo', label: 'CFO Treasury', icon: BarChart3, category: 'Native' },
  { key: 'manager', label: 'Branch Manager', icon: LayoutDashboard, category: 'Native' },
  { key: 'tenant_admin', label: 'Tenant Admin', icon: Building2, category: 'Native' },
  { key: 'member', label: 'Coworking Member', icon: UserCircle, category: 'Native' },
  { key: 'front_desk', label: 'Front Desk / Security', icon: Shield, category: 'Integration' },
  { key: 'it_admin', label: 'IT / Network Admin', icon: Activity, category: 'Integration' },
  { key: 'vendor', label: 'Janitorial / Vendor', icon: Wrench, category: 'Integration' },
];

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

export default function Home() {
  const [persona, setPersona] = useState<Persona>('manager');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [perks, setPerks] = useState<MemberPerks | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [tasks, setTasks] = useState<FacilityTask[]>([]);
  const [analytics, setAnalytics] = useState({ global_occupancy_rate: 0, total_portfolio_revenue: 0, branch_metrics: [] as any[] });
  
  const [terminalLog, setTerminalLog] = useState("System online. Awaiting operations...");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchState = async () => {
    try {
      const hdrs = (role: string) => ({ 'X-User-Role': role, 'X-User-ID': STARK_MEMBER_ID });
      const [invRes, leadRes, ticketRes, perkRes, analyticsRes, visRes, taskRes] = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/v1/inventory?branch_id=${KALYAN_BRANCH_ID}`),
        fetch(`${BACKEND_URL}/api/v1/leads?branch_id=${KALYAN_BRANCH_ID}`),
        fetch(`${BACKEND_URL}/api/v1/tickets?branch_id=${KALYAN_BRANCH_ID}`, { headers: hdrs('manager') }),
        fetch(`${BACKEND_URL}/api/v1/members/perks/${STARK_MEMBER_ID}`, { headers: hdrs('tenant_admin') }),
        fetch(`${BACKEND_URL}/api/v1/analytics/global`, { headers: hdrs('cfo') }),
        fetch(`${BACKEND_URL}/api/v1/visitors?branch_id=${KALYAN_BRANCH_ID}`, { headers: hdrs('front_desk') }),
        fetch(`${BACKEND_URL}/api/v1/facility/tasks?branch_id=${KALYAN_BRANCH_ID}`, { headers: hdrs('vendor') }),
      ]);
      if (invRes.status === 'fulfilled' && invRes.value.ok) setInventory(await invRes.value.json());
      if (leadRes.status === 'fulfilled' && leadRes.value.ok) setLeads(await leadRes.value.json());
      if (ticketRes.status === 'fulfilled' && ticketRes.value.ok) setTickets(await ticketRes.value.json());
      if (perkRes.status === 'fulfilled' && perkRes.value.ok) setPerks(await perkRes.value.json());
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) setAnalytics(await analyticsRes.value.json());
      if (visRes.status === 'fulfilled' && visRes.value.ok) setVisitors(await visRes.value.json());
      if (taskRes.status === 'fulfilled' && taskRes.value.ok) setTasks(await taskRes.value.json());
    } catch (err) { console.error("Fetch error:", err); }
  };

  useEffect(() => { fetchState(); const i = setInterval(fetchState, 5000); return () => clearInterval(i); }, []);

  const updateLeadStage = async (leadId: string, stage: string) => {
    setTerminalLog(`Progressing lead to: ${stage}...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${leadId}/stage`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Role": "manager", "X-User-ID": STARK_MEMBER_ID }, body: JSON.stringify({ status: stage }) });
      setTerminalLog(JSON.stringify(await res.json(), null, 2)); fetchState();
    } catch { setTerminalLog("CRM stage transition failed."); }
  };

  const bookRoom = async (itemId: string, role: string) => {
    setTerminalLog(`Validating booking credits for ${role}...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/bookings`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Role": role, "X-User-ID": STARK_MEMBER_ID }, body: JSON.stringify({ inventory_item_id: itemId, branch_id: KALYAN_BRANCH_ID, company_name: "Stark Industries", start_time: new Date().toISOString(), end_time: new Date(Date.now() + 2 * 3600000).toISOString() }) });
      setTerminalLog(res.ok ? `✓ BOOKING CONFIRMED:\n${JSON.stringify(await res.json(), null, 2)}` : `✗ BLOCKED:\n${JSON.stringify(await res.json(), null, 2)}`); fetchState();
    } catch { setTerminalLog("Booking failed."); }
  };

  const renderDashboard = () => {
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
              <div className="p-4"><FloorMap inventory={inventory} /></div>
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
                  <button onClick={() => bookRoom(r.id, 'tenant_admin')} className="btn-primary !py-1 !px-3 text-xs">Book</button>
                </div>
              ))}</div>
            </div>
          </div>
          <div className="card p-5 flex flex-col"><h3 className="text-sm font-semibold text-slate-800 mb-3">ERP Transaction Logs</h3><pre className="flex-1 bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap">{terminalLog}</pre></div>
        </div>
      );
      case 'member': return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="card p-5"><h3 className="text-sm font-semibold text-slate-800 mb-4">Member Portal (End User)</h3>
            <p className="text-sm text-slate-600 mb-4">Book a hot desk or report a facility issue.</p>
            <div className="space-y-3">{inventory.filter(i => i.type === 'hot_desk').map(r => (
              <div key={r.id} className="flex justify-between items-center p-3 border rounded border-slate-200">
                <div><p className="font-semibold text-sm">{r.name}</p><p className="text-xs text-slate-500">${r.monthly_rate}/mo</p></div>
                <button onClick={() => bookRoom(r.id, 'member')} className="btn-primary !py-1 !px-3 text-xs">Reserve</button>
              </div>
            ))}</div>
          </div>
          <div className="card p-5 flex flex-col"><h3 className="text-sm font-semibold text-slate-800 mb-3">Activity Feed</h3><pre className="flex-1 bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap">{terminalLog}</pre></div>
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
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-[72px]'} bg-slate-900 flex flex-col shrink-0 transition-all duration-300 border-r border-slate-800`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">A</div>
            {sidebarOpen && <h1 className="text-base font-bold text-white tracking-tight">AegisSpace</h1>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white"><Settings size={16} /></button>
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
          <h2 className="text-sm font-semibold text-slate-800">{NAV_ITEMS.find(n => n.key === persona)?.label}</h2>
          <div className="flex items-center gap-3 text-slate-400">
            <Search size={18} /><Bell size={18} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto custom-scroll p-6 max-w-7xl mx-auto w-full">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
}
