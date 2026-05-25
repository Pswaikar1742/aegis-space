-- Migration 007: add BKC and Hyderabad branches and demo inventory rows

BEGIN;

-- Add branches
INSERT INTO branches (id, name, city)
VALUES
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'BKC Tower', 'Mumbai')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

INSERT INTO branches (id, name, city)
VALUES
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'Hyderabad Hub', 'Hyderabad')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

-- Ensure the unique index exists on inventory (branch_id, name)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_name_branch ON inventory_items (branch_id, name);

-- Insert demo inventory rows for BKC
INSERT INTO inventory_items (branch_id, external_id, name, type, capacity, monthly_rate, status, demo)
VALUES
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_hot_1', 'BKC-HD-01', 'hot_desk', 1, 240, 'available', true),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_suite_1', 'BKC-Suite-1', 'private_suite', 6, 4800, 'available', true),
  ('8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'bkc_conf_a', 'BKC-Conf-A', 'meeting_room', 10, 2000, 'available', true)
ON CONFLICT (branch_id, name) DO NOTHING;

-- Insert demo inventory rows for Hyderabad
INSERT INTO inventory_items (branch_id, external_id, name, type, capacity, monthly_rate, status, demo)
VALUES
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_hot_1', 'HYD-HD-01', 'hot_desk', 1, 200, 'available', true),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_ded_1', 'HYD-DS-01', 'dedicated_desk', 1, 380, 'available', true),
  ('9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'hyd_conf_a', 'HYD-Conf-A', 'meeting_room', 8, 1600, 'available', true)
ON CONFLICT (branch_id, name) DO NOTHING;

COMMIT;
