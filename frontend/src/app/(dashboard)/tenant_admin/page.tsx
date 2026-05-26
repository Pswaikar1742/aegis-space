'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgePercent, LayoutDashboard, Bell } from 'lucide-react';
import { BACKEND_URL, KALYAN_BRANCH_ID } from '../../../lib/constants';
import { getDashboardPath, readAuthSession } from '../../../lib/session';
import type { BookingRecord, MemberPerks, InventoryItem } from '../../../lib/types';

type BranchNotification = {
  id: string;
  type: string;
  payload?: { booking_id?: string; lead_id?: string; message?: string };
  read?: boolean;
  created_at?: string;
};

export default function TenantAdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [branchId, setBranchId] = useState(KALYAN_BRANCH_ID);
  const [perks, setPerks] = useState<MemberPerks | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<BranchNotification[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) return router.replace('/login');
    if (session.role !== 'tenant_admin') return router.replace(getDashboardPath(session.role));
    setMemberId(session.member_id);
    setBranchId(session.branch_id || KALYAN_BRANCH_ID);
    setMounted(true);
  }, [router]);

  const fetchState = async () => {
    const [perksRes, bookingsRes, notificationsRes, inventoryRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/members/perks/${memberId}`, {
        headers: { 'X-User-Role': 'tenant_admin', 'X-User-ID': memberId },
      }),
      fetch(`${BACKEND_URL}/api/v1/bookings?branch_id=${branchId}`, {
        headers: { 'X-User-Role': 'tenant_admin', 'X-User-ID': memberId },
      }),
      fetch(`${BACKEND_URL}/api/v1/notifications?branch_id=${branchId}`, {
        headers: { 'X-User-Role': 'tenant_admin', 'X-User-ID': memberId },
      }),
      fetch(`${BACKEND_URL}/api/v1/inventory?branch_id=${branchId}`),
    ]);

    if (perksRes.ok) setPerks(await perksRes.json());
    if (bookingsRes.ok) setBookings(await bookingsRes.json());
    if (notificationsRes.ok) setNotifications(await notificationsRes.json());
    if (inventoryRes.ok) setInventory(await inventoryRes.json());
  };

  useEffect(() => {
    if (!mounted) return;
    fetchState().catch(() => setStatusMessage('Unable to load tenant admin data.'));
    const timer = window.setInterval(() => fetchState().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [mounted, branchId, memberId]);

  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  const activeBookings = bookings.filter((booking) => booking.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Tenant Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Member perks and workspace allocation.</h1>
          <p className="mt-3 text-sm text-slate-500">Live member credits, active bookings, and support tickets from the backend.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><BadgePercent className="h-4 w-4 text-emerald-600" />Monthly credits</div>
            <div className="mt-3 text-3xl font-semibold">{perks?.monthly_credits ?? 0}</div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><LayoutDashboard className="h-4 w-4 text-cyan-600" />Active bookings</div>
            <div className="mt-3 text-3xl font-semibold">{activeBookings.length}</div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Bell className="h-4 w-4 text-amber-600" />Open notifications</div>
            <div className="mt-3 text-3xl font-semibold">{notifications.filter((note) => !note.read).length}</div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-4">Perks snapshot</h2>
            {perks ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
                <p><span className="font-semibold">Member ID:</span> {perks.member_id}</p>
                <p><span className="font-semibold">Credits:</span> {perks.monthly_credits}</p>
                <p><span className="font-semibold">Printing quota:</span> {perks.printing_quota}</p>
                <p><span className="font-semibold">Status:</span> {perks.active_status ? 'active' : 'inactive'}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No perk record found for this persona yet.</p>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-4">Workspace occupancy</h2>
            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
              {inventory.length === 0 ? (
                <p className="text-sm text-slate-500">No inventory found.</p>
              ) : inventory.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.type} • capacity {item.capacity}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Recent bookings</h2>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto pr-1">
            {activeBookings.length === 0 ? (
              <p className="text-sm text-slate-500">No bookings found.</p>
            ) : activeBookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Booking {booking.id}</p>
                    <p className="mt-1 text-xs text-slate-500">{booking.start_date} → {booking.end_date} • {booking.billing_cycle}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{booking.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Branch notifications</h2>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500">No notifications found.</p>
            ) : notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{notification.type.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-xs text-slate-500">{notification.payload?.booking_id ? `Booking ${notification.payload.booking_id}` : notification.payload?.lead_id ? `Lead ${notification.payload.lead_id}` : 'System notification'}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{notification.read ? 'read' : 'unread'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {statusMessage ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{statusMessage}</div> : null}
      </div>
    </div>
  );
}
