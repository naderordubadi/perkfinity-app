'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Activate() {
  const [data, setData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const cached = localStorage.getItem('active_token_cache');
    if (cached) {
      setData(JSON.parse(cached));
    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!data) return;

    const expiresAt = new Date(data.expires_at).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = expiresAt - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft('EXPIRED');
        // Optionally redirect to history or show expired message
      } else {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(\`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  if (!data) return null;

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>{data.merchant.business_name}</h2>
      <p style={{ color: '#666', margin: '0 0 2rem 0' }}>{data.campaign.title}</p>

      <div style={{ 
        backgroundColor: timeLeft === 'EXPIRED' ? '#ffe6e6' : '#e6ffe6', 
        padding: '2rem', 
        borderRadius: '12px', 
        marginBottom: '2rem',
        border: \`2px solid \${timeLeft === 'EXPIRED' ? '#ffcccc' : '#ccffcc'}\` 
      }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem', color: timeLeft === 'EXPIRED' ? '#cc0000' : '#006600' }}>
          {data.campaign.discount_percentage}% OFF
        </div>
        
        <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px', wordBreak: 'break-all', lineHeight: 1.2 }}>
          {data.token.substring(0, 5)}...{data.token.substring(data.token.length - 5)}
        </div>
      </div>

      <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: timeLeft === 'EXPIRED' ? 'red' : 'black' }}>
        {timeLeft}
      </div>

      <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
        Show this screen at checkout
      </p>
      
      <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '2rem' }}>
        Full Token Data:<br/>
        <code style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{data.token}</code>
      </p>
    </div>
  );
}
