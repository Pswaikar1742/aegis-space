-- AegiSpace Migration 002: Multi-Role Engine
-- Execute this in the Supabase SQL Editor

-- 1. Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('cfo', 'manager', 'tenant_admin', 'member')),
    branch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create member_perks table
CREATE TABLE IF NOT EXISTS public.member_perks (
    member_id UUID PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
    monthly_credits INT DEFAULT 0,
    printing_quota INT DEFAULT 0,
    active_status BOOLEAN DEFAULT TRUE
);

-- 3. Create maintenance_tickets table
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    inventory_item_id UUID,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set Row Level Security (RLS) policies if necessary
-- For MVP, we might keep it accessible by the service key
