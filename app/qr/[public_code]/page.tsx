'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

export default function QRResolve({ params }: { params: { public_code: string } }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchApi(`/qr/resolve/${params.public_code}`)
      .then(res => setData(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.public_code]);

  const handleActivate = async () => {
    try {
      setLoading(true);
      const idempotencyKey = uuidv4();
      const res = await fetchApi(`/campaigns/${(data as any).campaign.id}/activate`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
      
      // Store the active token logic could be complex (e.g., local storage array)
      // For simplicity, we just pass the token to the activate success screen via query or context
      // Here we will use localStorage to pass state to the next page
      localStorage.setItem('active_token_cache', JSON.stringify(res.data));
      router.push('/activate');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  if (loading && !data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ color: 'red' }}>Offer Unavailable</h2>
      <p>{error}</p>
    </div>
  );

  if (!data) return null;

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>{data.merchant.business_name}</h2>
      <p style={{ color: '#666', margin: '0 0 2rem 0' }}>{data.location?.address}, {data.location?.city}</p>

      <div style={{ backgroundColor: '#000', color: '#fff', padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <div style={{ fontSize: '4rem', fontWeight: 'bold', lineHeight: 1 }}>{data.campaign.discount_percentage}%</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>OFF</div>
      </div>

      <h3 style={{ margin: '0 0 0.5rem 0' }}>{data.campaign.title}</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 2rem 0' }}>{data.campaign.terms}</p>

      <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
        ⏳ Valid for <strong>{data.campaign.redemption_time_limit_minutes} minutes</strong> after activation.
      </p>

      <button 
        onClick={handleActivate}
        disabled={loading}
        style={{ width: '100%', padding: '1rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? 'Activating...' : 'Activate Discount'}
      </button>
    </div>
  );
}
