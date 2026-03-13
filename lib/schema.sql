-- Perkfinity Database Schema
-- Last Updated: 2026-03-13

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Tailor Shop', 'Wellness Spa'
    contact_email TEXT UNIQUE NOT NULL,
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
