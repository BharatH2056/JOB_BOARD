import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSavedJobs } from '../api/seeker';
import { saveJob, unsaveJob } from '../api/jobs';

export const useSavedJobs = (enabled = true) => {
  return useQuery({
    queryKey: ['savedJobs'],
    queryFn: getSavedJobs,
    enabled,
  });
};

export const useSaveJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId) => saveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
    },
  });
};

export const useUnsaveJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId) => unsaveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
    },
  });
};
