/**
 * AegiSpace — Backend API Integration Tests (Playwright)
 *
 * Tests every backend endpoint against the live SQLite-backed FastAPI server.
 * Validates: health, branches, inventory, leads, bookings (CRUD),
 * tickets, member perks, analytics, visitors, facility tasks,
 * notifications, special requests, CRM pipeline, and billing.
 */

import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';
const KALYAN = '4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d';
const STARK_ID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';

function h(role: string) {
  return {
    'Content-Type': 'application/json',
    'X-User-Role': role,
    'X-User-ID': STARK_ID,
  };
}

// ── 1. Health & System ──────────────────────────────────────────────────

test.describe('System Health', () => {
  test('GET /health returns healthy', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('AegiSpace');
  });
});

// ── 2. Branches ─────────────────────────────────────────────────────────

test.describe('Branches', () => {
  test('GET /api/v1/branches returns 3 seeded branches', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/branches`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBe(3);
    const names = data.map((b: any) => b.name);
    expect(names).toContain('Kalyan Center');
    expect(names).toContain('BKC Tower');
    expect(names).toContain('Hyderabad Hub');
  });
});

// ── 3. Inventory ────────────────────────────────────────────────────────

test.describe('Inventory', () => {
  test('GET /api/v1/inventory returns items for Kalyan', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/inventory?branch_id=${KALYAN}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(10);
    // Verify structure
    const item = data[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('name');
    expect(item).toHaveProperty('type');
    expect(item).toHaveProperty('status');
    expect(item).toHaveProperty('capacity');
    expect(item).toHaveProperty('monthly_rate');
  });

  test('GET /api/v1/inventory/{id} returns single item', async ({ request }) => {
    // First get inventory list
    const listRes = await request.get(`${API}/api/v1/inventory?branch_id=${KALYAN}`);
    const items = await listRes.json();
    const first = items[0];

    const res = await request.get(`${API}/api/v1/inventory/${first.id}`);
    expect(res.ok()).toBeTruthy();
    const item = await res.json();
    expect(item.id).toBe(first.id);
    expect(item.name).toBe(first.name);
  });
});

// ── 4. Leads & CRM Pipeline ────────────────────────────────────────────

test.describe('Leads & CRM', () => {
  test('GET /api/v1/leads returns seeded leads', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/leads?branch_id=${KALYAN}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
    const names = data.map((l: any) => l.company_name);
    expect(names).toContain('Wayne Enterprises');
    expect(names).toContain('Stark Industries');
  });

  test('PATCH /api/v1/leads/{id}/stage updates lead status', async ({ request }) => {
    const listRes = await request.get(`${API}/api/v1/leads?branch_id=${KALYAN}`);
    const leads = await listRes.json();
    const newLead = leads.find((l: any) => l.status === 'new');
    if (!newLead) return; // Skip if no 'new' leads

    const res = await request.patch(`${API}/api/v1/leads/${newLead.id}/stage`, {
      headers: h('manager'),
      data: { status: 'proposal_sent' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('proposal_sent');
  });
});

// ── 5. Bookings — Full CRUD Lifecycle ───────────────────────────────────

test.describe('Bookings CRUD', () => {
  let bookingId: string;
  let inventoryItemId: string;

  test('POST /api/v1/bookings creates booking & allocates inventory', async ({ request }) => {
    // Find an available hot desk
    const invRes = await request.get(`${API}/api/v1/inventory?branch_id=${KALYAN}`);
    const items = await invRes.json();
    const available = items.find((i: any) => i.status === 'available' && i.type === 'hot_desk');
    expect(available).toBeTruthy();
    inventoryItemId = available.id;

    const res = await request.post(`${API}/api/v1/bookings`, {
      headers: h('member'),
      data: {
        inventory_item_id: inventoryItemId,
        branch_id: KALYAN,
        start_date: '2026-06-01',
        end_date: '2026-07-01',
        billing_cycle: 'monthly',
        notes: 'Playwright test booking',
      },
    });
    expect(res.status()).toBe(201);
    const booking = await res.json();
    bookingId = booking.id;
    expect(booking.status).toBe('pending');
    expect(booking.monthly_rate_locked).toBeGreaterThan(0);
    expect(booking.total_value).toBeGreaterThan(0);

    // Verify inventory is now allocated
    const itemRes = await request.get(`${API}/api/v1/inventory/${inventoryItemId}`);
    const item = await itemRes.json();
    expect(item.status).toBe('allocated');
  });

  test('GET /api/v1/bookings lists created booking', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/bookings?branch_id=${KALYAN}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    const found = data.find((b: any) => b.id === bookingId);
    expect(found).toBeTruthy();
  });

  test('PATCH /api/v1/bookings/{id} cancels booking & releases inventory', async ({ request }) => {
    const res = await request.patch(`${API}/api/v1/bookings/${bookingId}`, {
      headers: h('manager'),
      data: { status: 'cancelled' },
    });
    expect(res.ok()).toBeTruthy();
    const booking = await res.json();
    expect(booking.status).toBe('cancelled');

    // Verify inventory released
    const itemRes = await request.get(`${API}/api/v1/inventory/${inventoryItemId}`);
    const item = await itemRes.json();
    expect(item.status).toBe('available');
  });
});

// ── 6. Maintenance Tickets ──────────────────────────────────────────────

test.describe('Maintenance Tickets', () => {
  test('POST /api/v1/tickets creates ticket', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/tickets`, {
      headers: h('member'),
      data: {
        branch_id: KALYAN,
        description: 'WiFi is intermittent at HD-05',
        inventory_item_id: null,
      },
    });
    expect(res.status()).toBe(201);
    const ticket = await res.json();
    expect(ticket.status).toBe('open');
    expect(ticket.description).toContain('WiFi');
  });

  test('GET /api/v1/tickets lists tickets', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/tickets?branch_id=${KALYAN}`, {
      headers: h('manager'),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 7. Member Perks (Tenant Admin) ──────────────────────────────────────

test.describe('Member Perks', () => {
  test('GET /api/v1/members/perks/{id} returns perks', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/members/perks/${STARK_ID}`, {
      headers: h('tenant_admin'),
    });
    expect(res.ok()).toBeTruthy();
    const perks = await res.json();
    expect(perks.member_id).toBe(STARK_ID);
    expect(perks.monthly_credits).toBeGreaterThanOrEqual(0);
    expect(perks.printing_quota).toBeGreaterThanOrEqual(0);
  });

  test('PATCH /api/v1/members/perks/{id} updates credits', async ({ request }) => {
    const res = await request.patch(`${API}/api/v1/members/perks/${STARK_ID}`, {
      headers: h('tenant_admin'),
      data: { monthly_credits: 200 },
    });
    expect(res.ok()).toBeTruthy();
    const perks = await res.json();
    expect(perks.monthly_credits).toBe(200);
  });
});

