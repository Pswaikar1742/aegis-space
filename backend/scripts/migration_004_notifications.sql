-- Migration 004: notifications table
-- For demo environments this migration creates a simple notifications table
-- used for branch manager and internal alerts.

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL,
    user_id uuid NULL,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    read boolean DEFAULT FALSE,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_branch ON notifications (branch_id);
