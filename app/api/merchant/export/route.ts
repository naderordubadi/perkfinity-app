export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get('merchantId');

  if (!merchantId) {
    return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 });
  }

  try {
    // This query provides counts of customers by ZIP code for a specific merchant
    // This is privacy-preserving as it doesn't reveal individual names or emails.
    const anonymizedData = await sql`
      SELECT zip, COUNT(*) as customer_count
      FROM customers
      WHERE id IN (
        SELECT customer_id FROM redemptions 
        WHERE campaign_id IN (SELECT id FROM campaigns WHERE merchant_id = ${merchantId})
      )
      GROUP BY zip
      ORDER BY customer_count DESC;
    `;

    return NextResponse.json({
      merchantId,
      reportType: 'Zip Code Demographic',
      data: anonymizedData
    });
  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Failed to export anonymized data' }, { status: 500 });
  }
}
