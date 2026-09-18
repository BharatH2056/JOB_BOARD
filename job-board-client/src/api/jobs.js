import api from './client';

export const getJobs = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );
  const res = await api.get('/jobs', { params: cleanParams });
  return res.data;
};

export const getJobById = async (id) => {
  const res = await api.get(`/jobs/${id}`);
  return res.data;
};

export const searchJobs = async (query) => {
  const res = await api.post('/jobs/search', { query });
  return res.data;
};

export const getSkillGap = async (jobId) => {
  const res = await api.get(`/jobs/${jobId}/skill-gap`);
  return res.data;
};

export const applyToJob = async (jobId, data) => {
  let headers = {};
  if (data instanceof FormData) {
    headers['Content-Type'] = 'multipart/form-data';
  }
  const res = await api.post(`/jobs/${jobId}/apply`, data, { headers });
  return res.data;
};

export const saveJob = async (jobId) => {
  const res = await api.post(`/jobs/${jobId}/save`);
  return res.data;
};

export const unsaveJob = async (jobId) => {
  const res = await api.delete(`/jobs/${jobId}/save`);
  return res.data;
};
