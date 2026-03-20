import { getUserToken } from './user';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://perkfinity-backend.vercel.app/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getUserToken();

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    // True network failure (no internet, DNS failure, etc.)
    throw new Error(`Network error: ${networkErr.message || 'Could not reach the server'}`);
  }

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Server returned non-JSON (e.g., Vercel HTML error page)
    throw new Error(`Server error (HTTP ${response.status}). Please try again.`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed (HTTP ${response.status})`);
  }

  return data;
}
