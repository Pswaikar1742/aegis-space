'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardList, Wrench } from 'lucide-react';
import { BACKEND_URL, KALYAN_BRANCH_ID } from '../../../lib/constants';
import { getDashboardPath, readAuthSession } from '../../../lib/session';
import type { FacilityTask } from '../../../lib/types';

export default function VendorPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [branchId, setBranchId] = useState(KALYAN_BRANCH_ID);
  const [tasks, setTasks] = useState<FacilityTask[]>([]);
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('Common area');
  const [taskType, setTaskType] = useState('cleaning');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) return router.replace('/login');
    if (session.role !== 'vendor') return router.replace(getDashboardPath(session.role));
    setMemberId(session.member_id);
    setBranchId(session.branch_id || KALYAN_BRANCH_ID);
    setMounted(true);
  }, [router]);

  const fetchTasks = async () => {
    const response = await fetch(`${BACKEND_URL}/api/v1/facility/tasks?branch_id=${branchId}`, {
      headers: { 'X-User-Role': 'vendor', 'X-User-ID': memberId },
    });
    if (response.ok) setTasks(await response.json());
  };

  useEffect(() => {
    if (!mounted) return;
    fetchTasks().catch(() => setStatusMessage('Unable to load facility tasks.'));
    const timer = window.setInterval(() => fetchTasks().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [mounted, branchId, memberId]);

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch(`${BACKEND_URL}/api/v1/facility/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'vendor',
        'X-User-ID': memberId,
      },
      body: JSON.stringify({ branch_id: branchId, area, task_type: taskType, description: description || title, priority }),
    });
    if (response.ok) {
      setTitle('');
      setDescription('');
      await fetchTasks();
      setStatusMessage('Task created.');
    }
  };

  const setTaskState = async (taskId: string, state: string) => {
    await fetch(`${BACKEND_URL}/api/v1/facility/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'vendor',
        'X-User-ID': memberId,
      },
      body: JSON.stringify({ status: state }),
    });
    await fetchTasks();
  };

  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Vendor</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Facilities task board.</h1>
          <p className="mt-3 text-sm text-slate-500">Live cleaning and maintenance work orders from the backend.</p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={createTask} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-semibold">Create facility task</h2>
            </div>
            <input className="input" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="input" placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} />
            <select className="input" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              <option value="cleaning">Cleaning</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
              <option value="vendor_service">Vendor service</option>
            </select>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <textarea className="input min-h-[120px] resize-none" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <button className="btn-primary w-full justify-center" type="submit">Create task</button>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-4 w-4 text-cyan-600" />
              <h2 className="text-base font-semibold">Live task feed</h2>
            </div>
            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-500">No facility tasks yet.</p>
              ) : tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{task.task_type.replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-xs text-slate-500">{task.description}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{task.status}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setTaskState(task.id, 'in_progress')} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700">Start</button>
                    <button onClick={() => setTaskState(task.id, 'completed')} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                      Complete <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
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
