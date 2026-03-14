// Manages anonymous user JWT
let token: string | null = null;

export const setUserToken = (newToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pf_user_token', newToken);
  }
  token = newToken;
};

export const getUserToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pf_user_token');
  }
  return token;
};

export const setUserData = (userData: any) => {
  if (typeof window !== 'undefined' && userData) {
    localStorage.setItem('pf_user_data', JSON.stringify(userData));
  }
};

export const getUserData = () => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('pf_user_data');
    return data ? JSON.parse(data) : null;
  }
  return null;
};
