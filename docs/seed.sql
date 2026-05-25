-- ============================================================
-- AegiSpace — Supabase Seed SQL
-- Run this in the Supabase SQL Editor to seed demo data.
-- Handles the branches.address NOT NULL constraint.
-- ============================================================

-- ── Branches (3 locations) ──────────────────────────────────
INSERT INTO branches (id, name, city, address)
VALUES
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Kalyan Center', 'Mumbai Metropolitan Region', 'Kalyan West, Thane District'),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'BKC Tower', 'Mumbai', 'Bandra Kurla Complex, Mumbai 400051'),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'Hyderabad Hub', 'Hyderabad', 'HITEC City, Madhapur, Hyderabad 500081')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, address = EXCLUDED.address;


-- ── Inventory: Kalyan Center ────────────────────────────────
INSERT INTO inventory_items (branch_id, external_id, name, type, capacity, monthly_rate, status)
VALUES
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'hot_desk_1', 'HD-01', 'hot_desk', 1, 220, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'hot_desk_2', 'HD-02', 'hot_desk', 1, 220, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'hot_desk_3', 'HD-03', 'hot_desk', 1, 220, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'hot_desk_4', 'HD-04', 'hot_desk', 1, 220, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'hot_desk_5', 'HD-05', 'hot_desk', 1, 220, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'hot_desk_6', 'HD-06', 'hot_desk', 1, 220, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'dedicated_seat_40', 'Dedicated Seat #40', 'dedicated_desk', 1, 350, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'conference_alpha', 'Conference Room Alpha', 'meeting_room', 12, 1800, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'suite_203', 'Private Suite 203', 'private_suite', 6, 4200, 'available'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'phone_booth_a', 'Phone Booth A', 'meeting_room', 2, 520, 'available')
ON CONFLICT (branch_id, name) DO NOTHING;

-- ── Inventory: BKC Tower ────────────────────────────────────
INSERT INTO inventory_items (branch_id, external_id, name, type, capacity, monthly_rate, status)
VALUES
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_hot_1', 'BKC-HD-01', 'hot_desk', 1, 280, 'available'),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_hot_2', 'BKC-HD-02', 'hot_desk', 1, 280, 'available'),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_hot_3', 'BKC-HD-03', 'hot_desk', 1, 280, 'available'),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_ded_1', 'BKC-DS-01', 'dedicated_desk', 1, 450, 'available'),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_conf_a', 'BKC Conference A', 'meeting_room', 10, 2200, 'available'),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_suite_1', 'BKC Executive Suite', 'private_suite', 8, 5200, 'available')
ON CONFLICT (branch_id, name) DO NOTHING;

-- ── Inventory: Hyderabad Hub ────────────────────────────────
INSERT INTO inventory_items (branch_id, external_id, name, type, capacity, monthly_rate, status)
VALUES
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_hot_1', 'HYD-HD-01', 'hot_desk', 1, 200, 'available'),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_hot_2', 'HYD-HD-02', 'hot_desk', 1, 200, 'available'),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_ded_1', 'HYD-DS-01', 'dedicated_desk', 1, 380, 'available'),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_conf_a', 'HYD Conference A', 'meeting_room', 8, 1600, 'available'),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_suite_1', 'HYD Innovation Suite', 'private_suite', 10, 3800, 'available')
ON CONFLICT (branch_id, name) DO NOTHING;

-- ── Member Perks (Stark Industries) ─────────────────────────
INSERT INTO member_perks (member_id, monthly_credits, printing_quota, active)
VALUES ('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 240, 1000, true)
ON CONFLICT (member_id) DO UPDATE SET monthly_credits = EXCLUDED.monthly_credits, printing_quota = EXCLUDED.printing_quota;

-- ── Sample CRM Leads ────────────────────────────────────────
INSERT INTO leads (branch_id, company_name, contact_email, status, deal_size, next_steps)
VALUES
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Wayne Enterprises', 'bruce@wayne.com', 'new', 15000, 'Site visit scheduled'),
  ('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Stark Industries', 'pepper@stark.com', 'closed_won', 42000, 'Contract signed'),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'Oscorp', 'norman@oscorp.com', 'proposal_sent', 28000, 'Awaiting VP approval'),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'LexCorp', 'lex@lexcorp.com', 'new', 22000, 'Initial inquiry')
ON CONFLICT DO NOTHING;

-- ── Verification ────────────────────────────────────────────
SELECT 'branches' AS entity, COUNT(*) AS cnt FROM branches
UNION ALL
SELECT 'inventory_items', COUNT(*) FROM inventory_items
UNION ALL
SELECT 'member_perks', COUNT(*) FROM member_perks
UNION ALL
SELECT 'leads', COUNT(*) FROM leads;
