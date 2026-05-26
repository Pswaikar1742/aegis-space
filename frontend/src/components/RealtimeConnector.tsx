'use client';

import { useEffect, useRef } from 'react';
import { BACKEND_URL } from '../lib/constants';

function toWsUrl(url: string) {
  try {
    const u = new URL(url);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/api/v1/ws';
    return u.toString();
  } catch {
    return url.replace(/^http/, 'ws') + '/api/v1/ws';
  }
}

export default function RealtimeConnector() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const url = toWsUrl(BACKEND_URL);

    const connect = () => {
      if (!mounted) return;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          console.info('Realtime: connected to', url);
        };

        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            window.dispatchEvent(new CustomEvent('aegis:event', { detail: payload }));
            // lightweight toasts for demo visibility
            try {
              if (payload && payload.type) {
                const tmap: Record<string, string> = {
                  booking_created: 'Booking confirmed',
                  booking_cancelled: 'Booking cancelled',
                  ticket_created: 'New ticket created',
                  attendance_punched: 'Attendance recorded',
                };
                const msg = tmap[payload.type];
                if (msg) window.dispatchEvent(new CustomEvent('aegis:toast', { detail: { message: msg, level: 'info' } }));
              }
            } catch {}
          } catch (e) {
            console.warn('Realtime: invalid message', e);
          }
        };

        ws.onclose = () => {
          console.warn('Realtime: closed, will reconnect');
          if (!mounted) return;
          reconnectRef.current = window.setTimeout(connect, 1500);
        };

        ws.onerror = (e) => {
          console.error('Realtime: socket error', e);
          try { ws.close(); } catch {};
        };
      } catch (err) {
        console.error('Realtime connect failed', err);
        reconnectRef.current = window.setTimeout(connect, 2000);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      try { wsRef.current?.close(); } catch {}
    };
  }, []);

  return null;
}
