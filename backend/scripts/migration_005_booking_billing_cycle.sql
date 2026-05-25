-- Migration 005: add billing_cycle to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly';
