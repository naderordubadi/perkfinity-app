import { neon } from '@neondatabase/serverless';

// Lazy initialization — only connect when actually called at runtime,
// NOT at build time (which is what was crashing Vercel).
let _sql: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Keep `sql` as a backward-compatible export for any direct tagged-template usage
export const sql = (...args: Parameters<ReturnType<typeof neon>>) => getDb()(...args);

// Helper to save user PII
export async function saveUserPII(userData: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  zip: string;
}) {
  try {
    return await sql`
      INSERT INTO customers (full_name, email, phone, city, zip)
      VALUES (${userData.fullName}, ${userData.email}, ${userData.phone}, ${userData.city}, ${userData.zip})
      ON CONFLICT (email) DO UPDATE 
      SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, city = EXCLUDED.city, zip = EXCLUDED.zip
      RETURNING *;
    `;
  } catch (error) {
    console.error('Error saving user PII:', error);
    throw error;
  }
}

// Helper to get nearby campaigns (Anonymized)
export async function getNearbyCampaigns(zipCode: string) {
  try {
    return await sql`
      SELECT c.*, m.name as merchant_name 
      FROM campaigns c
      JOIN merchants m ON c.merchant_id = m.id
      WHERE m.city IN (SELECT city FROM merchants WHERE zip = ${zipCode})
      AND c.is_active = true;
    `;
  } catch (error) {
    console.error('Error fetching nearby campaigns:', error);
    throw error;
  }
}
