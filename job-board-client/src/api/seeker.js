import api from './client';

export const getSavedJobs = async () => {
  const res = await api.get('/seeker/saved-jobs');
  return res.data;
};

export const getApplications = async () => {
  const res = await api.get('/seeker/applications');
  return res.data;
};

export const updateProfile = async (formData) => {
  const data = new FormData();
  data.append('name', formData.name);
  data.append('bio', formData.bio);
  data.append('skills', JSON.stringify(formData.skills));
  if (formData.resumeFile) {
    data.append('resume', formData.resumeFile);
  }
  const res = await api.put('/seeker/profile', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
