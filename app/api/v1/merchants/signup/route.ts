import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      contactName,
      email,
      phone,
      address,
      city,
      zip,
      website,
      perk,
      tier,
      password // Currently ignored, will be replaced with real auth later using Clerk/Supabase/etc
    } = body;

    if (!name || !email || !perk || !tier) {
      return NextResponse.json({ error: 'Missing required configuration fields' }, { status: 400 });
    }

    // Insert Merchant into Neon DB
    const [merchant] = await sql`
      INSERT INTO merchants (
        name, contact_name, contact_email, phone, address, city, zip, website, perk, tier, subscription_status
      ) VALUES (
        ${name}, ${contactName}, ${email}, ${phone}, ${address}, ${city}, ${zip}, ${website}, ${perk}, ${tier}, 'pending'
      )
      RETURNING id, name, tier
    `;

    // Flow 1: Trial Mode -> No payment needed immediately
    if (tier === 'trial') {
      // Activate immediately
      await sql`UPDATE merchants SET subscription_status = 'active' WHERE id = ${merchant.id}`;
      return NextResponse.json({
        success: true,
        merchantId: merchant.id,
        status: 'active',
        message: 'Trial account activated successfully.'
      });
    }

    // Flow 2: Tier 1 -> Needs Plaid Integration
    if (tier === 'tier1') {
      let linkToken = 'mock_link_token_for_sandbox';
      
      // TODO: When user provides PLAID keys, install 'plaid' npm package and generate a real link_token here:
      /*
      import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
      const config = new Configuration({
        basePath: PlaidEnvironments.sandbox,
        baseOptions: { headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET } }
      });
      const client = new PlaidApi(config);
      const request = {
        user: { client_user_id: merchant.id },
        client_name: 'Perkfinity',
        products: ['auth'],
        country_codes: ['US'],
        language: 'en',
      };
      const response = await client.linkTokenCreate(request);
      linkToken = response.data.link_token;
      */

      return NextResponse.json({
        success: true,
        merchantId: merchant.id,
        status: 'pending_payment',
        plaid_link_token: linkToken,
        message: 'Proceed to Plaid Link to connect bank account via ACH.'
      });
    }

    return NextResponse.json({ error: 'Invalid tier selected' }, { status: 400 });

  } catch (error: any) {
    console.error('Signup API Error:', error);
    // Handle unique constraint failure for email gracefully
    if (error.message.includes('unique constraint')) {
      return NextResponse.json({ error: 'A merchant with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
