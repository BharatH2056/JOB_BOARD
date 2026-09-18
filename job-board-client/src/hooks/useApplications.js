import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApplications } from '../api/seeker';
import { applyToJob } from '../api/jobs';

export const useSeekerApplications = () => {
  return useQuery({
    queryKey: ['seekerApplications'],
    queryFn: getApplications,
  });
};

export const useApplyToJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, data }) => applyToJob(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seekerApplications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
};