// ── 8. CFO Analytics ────────────────────────────────────────────────────

test.describe('Analytics (CFO)', () => {
  test('GET /api/v1/analytics/global returns metrics', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/analytics/global`, {
      headers: h('cfo'),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('total_revenue');
    expect(data).toHaveProperty('global_occupancy_rate');
    expect(data).toHaveProperty('branch_performance');
  });

  test('GET /api/v1/analytics/global rejects non-CFO roles', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/analytics/global`, {
      headers: h('member'),
    });
    expect(res.status()).toBe(403);
  });
});

// ── 9. Visitors (Front-Desk) ────────────────────────────────────────────

test.describe('Visitors (Front-Desk)', () => {
  let visitorId: string;

  test('POST /api/v1/visitors registers visitor', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/visitors`, {
      headers: h('front_desk'),
      data: {
        branch_id: KALYAN,
        visitor_name: 'Clark Kent',
        company: 'Daily Planet',
        purpose: 'Interview',
      },
    });
    expect(res.status()).toBe(201);
    const visitor = await res.json();
    visitorId = visitor.id;
    expect(visitor.status).toBe('pre_registered');
  });

  test('GET /api/v1/visitors lists visitors', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/visitors?branch_id=${KALYAN}`, {
      headers: h('front_desk'),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  test('PATCH /api/v1/visitors/{id}/checkin checks in visitor', async ({ request }) => {
    const res = await request.patch(`${API}/api/v1/visitors/${visitorId}/checkin`, {
      headers: h('front_desk'),
    });
    expect(res.ok()).toBeTruthy();
    const visitor = await res.json();
    expect(visitor.status).toBe('checked_in');
    expect(visitor.checked_in_at).toBeTruthy();
  });

  test('PATCH /api/v1/visitors/{id}/checkout checks out visitor', async ({ request }) => {
    const res = await request.patch(`${API}/api/v1/visitors/${visitorId}/checkout`, {
      headers: h('front_desk'),
    });
    expect(res.ok()).toBeTruthy();
    const visitor = await res.json();
    expect(visitor.status).toBe('checked_out');
    expect(visitor.checked_out_at).toBeTruthy();
  });
});

// ── 10. Facility Tasks (Vendor) ─────────────────────────────────────────

test.describe('Facility Tasks (Vendor)', () => {
  let taskId: string;

  test('POST /api/v1/facility/tasks creates task', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/facility/tasks`, {
      headers: h('vendor'),
      data: {
        branch_id: KALYAN,
        area: 'Pantry',
        task_type: 'cleaning',
        description: 'Deep clean kitchen area and restock supplies',
        priority: 'high',
      },
    });
    expect(res.status()).toBe(201);
    const task = await res.json();
    taskId = task.id;
    expect(task.status).toBe('pending');
  });

  test('GET /api/v1/facility/tasks lists tasks', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/facility/tasks?branch_id=${KALYAN}`, {
      headers: h('vendor'),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  test('PATCH /api/v1/facility/tasks/{id} marks task completed', async ({ request }) => {
    const res = await request.patch(`${API}/api/v1/facility/tasks/${taskId}`, {
      headers: h('vendor'),
      data: { status: 'completed', notes: 'Completed by Playwright' },
    });
    expect(res.ok()).toBeTruthy();
    const task = await res.json();
    expect(task.status).toBe('completed');
    expect(task.notes).toBe('Completed by Playwright');
  });
});

// ── 11. Notifications ───────────────────────────────────────────────────

test.describe('Notifications', () => {
  test('GET /api/v1/notifications returns notifications', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/notifications?branch_id=${KALYAN}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  test('PATCH /api/v1/notifications/{id} marks as read', async ({ request }) => {
    const listRes = await request.get(`${API}/api/v1/notifications?branch_id=${KALYAN}`);
    const notifs = await listRes.json();
    const unread = notifs.find((n: any) => n.read === 0 || n.read === false);
    if (!unread) return;

    const res = await request.patch(`${API}/api/v1/notifications/${unread.id}`);
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.read).toBeTruthy();
  });
});

// ── 12. Special Requests (Bulk Booking CRM) ─────────────────────────────

test.describe('Special Requests', () => {
  test('POST /api/v1/special_requests creates lead + notification', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/special_requests`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        branch_id: KALYAN,
        company_name: 'Playwright Corp',
        contact_email: 'test@playwright.dev',
        details: 'Need 15 hot desks for quarterly sprint',
      },
    });
    expect(res.status()).toBe(201);
    const lead = await res.json();
    expect(lead.company_name).toBe('Playwright Corp');
    expect(lead.status).toBe('new');

    // Verify notification was created
    const notifRes = await request.get(`${API}/api/v1/notifications?branch_id=${KALYAN}`);
    const notifs = await notifRes.json();
    const specialNotif = notifs.find((n: any) => n.type === 'special_request');
    expect(specialNotif).toBeTruthy();
  });
});

// ── 13. Role-Based Access Control ───────────────────────────────────────

test.describe('RBAC Enforcement', () => {
  test('Analytics rejects member role', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/analytics/global`, {
      headers: h('member'),
    });
    expect(res.status()).toBe(403);
  });

  test('Tickets reject cfo-only access attempt with it_admin', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/tickets`, {
      headers: h('it_admin'),
      data: {
        branch_id: KALYAN,
        description: 'Should not be allowed for IT admin',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('Visitor registration rejects member role', async ({ request }) => {
    const res = await request.post(`${API}/api/v1/visitors`, {
      headers: h('member'),
      data: {
        branch_id: KALYAN,
        visitor_name: 'Test',
        purpose: 'Test',
      },
    });
    expect(res.status()).toBe(403);
  });
});
