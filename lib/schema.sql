-- Perkfinity Database Schema
-- Last Updated: 2026-03-13

-- 1. Merchants Table
DROP TABLE IF EXISTS redemptions, campaigns, merchants CASCADE;

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    zip TEXT,
    website TEXT,
    category TEXT,
    perk TEXT,
    tier TEXT,
    plaid_access_token TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    discount_value TEXT NOT NULL, -- e.g., '20% OFF', '$10 Credit'
    is_active BOOLEAN DEFAULT true,
    qr_code_key TEXT UNIQUE NOT NULL, -- The unique part of the Perkfinity QR link
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 3. Redemptions Table (Atomic Transactions)
CREATE TABLE IF NOT EXISTS redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    customer_email TEXT, -- Optional, for tracking
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'success' -- 'success', 'pending', 'expired'
);
