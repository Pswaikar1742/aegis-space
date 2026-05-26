'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Bell, ShieldCheck } from 'lucide-react';
import AICopilot from '../../../components/AICopilot';
import { BACKEND_URL, KALYAN_BRANCH_ID } from '../../../lib/constants';
import { getDashboardPath, readAuthSession } from '../../../lib/session';
import type { InventoryItem, Visitor } from '../../../lib/types';

export default function ITAdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [branchId, setBranchId] = useState(KALYAN_BRANCH_ID);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) return router.replace('/login');
    if (session.role !== 'it_admin') return router.replace(getDashboardPath(session.role));
    setMemberId(session.member_id);
    setBranchId(session.branch_id || KALYAN_BRANCH_ID);
    setMounted(true);
  }, [router]);

  const fetchState = async () => {
    const [inventoryRes, visitorsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/inventory?branch_id=${branchId}`),
      fetch(`${BACKEND_URL}/api/v1/visitors?branch_id=${branchId}`, {
        headers: { 'X-User-Role': 'front_desk', 'X-User-ID': memberId },
      }),
    ]);
    if (inventoryRes.ok) setInventory(await inventoryRes.json());
    if (visitorsRes.ok) setVisitors(await visitorsRes.json());
  };

  useEffect(() => {
    if (!mounted) return;
    fetchState().catch(() => setStatusMessage('Unable to load IT telemetry.'));
    const timer = window.setInterval(() => fetchState().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [mounted, branchId, memberId]);

  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  const allocated = inventory.filter((item) => item.status === 'allocated').length;
  const maintenance = inventory.filter((item) => item.status === 'maintenance').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">IT / Network Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Infrastructure and occupancy telemetry.</h1>
          <p className="mt-3 text-sm text-slate-500">Live desk allocation, visitor flow, and branch health snapshots.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Activity className="h-4 w-4 text-cyan-600" />Allocated seats</div>
            <div className="mt-3 text-3xl font-semibold">{allocated}</div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><ShieldCheck className="h-4 w-4 text-amber-600" />Maintenance seats</div>
            <div className="mt-3 text-3xl font-semibold">{maintenance}</div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Bell className="h-4 w-4 text-emerald-600" />Recent visitors</div>
            <div className="mt-3 text-3xl font-semibold">{visitors.length}</div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-4">Inventory health</h2>
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

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-4">Visitor flow</h2>
            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
              {visitors.length === 0 ? (
                <p className="text-sm text-slate-500">No visitor records yet.</p>
              ) : visitors.map((visitor) => (
                <div key={visitor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-slate-900">{visitor.visitor_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{visitor.purpose} • {visitor.status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {statusMessage ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{statusMessage}</div> : null}
      </div>

      <AICopilot
        activeRole="it_admin"
        branchId={branchId}
        memberId={memberId}
        onRefreshTelemetry={fetchState}
      />
    </div>
  );
}
