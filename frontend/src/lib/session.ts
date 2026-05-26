import type { Persona } from './types';

export const AUTH_SESSION_KEY = 'aegis-space-auth-session';

export type AuthSession = {
  member_id: string;
  email: string;
  role: Persona;
  branch_id: string;
  company_name: string;
  session_token: string;
  authenticated_at: string;
};

export function getDashboardPath(role: Persona) {
  switch (role) {
    case 'cfo':
      return '/cfo';
    case 'manager':
      return '/manager';
    case 'member':
      return '/member';
    case 'tenant_admin':
      return '/tenant_admin';
    case 'front_desk':
      return '/front_desk';
    case 'it_admin':
      return '/it_admin';
    case 'vendor':
      return '/vendor';
    default:
      return '/login';
  }
}

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function readAuthSession(): AuthSession | null {
  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}
