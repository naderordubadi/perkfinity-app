import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { merchantId, publicToken } = body;

    if (!merchantId || !publicToken) {
      return NextResponse.json({ error: 'Missing merchant ID or Plaid public token' }, { status: 400 });
    }

    // Since we don't have the real PLAID_CLIENT_ID and PLAID_SECRET yet, we will mock the exchange process.
    // In a real scenario, we do this:
    /*
      const response = await client.itemPublicTokenExchange({ public_token: publicToken });
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;
    */

    const mockAccessToken = `access-sandbox-${Math.random().toString(36).substr(2, 9)}`;

    // Save the token and activate the subscription
    const [merchant] = await sql`
      UPDATE merchants 
      SET plaid_access_token = ${mockAccessToken}, subscription_status = 'active'
      WHERE id = ${merchantId}
      RETURNING id, name, tier, subscription_status
    `;

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      merchantId: merchant.id,
      status: merchant.subscription_status,
      message: 'Bank account connected successfully! Your Tier 1 subscription is now active.'
    });

  } catch (error: any) {
    console.error('Plaid Exchange API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
