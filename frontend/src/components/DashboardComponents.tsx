import { MEMBER_LOCATION_FILTERS } from '../lib/constants';

export function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string; }) {
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

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: 'badge-success', allocated: 'badge-danger', maintenance: 'badge-warning',
    new: 'badge-info', proposal_sent: 'badge-warning', closed_won: 'badge-success',
    workbench_halted: 'badge-danger', open: 'badge-warning', in_progress: 'badge-info', resolved: 'badge-success',
    pre_registered: 'badge-neutral', checked_in: 'badge-success', checked_out: 'badge-slate',
    pending: 'badge-warning', completed: 'badge-success',
  };
  return <span className={map[status] || 'badge-neutral'}>{status.replace(/_/g, ' ')}</span>;
}

export function formatSeatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

export function seatTypeFilterLabel(filter: string) {
  const entry = MEMBER_LOCATION_FILTERS.find((item) => item.value === filter);
  return entry?.label ?? 'All locations';
}
