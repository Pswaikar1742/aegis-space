'use client';

import { useState, useEffect } from 'react';
import FloorMap from '../components/FloorMap';

const KALYAN_BRANCH_ID = "4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";
const STARK_MEMBER_ID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"; // Seeded Tenant Admin
const BACKEND_URL = "http://localhost:8080";

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  capacity: number;
  monthly_rate: number;
  status: 'available' | 'allocated' | 'maintenance';
}

interface Lead {
  id: string;
  company_name: string;
  status: 'new' | 'proposal_sent' | 'closed_won' | 'workbench_halted';
  deal_size: number;
  next_steps: string;
}

interface MemberPerks {
  member_id: string;
  monthly_credits: number;
  printing_quota: number;
  active_status: boolean;
}

interface MaintenanceTicket {
  id: string;
  branch_id: string;
  inventory_item_id: string | null;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export default function Home() {
  const [activePersona, setActivePersona] = useState<'cfo' | 'manager' | 'tenant_admin'>('manager');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [perks, setPerks] = useState<MemberPerks | null>(null);

  const [loading, setLoading] = useState(false);
  const [terminalLog, setTerminalLog] = useState("System online. Awaiting operations...");

  // CFO Analytics State
  const [analytics, setAnalytics] = useState({
    global_occupancy_rate: 0,
    total_portfolio_revenue: 0,
    branch_metrics: [] as any[]
  });

  // Ticket Form State
  const [ticketDesc, setTicketDesc] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");

  const fetchState = async () => {
    try {
      // 1. Fetch Live Inventory
      const invRes = await fetch(`${BACKEND_URL}/api/v1/inventory?branch_id=${KALYAN_BRANCH_ID}`);
      if (invRes.ok) setInventory(await invRes.json());

      // 2. Fetch Live CRM Leads
      const leadRes = await fetch(`${BACKEND_URL}/api/v1/leads?branch_id=${KALYAN_BRANCH_ID}`);
      if (leadRes.ok) setLeads(await leadRes.json());

      // 3. Fetch Maintenance Tickets
      const ticketRes = await fetch(`${BACKEND_URL}/api/v1/tickets?branch_id=${KALYAN_BRANCH_ID}`, {
        headers: { 'X-User-Role': 'manager', 'X-User-ID': STARK_MEMBER_ID }
      });
      if (ticketRes.ok) setTickets(await ticketRes.json());

      // 4. Fetch Tenant Admin Perks (Stark Industries)
      const perkRes = await fetch(`${BACKEND_URL}/api/v1/members/perks/${STARK_MEMBER_ID}`, {
        headers: { 'X-User-Role': 'tenant_admin', 'X-User-ID': STARK_MEMBER_ID }
      });
      if (perkRes.ok) setPerks(await perkRes.json());

      // 5. Fetch CFO Global Portfolio Analytics
      const analyticsRes = await fetch(`${BACKEND_URL}/api/v1/analytics/global`, {
        headers: { 'X-User-Role': 'cfo', 'X-User-ID': STARK_MEMBER_ID }
      });
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());

    } catch (err) {
      console.error("Telemetry fetch error:", err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000); // Poll live database states every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // CRM Pipeline Progression Call
  const updateLeadStage = async (leadId: string, stage: string) => {
    setLoading(true);
    setTerminalLog(`Progressing CRM Lead stage to: ${stage}...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Role": "manager",
          "X-User-ID": STARK_MEMBER_ID
        },
        body: JSON.stringify({ status: stage })
      });
      const data = await res.json();
      setTerminalLog(JSON.stringify(data, null, 2));
      fetchState();
    } catch (err) {
      setTerminalLog("CRM stage transition request failed.");
    } finally {
      setLoading(false);
    }
  };

  // ERP Sieve: Allocate Room and Deduct Credits
  const bookMeetingRoom = async (itemId: string) => {
    setLoading(true);
    setTerminalLog("ERP Sieve Ingest: Calculating duration and validating available booking credits...");
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": "tenant_admin",
          "X-User-ID": STARK_MEMBER_ID
        },
        body: JSON.stringify({
          inventory_item_id: itemId,
          branch_id: KALYAN_BRANCH_ID,
          company_name: "Stark Industries",
          contact_email: "pepper@stark.com",
          start_date: new Date().toISOString(), // Modified to use date to avoid tsx error based on earlier definition
          end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 Hour Request
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTerminalLog(`🚨 ERP EXECUTION BLOCKED:\n${JSON.stringify(data, null, 2)}`);
      } else {
        setTerminalLog(`🟢 BOOKING CONFIRMED & CREDITS DEDUCTED:\n${JSON.stringify(data, null, 2)}`);
      }
      fetchState();
    } catch (err) {
      setTerminalLog("Resource allocation transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  // File Maintenance Ticket
  const fileTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc) return;
    try {
      await fetch(`${BACKEND_URL}/api/v1/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": "member",
          "X-User-ID": STARK_MEMBER_ID
        },
        body: JSON.stringify({
          branch_id: KALYAN_BRANCH_ID,
          inventory_item_id: selectedSpaceId || null,
          reporter_id: STARK_MEMBER_ID,
          description: ticketDesc
        })
      });
      setTicketDesc("");
      fetchState();
    } catch (err) {
      console.error("Ticket logging failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans antialiased">
      {/* Upper Navigation & Dynamic Persona Switcher */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">AegisSpace</h1>
          <p className="text-xs text-slate-500 font-medium">Enterprise Multi-Center CRM & ERP System</p>
        </div>
        
        {/* Visual Persona Selector */}
        <div className="flex bg-slate-200 p-1 rounded-lg border border-slate-300">
          <button 
            onClick={() => setActivePersona('manager')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activePersona === 'manager' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Branch Manager Portal
          </button>
          <button 
            onClick={() => setActivePersona('cfo')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activePersona === 'cfo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            CFO Yield Analytics
          </button>
          <button 
            onClick={() => setActivePersona('tenant_admin')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activePersona === 'tenant_admin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Tenant Perks Portal
          </button>
        </div>
      </header>

      {/* CFO WORKSPACE VIEW */}
      {activePersona === 'cfo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Managed Revenue</h3>
              <p className="text-3xl font-black text-emerald-600">${analytics.total_portfolio_revenue?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Portfolio Occupancy Yield</h3>
              <p className="text-3xl font-black text-slate-800">{analytics.global_occupancy_rate || 0}%</p>
            </div>
          </div>

          <div className="bg-white p-6 border rounded-lg border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Branch Performance Ledger</h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2">Branch Name</th>
                  <th className="py-2">City</th>
                  <th className="py-2">Occupied Spaces</th>
                  <th className="py-2">Active Branch Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {analytics.branch_metrics?.map((b: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 font-semibold">{b.name}</td>
                    <td className="py-3">{b.city}</td>
                    <td className="py-3 font-mono">{b.occupied_items} / {b.total_items}</td>
                    <td className="py-3 font-mono font-bold text-emerald-600">${b.revenue?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BRANCH MANAGER WORKSPACE VIEW */}
      {activePersona === 'manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <FloorMap inventory={inventory} onSelectSpace={(item) => setSelectedSpaceId(item?.id || "")} />

            {/* CRM Pipeline Controller */}
            <div className="bg-white p-6 border rounded-lg border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">CRM Lead Pipeline & Progression Controller</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 font-bold uppercase">
                      <th className="py-3">Company</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Pipeline Progression</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">{lead.company_name}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            lead.status === 'closed_won' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {lead.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 flex gap-2">
                          <button 
                            onClick={() => updateLeadStage(lead.id, 'closed_won')}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold transition-all"
                          >
                            Mark Won (Lock Desk)
                          </button>
                          <button 
                            onClick={() => updateLeadStage(lead.id, 'workbench_halted')}
                            className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded text-[10px] font-bold transition-all"
                          >
                            Halt Deal (Release Desk)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Local Operations & Ticketing */}
          <div className="space-y-6">
            <div className="bg-white p-6 border rounded-lg border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Facility Issue Tracker</h3>
              <p className="text-xs text-slate-500 mb-4">Report spatial or hardware utility defects directly. Issues are pinned to desk coordinates.</p>
              
              <form onSubmit={fileTicket} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Selected Workspace Area</label>
                  <select 
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    className="w-full mt-1 p-2 border rounded bg-slate-50 text-xs font-semibold"
                  >
                    <option value="">Lobby / Common Area</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Defect Description</label>
                  <textarea 
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="E.g., Broken power socket, loose chair, faulty HVAC..."
                    className="w-full mt-1 p-2 border rounded bg-slate-50 text-xs min-h-[80px]"
                  />
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white font-bold py-2 rounded text-xs hover:bg-slate-950 transition-colors">
                  Log Active Issue
                </button>
              </form>
            </div>

            {/* Live Tickets Feed */}
            <div className="bg-white p-6 border rounded-lg border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">Active Maintenance Tickets</h4>
              <div className="space-y-2 h-48 overflow-y-auto pr-1">
                {tickets.map((t) => (
                  <div key={t.id} className="p-3 border rounded bg-slate-50 text-xs">
                    <p className="font-semibold text-slate-800">{t.description}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[9px] uppercase">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TENANT ADMIN WORKSPACE VIEW */}
      {activePersona === 'tenant_admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 border rounded-lg border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Corporate Account: Stark Industries</h3>
              <p className="text-xs text-slate-500 mb-6">Manage corporate resource allotments, active lease metrics, and book conference spaces.</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 border rounded bg-emerald-50/50 border-emerald-200">
                  <p className="text-xs font-bold text-emerald-700 uppercase">Monthly Booking Credits</p>
                  <p className="text-3xl font-black text-emerald-800 mt-2">{perks?.monthly_credits || 0} hrs</p>
                </div>
                <div className="p-4 border rounded bg-slate-100 border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Remaining Printing Quota</p>
                  <p className="text-3xl font-black text-slate-700 mt-2">{perks?.printing_quota || 0} pages</p>
                </div>
              </div>
            </div>

            {/* Live Room Booking Module */}
            <div className="bg-white p-6 border rounded-lg border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Book Meeting Space (Consumes Credits)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inventory.filter(i => i.type === 'meeting_room' || i.type === 'private_office').map((room) => (
                  <div key={room.id} className="p-4 border rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{room.name}</p>
                      <p className="text-[10px] text-slate-500">Requires: 1 credit / hr</p>
                    </div>
                    <button 
                      onClick={() => bookMeetingRoom(room.id)}
                      className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded text-[10px] hover:bg-slate-950 transition-colors"
                    >
                      Book 2 Hours
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Sieve Console */}
          <div className="bg-white p-6 border rounded-lg border-slate-200 shadow-sm flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-2">ERP Sieve Console</h3>
            <p className="text-xs text-slate-500 mb-4">Displays real-time credit checks, resource conflicts, and transactional logs.</p>
            <pre className="flex-grow bg-slate-900 text-emerald-400 p-4 rounded-md text-[10px] font-mono min-h-[300px] overflow-y-auto whitespace-pre-wrap border border-slate-800 shadow-inner">
              {terminalLog}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
