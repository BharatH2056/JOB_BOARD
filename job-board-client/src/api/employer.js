import api from './client';

export const getEmployerDashboard = async () => {
  const res = await api.get('/employer/dashboard');
  return res.data;
};

export const getEmployerJobs = async () => {
  const res = await api.get('/employer/jobs');
  return res.data;
};

export const getJobApplications = async (jobId) => {
  const res = await api.get(`/employer/jobs/${jobId}/applications`);
  return res.data;
};

export const updateApplicationStatus = async (applicationId, status) => {
  const res = await api.patch(`/employer/applications/${applicationId}/status`, { status });
  return res.data;
};

export const createJob = async (jobData) => {
  const res = await api.post('/jobs', jobData);
  return res.data;
};

export const updateJob = async (jobId, jobData) => {
  const res = await api.put(`/jobs/${jobId}`, jobData);
  return res.data;
};

export const deleteJob = async (jobId) => {
  const res = await api.delete(`/jobs/${jobId}`);
  return res.data;
};

export const closeJob = async (jobId) => {
  const res = await api.patch(`/jobs/${jobId}/close`);
  return res.data;
};
