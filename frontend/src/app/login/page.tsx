'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Mail, LockKeyhole, Building2, ArrowRight } from 'lucide-react';
import { BACKEND_URL } from '../../lib/constants';
import { getDashboardPath, readAuthSession, saveAuthSession } from '../../lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('manager@aegis.local');
  const [password, setPassword] = useState('AegisSpace2026!MGR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = readAuthSession();
    if (session) {
      router.replace(getDashboardPath(session.role));
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(typeof data?.detail === 'string' ? data.detail : 'Login failed');
        return;
      }

      saveAuthSession(data);
      router.replace(getDashboardPath(data.role));
    } catch {
      setError(`Unable to reach ${BACKEND_URL}. Check the backend base URL and redeploy.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(135deg,_#07111f_0%,_#0f172a_55%,_#111827_100%)] text-white">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.1fr_0.9fr] items-stretch">
        <div className="flex items-center px-6 py-12 lg:px-12 xl:px-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-slate-300">
              <Building2 className="h-4 w-4 text-cyan-300" />
              AegisSpace Access Portal
            </div>
            <h1 className="mt-8 text-4xl lg:text-6xl font-semibold tracking-tight leading-tight">
              Corporate access for the next workspace session.
            </h1>
            <p className="mt-6 max-w-xl text-base lg:text-lg text-slate-300 leading-8">
              Sign in to jump directly into your role-specific dashboard. Member, manager, and CFO workspaces load independently with live state polling and clean task-focused layouts.
            </p>

            <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Role routing</p>
                <p className="mt-1 text-slate-400">Sessions route to the correct workspace automatically.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Local session</p>
                <p className="mt-1 text-slate-400">Auth state is stored in localStorage for fast re-entry.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Live backend</p>
                <p className="mt-1 text-slate-400">Login validates against the SQLite-backed members table.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 lg:px-12 xl:px-20">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl shadow-slate-950/50 p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Secure login</p>
                <h2 className="text-2xl font-semibold mt-1">Welcome back</h2>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-cyan-300" />
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input !pl-10 !bg-slate-900 !border-slate-700 !text-slate-100"
                    placeholder="manager@aegis.local"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input !pl-10 !bg-slate-900 !border-slate-700 !text-slate-100"
                    placeholder="Enter your workspace password"
                    required
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Use the demo corporate credentials to unlock your workspace.
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-70">
                {loading ? 'Signing in...' : 'Enter Workspace'}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
