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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON response from server');
  }
  
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || 'API Error');
  }

  return data;
}
