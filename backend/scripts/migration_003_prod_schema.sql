-- AegiSpace Production Schema Fixes for Supabase
-- Apply this in the Supabase SQL Editor

-- 1. DROP THE INCOMPLETE SKELETON TABLE
DROP TABLE IF EXISTS bookings CASCADE;

-- 2. CREATE THE PRODUCTION-ALIGNED BOOKINGS TABLE
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rate_locked DECIMAL(10, 2) NOT NULL,
    total_value DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CREATE THE MISSING VISITORS LOG TABLE
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    host_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out')),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checked_out_at TIMESTAMP WITH TIME ZONE
);

-- 4. CREATE THE MISSING FACILITY TASKS TABLE
CREATE TABLE IF NOT EXISTS facility_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DISABLE ROW-LEVEL SECURITY FOR HACKATHON ACCESS
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE facility_tasks DISABLE ROW LEVEL SECURITY;

-- 6. SEED INITIAL TESTING RECORDS FOR THE 7-PERSONA LIVE DEMO
INSERT INTO visitors (branch_id, name, email, host_email, status) VALUES 
('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Bruce Wayne', 'bruce@wayne.com', 'pepper@stark.com', 'checked_in')
ON CONFLICT DO NOTHING;

INSERT INTO facility_tasks (branch_id, title, description, status) VALUES 
('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Sanitize Conf-Alpha', 'Wipe down tables and clean projector lens before next booking.', 'pending'),
('4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Check Wi-Fi AP 3', 'Verify why signal strength dropped in Dedicated Zone.', 'pending')
ON CONFLICT DO NOTHING;