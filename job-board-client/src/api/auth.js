import api from './client';

export const register = async ({ name, email, password, role }) => {
  const res = await api.post('/auth/register', { name, email, password, role });
  return res.data;
};

export const login = async ({ email, password }) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const verifyEmail = async (token) => {
  const res = await api.post('/auth/verify-email', { token });
  return res.data;
};

export const googleAuth = async ({ credential, role }) => {
  const res = await api.post('/auth/google', { credential, role });
  return res.data;
};

