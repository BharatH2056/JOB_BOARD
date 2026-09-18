import api from './client';

export const getAllJobs = async () => {
  const res = await api.get('/admin/jobs');
  return res.data;
};

export const adminDeleteJob = async (id) => {
  const res = await api.delete(`/admin/jobs/${id}`);
  return res.data;
};

export const getAllUsers = async () => {
  const res = await api.get('/admin/users');
  return res.data;
};

export const setUserBanStatus = async (id, isBanned) => {
  const res = await api.patch(`/admin/users/${id}/ban`, { isBanned });
  return res.data;
};
