'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Clock3, LayoutDashboard, ShieldCheck } from 'lucide-react';
import FloorMap from '../../../components/FloorMap';
import { StatusBadge } from '../../../components/DashboardComponents';
import { BACKEND_URL, KALYAN_BRANCH_ID } from '../../../lib/constants';
import { getDashboardPath, readAuthSession } from '../../../lib/session';
import type { InventoryItem, Lead } from '../../../lib/types';

type Notification = {
  id: string;
  type: string;
  payload?: { booking_id?: string; lead_id?: string; message?: string };
  read?: boolean;
  created_at?: string;
};

type AttendanceRow = {
  id: string;
  member_name: string;
  punch_in_time: string;
  status: string;
  note?: string | null;
};

export default function ManagerDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [branchId, setBranchId] = useState(KALYAN_BRANCH_ID);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    if (session.role !== 'manager') {
      router.replace(getDashboardPath(session.role));
      return;
    }

    setMemberId(session.member_id);
    setBranchId(session.branch_id || KALYAN_BRANCH_ID);
    setMounted(true);
  }, [router]);

  const fetchManagerState = async () => {
    const [inventoryRes, leadsRes, notificationsRes, attendanceRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/inventory?branch_id=${branchId}`),
      fetch(`${BACKEND_URL}/api/v1/leads?branch_id=${branchId}`),
      fetch(`${BACKEND_URL}/api/v1/notifications?branch_id=${branchId}&unread_only=true`, {
        headers: { 'X-User-Role': 'manager', 'X-User-ID': memberId },
      }),
      fetch(`${BACKEND_URL}/api/v1/attendance?branch_id=${branchId}`),
    ]);

    if (inventoryRes.ok) setInventory(await inventoryRes.json());
    if (leadsRes.ok) setLeads(await leadsRes.json());
    if (notificationsRes.ok) setNotifications(await notificationsRes.json());
    if (attendanceRes.ok) setAttendance(await attendanceRes.json());
  };

  useEffect(() => {
    if (!mounted) return;

    let active = true;
    const sync = async () => {
      try {
        await fetchManagerState();
      } catch {
        if (active) setStatusMessage('Manager telemetry refresh failed.');
      }
    };

    sync();
    const timer = window.setInterval(sync, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [mounted, branchId, memberId]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read), [notifications]);

  const updateLeadStage = async (leadId: string, status: string) => {
    setStatusMessage(`Updating lead ${leadId}...`);
    const response = await fetch(`${BACKEND_URL}/api/v1/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'manager',
        'X-User-ID': memberId,
      },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      await fetchManagerState();
    } else {
      const data = await response.json().catch(() => null);
      setStatusMessage(typeof data?.detail === 'string' ? data.detail : 'Lead update failed.');
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    const response = await fetch(`${BACKEND_URL}/api/v1/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: { 'X-User-Role': 'manager', 'X-User-ID': memberId },
    });

    if (response.ok) {
      await fetchManagerState();
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Operations Desk</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Branch Manager Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setDropdownOpen((current) => !current)} className="relative rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50">
                <span className="inline-flex items-center gap-2"><Bell className="h-4 w-4 text-slate-600" />Notifications</span>
                {unreadNotifications.length > 0 ? <span className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-5 text-white">{unreadNotifications.length}</span> : null}
              </button>

              {dropdownOpen ? (
                <div className="absolute right-0 mt-3 w-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h2 className="text-sm font-semibold">Unread notifications</h2>
                    <span className="text-xs text-slate-400">{unreadNotifications.length} live</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {unreadNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">No unread notifications.</div>
                    ) : unreadNotifications.map((notification) => (
                      <div key={notification.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                        <div className="text-sm font-semibold text-slate-900">{notification.type.replace(/_/g, ' ')}</div>
                        <div className="mt-1 text-xs text-slate-500">{notification.payload?.booking_id ? `Booking ${notification.payload.booking_id}` : notification.payload?.lead_id ? `Lead ${notification.payload.lead_id}` : 'System alert'}</div>
                        <button onClick={() => markNotificationRead(notification.id)} className="mt-2 text-xs font-semibold text-cyan-700">Mark read</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Live branch sync
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 space-y-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Operations mirror</h2>
                <p className="text-sm text-slate-500">The floor plan mirrors live occupied and available inventory.</p>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2"><LayoutDashboard className="h-3.5 w-3.5" /> Auto-refresh every 5 seconds</div>
            </div>
            <FloorMap inventory={inventory} onSelectSpace={() => undefined} />
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock3 className="h-4 w-4 text-cyan-600" />
                <h2 className="text-base font-semibold">Employee Punch-in Feed</h2>
              </div>
              <div className="space-y-3 max-h-[20rem] overflow-y-auto pr-1">
                {attendance.length === 0 ? (
                  <p className="text-sm text-slate-500">No punch-ins yet.</p>
                ) : attendance.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{row.member_name}</p>
                        <p className="text-xs text-slate-500 mt-1">{row.punch_in_time}</p>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>
                    {row.note ? <p className="mt-2 text-xs text-slate-500">{row.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-4">Branch metrics</h2>
              <div className="space-y-3 max-h-[18rem] overflow-y-auto pr-1">
                {leads.length === 0 ? (
                  <p className="text-sm text-slate-500">No CRM leads found.</p>
                ) : leads.map((lead) => (
                  <div key={lead.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{lead.company_name}</p>
                        <p className="mt-1 text-xs text-slate-500">${lead.deal_size?.toLocaleString() || 0} budget</p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => updateLeadStage(lead.id, 'closed_won')} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Mark Won</button>
                      <button onClick={() => updateLeadStage(lead.id, 'workbench_halted')} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Halt Deal</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{statusMessage}</div>
        ) : null}
      </div>
    </div>
  );
}
