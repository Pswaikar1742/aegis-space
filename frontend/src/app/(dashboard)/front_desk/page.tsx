'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserCheck, Users } from 'lucide-react';
import AICopilot from '../../../components/AICopilot';
import { BACKEND_URL, KALYAN_BRANCH_ID } from '../../../lib/constants';
import { getDashboardPath, readAuthSession } from '../../../lib/session';
import type { Visitor } from '../../../lib/types';

export default function FrontDeskPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [branchId, setBranchId] = useState(KALYAN_BRANCH_ID);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorName, setVisitorName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [company, setCompany] = useState('');
  const [hostMemberId, setHostMemberId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.role !== 'front_desk') {
      router.replace(getDashboardPath(session.role));
      return;
    }

    setMemberId(session.member_id);
    setBranchId(session.branch_id || KALYAN_BRANCH_ID);
    setMounted(true);
  }, [router]);

  const fetchVisitors = async () => {
    const response = await fetch(`${BACKEND_URL}/api/v1/visitors?branch_id=${branchId}`, {
      headers: { 'X-User-Role': 'front_desk', 'X-User-ID': memberId },
    });
    if (response.ok) setVisitors(await response.json());
  };

  useEffect(() => {
    if (!mounted) return;
    fetchVisitors().catch(() => setStatusMessage('Unable to load visitor feed.'));
    const timer = window.setInterval(() => fetchVisitors().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [mounted, branchId, memberId]);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch(`${BACKEND_URL}/api/v1/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'front_desk',
        'X-User-ID': memberId,
      },
      body: JSON.stringify({
        branch_id: branchId,
        visitor_name: visitorName,
        company: company || null,
        purpose,
        host_member_id: hostMemberId || null,
      }),
    });

    if (response.ok) {
      setVisitorName('');
      setCompany('');
      setPurpose('');
      setHostMemberId('');
      setStatusMessage('Visitor registered successfully.');
      await fetchVisitors();
    } else {
      const data = await response.json().catch(() => null);
      setStatusMessage(typeof data?.detail === 'string' ? data.detail : 'Visitor registration failed.');
    }
  };

  const toggleStatus = async (visitorId: string, action: 'checkin' | 'checkout') => {
    const response = await fetch(`${BACKEND_URL}/api/v1/visitors/${visitorId}/${action}`, {
      method: 'PATCH',
      headers: { 'X-User-Role': 'front_desk', 'X-User-ID': memberId },
    });
    if (response.ok) {
      await fetchVisitors();
      setStatusMessage(action === 'checkin' ? 'Visitor checked in.' : 'Visitor checked out.');
    }
  };

  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Front Desk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Visitor gate and check-in feed.</h1>
          <p className="mt-3 text-sm text-slate-500">Live visitor registrations, check-ins, and check-outs from the backend.</p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={handleRegister} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-cyan-600" />
              <h2 className="text-base font-semibold">Register visitor</h2>
            </div>
            <input className="input" placeholder="Visitor name" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
            <input className="input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="input" placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            <input className="input" placeholder="Host member ID (optional)" value={hostMemberId} onChange={(e) => setHostMemberId(e.target.value)} />
            <button className="btn-primary w-full justify-center" type="submit">Register</button>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-semibold">Live visitor feed</h2>
            </div>
            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
              {visitors.length === 0 ? (
                <p className="text-sm text-slate-500">No visitor records yet.</p>
              ) : visitors.map((visitor) => (
                <div key={visitor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{visitor.visitor_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{visitor.company || 'No company listed'} • {visitor.purpose}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{visitor.status}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => toggleStatus(visitor.id, 'checkin')} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      Check in <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => toggleStatus(visitor.id, 'checkout')} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Check out</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {statusMessage ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{statusMessage}</div> : null}
      </div>

      <AICopilot
        activeRole="front_desk"
        branchId={branchId}
        memberId={memberId}
        onRefreshTelemetry={fetchVisitors}
      />
    </div>
  );
}
