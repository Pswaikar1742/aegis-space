'use client';

import { useState } from 'react';
import { LogOut, Settings, Search, Bell, ShieldCheck } from 'lucide-react';
import { useAegis } from './AegisProvider';
import { NAV_ITEMS, PERSONA_CREDENTIALS, STARK_MEMBER_ID } from '../lib/constants';
import { AICopilot } from './AICopilot';
import { useRouter } from 'next/navigation';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { persona, setPersona, lockSession, notifications, markNotificationRead, toasts, fetchState, fetchNotifications, activeBranchId } = useAegis();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const activePersona = (['cfo','manager','tenant_admin','member'].includes(persona) ? persona : 'member') as 'cfo' | 'manager' | 'tenant_admin' | 'member';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
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
              <button key={n.key} onClick={() => { setPersona(n.key); router.push(`/${n.key}`); }} className={persona === n.key ? 'nav-item-active w-full' : 'nav-item w-full'}>
                <n.icon size={18} />{sidebarOpen && <span className="text-sm font-medium">{n.label}</span>}
              </button>
            ))}
          </div>
          <div>
            {sidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Integrations</p>}
            {NAV_ITEMS.filter(n => n.category === 'Integration').map(n => (
              <button key={n.key} onClick={() => { setPersona(n.key); router.push(`/${n.key}`); }} className={persona === n.key ? 'nav-item-active w-full' : 'nav-item w-full'}>
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
              <p className="text-[11px] text-slate-500">Session active for {PERSONA_CREDENTIALS[persona]?.label}</p>
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
          {children}
        </main>
      </div>
      <AICopilot 
        activeRole={activePersona}
        branchId={activeBranchId}
        memberId={STARK_MEMBER_ID}
        onRefreshTelemetry={fetchState}
      />
    </div>
  );
}
