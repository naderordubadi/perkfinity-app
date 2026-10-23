export function getMerchantInitials(name?: string | null): string {
  const clean = (name || 'Brand').trim();
  return clean.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'PF';
}
