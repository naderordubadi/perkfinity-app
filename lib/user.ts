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
