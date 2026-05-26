'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import FloorMap from '../../../components/FloorMap';
import { StatusBadge, formatSeatType } from '../../../components/DashboardComponents';
import { BACKEND_URL, KALYAN_BRANCH_ID } from '../../../lib/constants';
import { getDashboardPath, readAuthSession } from '../../../lib/session';
import type { InventoryItem } from '../../../lib/types';

type BookingForm = {
  start_date: string;
  end_date: string;
  billing_cycle: 'daily' | 'monthly';
  notes: string;
};

export default function MemberDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [branchId, setBranchId] = useState(KALYAN_BRANCH_ID);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<InventoryItem | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    start_date: new Date().toISOString().slice(0, 10),
    end_date: (() => { const end = new Date(); end.setMonth(end.getMonth() + 1); return end.toISOString().slice(0, 10); })(),
    billing_cycle: 'monthly',
    notes: '',
  });
  const [supportSeatId, setSupportSeatId] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    if (session.role !== 'member') {
      router.replace(getDashboardPath(session.role));
      return;
    }

    setMemberId(session.member_id);
    setBranchId(session.branch_id || KALYAN_BRANCH_ID);
    setMounted(true);
  }, [router]);

  const fetchInventory = async (targetBranchId: string) => {
    const response = await fetch(`${BACKEND_URL}/api/v1/inventory?branch_id=${targetBranchId}`);
    if (!response.ok) return [] as InventoryItem[];
    return await response.json();
  };

  useEffect(() => {
    if (!mounted) return;

    let active = true;

    const sync = async () => {
      try {
        const data = await fetchInventory(branchId);
        if (active) setInventory(data || []);
      } catch {
        if (active) setStatusMessage('Unable to refresh floor plan right now.');
      }
    };

    sync();
    const timer = window.setInterval(sync, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [mounted, branchId]);

  const availableCount = useMemo(
    () => inventory.filter((item) => item.status === 'available').length,
    [inventory],
  );

  const handleBookSpace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSpace) return;

    setStatusMessage('Submitting booking...');
    const response = await fetch(`${BACKEND_URL}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'member',
        'X-User-ID': memberId,
      },
      body: JSON.stringify({
        inventory_item_id: selectedSpace.id,
        branch_id: branchId,
        start_date: bookingForm.start_date,
        end_date: bookingForm.end_date,
        billing_cycle: bookingForm.billing_cycle,
        notes: bookingForm.notes,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      setStatusMessage(`Booking confirmed for ${selectedSpace.name}.`);
      setSelectedSpace(null);
      setBookingForm((current) => ({ ...current, notes: '' }));
      setInventory((current) => current.map((item) => item.id === selectedSpace.id ? { ...item, status: 'allocated' } : item));
    } else {
      setStatusMessage(typeof data?.detail === 'string' ? data.detail : 'Booking failed.');
    }
  };

  const handleTicketSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supportDescription.trim()) return;

    setStatusMessage('Submitting support ticket...');
    const response = await fetch(`${BACKEND_URL}/api/v1/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'member',
        'X-User-ID': memberId,
      },
      body: JSON.stringify({
        branch_id: branchId,
        inventory_item_id: supportSeatId || null,
        description: supportDescription,
      }),
    });

    if (response.ok) {
      setSupportDescription('');
      setSupportSeatId('');
      setStatusMessage('Support ticket submitted.');
    } else {
      const data = await response.json().catch(() => null);
      setStatusMessage(typeof data?.detail === 'string' ? data.detail : 'Ticket submission failed.');
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Member Portal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Book a desk and submit support without the noise.</h1>
            <p className="mt-3 text-sm text-slate-500">Clean booking flow, live floor map, and a direct helpdesk form.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900"><MapPin className="h-4 w-4 text-emerald-600" />Kalyan Center</div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />{availableCount} open spaces</div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Interactive floor plan</h2>
                <p className="text-sm text-slate-500">Available spaces are clickable. Occupied spaces are locked.</p>
              </div>
              <div className="text-xs text-slate-500">Click an available desk to book</div>
            </div>
            <FloorMap
              inventory={inventory}
              onSelectSpace={(item) => {
                if (item && item.status !== 'available') return;
                setSelectedSpace(item);
                setBookingForm((current) => ({
                  ...current,
                  billing_cycle: item?.type === 'meeting_room' ? 'daily' : 'monthly',
                }));
              }}
            />
          </section>

          <aside className="space-y-6">
            <form onSubmit={handleTicketSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4 text-cyan-600" />
                <h2 className="text-base font-semibold text-slate-900">Support ticket</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Desk or room</label>
                  <select value={supportSeatId} onChange={(event) => setSupportSeatId(event.target.value)} className="input">
                    <option value="">Select a space</option>
                    {inventory.map((seat) => (
                      <option key={seat.id} value={seat.id}>{seat.name} - {formatSeatType(seat.type)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Issue</label>
                  <textarea
                    value={supportDescription}
                    onChange={(event) => setSupportDescription(event.target.value)}
                    className="input min-h-[124px] resize-none"
                    placeholder="My desk light is flickering..."
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center">Submit ticket</button>
              </div>
            </form>

            {statusMessage ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                {statusMessage}
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Your selected space</h2>
              {selectedSpace ? (
                <form onSubmit={handleBookSpace} className="space-y-4">
                  <div>
                    <p className="font-semibold text-slate-900">{selectedSpace.name}</p>
                    <p className="text-sm text-slate-500">{formatSeatType(selectedSpace.type)} • Capacity {selectedSpace.capacity}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Start date</label>
                      <input type="date" value={bookingForm.start_date} onChange={(event) => setBookingForm((current) => ({ ...current, start_date: event.target.value }))} className="input" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">End date</label>
                      <input type="date" value={bookingForm.end_date} onChange={(event) => setBookingForm((current) => ({ ...current, end_date: event.target.value }))} className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Billing cycle</label>
                    <select value={bookingForm.billing_cycle} onChange={(event) => setBookingForm((current) => ({ ...current, billing_cycle: event.target.value as BookingForm['billing_cycle'] }))} className="input">
                      <option value="monthly">Monthly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Notes</label>
                    <textarea value={bookingForm.notes} onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))} className="input min-h-[96px] resize-none" placeholder="Add a note for reception or facilities" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" className="btn-ghost flex-1 justify-center" onClick={() => setSelectedSpace(null)}>Close</button>
                    <button type="submit" className="btn-primary flex-1 justify-center">Confirm booking</button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-slate-500">Select an available desk or room from the floor map to open the booking modal.</p>
              )}
            </div>
          </aside>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <CalendarRange className="h-3.5 w-3.5" />
          Daily and monthly slot booking is available directly from the selected space modal.
        </div>
      </div>
    </div>
  );
}
