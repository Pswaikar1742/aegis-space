"use client";

import React from 'react';
import { AUTH_SESSION_KEY } from '../lib/session';

export default function LogoutButton() {
  const logout = () => {
    try { window.localStorage.removeItem(AUTH_SESSION_KEY); } catch {}
    try { window.localStorage.removeItem('aegis-space-active-branch'); } catch {}
    // redirect to login
    window.location.href = '/login';
  };

  return (
    <button onClick={logout} className="fixed right-4 bottom-4 z-40 rounded-full bg-slate-900 text-white px-3 py-2 text-sm shadow hover:opacity-95">Logout</button>
  );
}
