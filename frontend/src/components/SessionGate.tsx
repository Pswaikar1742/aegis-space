import { LockKeyhole, ShieldCheck, Fingerprint, Mail, Zap } from 'lucide-react';
import { PERSONA_CREDENTIALS, NAV_ITEMS } from '../lib/constants';
import type { Persona } from '../lib/types';

const PERSONA_OPTIONS = NAV_ITEMS.map((item) => ({
  value: item.key,
  label: item.label,
}));

export function SessionGate({
  selectedPersona,
  onPersonaChange,
  password,
  onPasswordChange,
  error,
  onSubmit,
}: {
  selectedPersona: Persona;
  onPersonaChange: (persona: Persona) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const selectedPersonaConfig = PERSONA_CREDENTIALS[selectedPersona];

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(135deg,_#020617_0%,_#0f172a_55%,_#111827_100%)]" />
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:52px_52px]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.08fr_0.92fr] gap-6 items-stretch">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-slate-950/40 p-8 lg:p-10 overflow-hidden relative">
            <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <LockKeyhole className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">AegisSpace Central Gateway</p>
                <h1 className="text-2xl lg:text-4xl font-semibold tracking-tight">Enterprise Session Gate</h1>
              </div>
            </div>

            <p className="max-w-2xl text-sm lg:text-base text-slate-300 leading-7">
              Select a persona, enter the mock secure passphrase, and initiate a gated session.
              The dashboard behind this lock is still persona-driven, but it will not render until a secure session is established.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              {Object.entries(PERSONA_CREDENTIALS).slice(0, 3).map(([key, persona]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{persona.label}</p>
                  <p className="mt-2 text-sm text-slate-200">{persona.access}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Persona-bound access</p>
                  <p className="mt-1 text-slate-400">The selected workspace is stored with the session.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 flex items-start gap-3">
                <Fingerprint className="h-5 w-5 text-cyan-300 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Mock verification</p>
                  <p className="mt-1 text-slate-400">No backend auth required, just a deliberate gate.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 flex items-start gap-3">
                <Mail className="h-5 w-5 text-amber-300 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Easy demo password</p>
                  <p className="mt-1 text-slate-400">Use the persona passphrase shown in the right panel.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl shadow-slate-950/40 p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Secure login</p>
                <h2 className="text-xl font-semibold mt-1">Initiate Secure Session</h2>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-cyan-300" />
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Persona</label>
                <select
                  value={selectedPersona}
                  onChange={(event) => onPersonaChange(event.target.value as Persona)}
                  className="input !bg-slate-900 !border-slate-700 !text-slate-100"
                >
                  {PERSONA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mock password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder={`Enter ${PERSONA_CREDENTIALS[selectedPersona].label} passphrase`}
                  className="input !bg-slate-900 !border-slate-700 !text-slate-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Demo credential for this persona: <span className="text-slate-300 font-medium">{selectedPersonaConfig.password}</span>
                </p>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Session scope: {selectedPersonaConfig.access}
                </div>
              )}

              <button type="submit" className="btn-primary w-full !py-3.5 text-base">
                Initiate Secure Session
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400 leading-6">
              This gate is intentionally local and deterministic. It exists to separate personas at the UI layer while keeping the current dashboard behavior intact after authentication.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
