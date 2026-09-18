import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployerDashboard,
  getEmployerJobs,
  getJobApplications,
  updateApplicationStatus,
  createJob,
  updateJob,
  deleteJob,
  closeJob,
} from '../api/employer';

export const useEmployerDashboard = () => {
  return useQuery({
    queryKey: ['employerDashboard'],
    queryFn: getEmployerDashboard,
  });
};

export const useEmployerJobs = () => {
  return useQuery({
    queryKey: ['employerJobs'],
    queryFn: getEmployerJobs,
  });
};

export const useJobApplications = (jobId) => {
  return useQuery({
    queryKey: ['jobApplications', jobId],
    queryFn: () => getJobApplications(jobId),
    enabled: !!jobId,
  });
};

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, status }) => updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobApplications'] });
    },
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobData) => createJob(jobData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['employerDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['employerDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['employerDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useCloseJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => closeJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['employerDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
};
