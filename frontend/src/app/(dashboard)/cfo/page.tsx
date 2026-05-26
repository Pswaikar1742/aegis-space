'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { StatusBadge, KpiCard } from '../../../components/DashboardComponents';
import { BACKEND_URL, KALYAN_BRANCH_ID } from '../../../lib/constants';
import { getDashboardPath, readAuthSession } from '../../../lib/session';

type AnalyticsResponse = {
  total_revenue: number;
  global_occupancy_rate: number;
  branch_performance: Record<string, { revenue: number; bookings: number }>;
};

type Receivable = {
  id: string;
  company_name: string;
  branch_id: string;
  base_rent: number;
  incidentals: number;
  total_due: number;
  status: string;
  created_at?: string;
};

export default function CFODashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [branchId, setBranchId] = useState(KALYAN_BRANCH_ID);
  const [analytics, setAnalytics] = useState<AnalyticsResponse>({ total_revenue: 0, global_occupancy_rate: 0, branch_performance: {} });
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    if (session.role !== 'cfo') {
      router.replace(getDashboardPath(session.role));
      return;
    }

    setMemberId(session.member_id);
    setBranchId(session.branch_id || KALYAN_BRANCH_ID);
    setMounted(true);
  }, [router]);

  const fetchCfoState = async () => {
    const [analyticsRes, receivablesRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/analytics/global`, {
        headers: { 'X-User-Role': 'cfo', 'X-User-ID': memberId },
      }),
      fetch(`${BACKEND_URL}/api/v1/billing/receivables`, {
        headers: { 'X-User-Role': 'cfo', 'X-User-ID': memberId },
      }),
    ]);

    if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    if (receivablesRes.ok) setReceivables(await receivablesRes.json());
  };

  useEffect(() => {
    if (!mounted) return;

    let active = true;
    const sync = async () => {
      try {
        await fetchCfoState();
      } catch {
        if (active) setStatusMessage('CFO telemetry refresh failed.');
      }
    };

    sync();
    const timer = window.setInterval(sync, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [mounted, memberId]);

  useEffect(() => {
    if (!mounted) return;
    const handler = (e: Event) => {
      const ev = (e as CustomEvent).detail as any;
      if (!ev) return;
      if (['booking_created','booking_cancelled','ticket_created','attendance_punched'].includes(ev.type)) {
        fetchCfoState().catch(() => setStatusMessage('Live update failed'));
      }
    };
    window.addEventListener('aegis:event', handler as EventListener);
    return () => window.removeEventListener('aegis:event', handler as EventListener);
  }, [mounted]);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Financial workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Yield analytics and accounts receivable.</h1>
          <p className="mt-3 text-sm text-slate-500">A dedicated CFO view with portfolio rollup and invoice tracking.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={DollarSign} label="Portfolio revenue" value={`$${analytics.total_revenue.toLocaleString()}`} color="emerald" />
          <KpiCard icon={TrendingUp} label="Occupancy rate" value={`${analytics.global_occupancy_rate.toFixed(2)}%`} color="indigo" />
          <KpiCard icon={Building2} label="Active branches" value={Object.keys(analytics.branch_performance || {}).length} color="blue" />
          <KpiCard icon={Wallet} label="Open receivables" value={receivables.length} color="amber" />
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Yield analytics</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Revenue</th>
                  <th>Bookings</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.branch_performance || {}).map(([branch, value]) => (
                  <tr key={branch}>
                    <td className="font-semibold text-slate-800">{branch === branchId ? 'Current branch' : branch}</td>
                    <td className="font-mono text-slate-700">${value.revenue.toLocaleString()}</td>
                    <td>{value.bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Accounts receivable</h2>
            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
              {receivables.length === 0 ? (
                <p className="text-sm text-slate-500">No receivables found.</p>
              ) : receivables.map((invoice) => (
                <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.company_name}</p>
                      <p className="text-xs text-slate-500 mt-1">${invoice.total_due.toLocaleString()} due</p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div>
                      <p className="uppercase tracking-[0.24em] text-[10px] text-slate-400">Base rent</p>
                      <p className="mt-1 font-semibold text-slate-900">${invoice.base_rent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.24em] text-[10px] text-slate-400">Incidentals</p>
                      <p className="mt-1 font-semibold text-slate-900">${invoice.incidentals.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.24em] text-[10px] text-slate-400">Created</p>
                      <p className="mt-1 font-semibold text-slate-900">{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {statusMessage ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{statusMessage}</div> : null}
      </div>
    </div>
  );
}
