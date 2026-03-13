export default function History() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>History</h2>
      <p style={{ color: '#666' }}>Your past redemptions will appear here.</p>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <strong>Example Coffee Shop</strong>
          <span style={{ color: 'green' }}>Redeemed</span>
        </div>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          10% OFF - Yesterday
        </div>
      </div>
    </div>
  );
}
