import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // We execute the table drops and creates sequentially to avoid parsing errors
    // with multiple statements in a single string in some Postgres drivers
    
    // 1. Drop existing
    await sql`DROP TABLE IF EXISTS redemptions, campaigns, merchants CASCADE`;

    // 2. Create merchants
    await sql`
      CREATE TABLE merchants (
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
      )
    `;

    // 3. Create campaigns
    await sql`
      CREATE TABLE campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          discount_value TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          qr_code_key TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE
      )
    `;

    // 4. Create redemptions
    await sql`
      CREATE TABLE redemptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID REFERENCES campaigns(id),
          customer_email TEXT,
          redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'success'
      )
    `;

    return NextResponse.json({ success: true, message: 'Database schema fully initialized.' });
  } catch (error: any) {
    console.error('Database Init Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
