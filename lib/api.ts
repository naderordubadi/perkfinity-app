import { getUserToken, setUserToken } from './user';

const API_BASE = 'http://localhost:3001/api/v1';

export async function ensureAnonymousUser() {
  let token = getUserToken();
  if (!token) {
    const res = await fetch(\`\${API_BASE}/auth/user/anonymous\`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') {
      token = data.data.access_token;
      setUserToken(token!);
    }
  }
  return token;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let token = getUserToken();
  
  if (!token && endpoint !== '/auth/user/anonymous') {
    token = await ensureAnonymousUser();
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }

  const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API Error');
  }

  return data;
}
