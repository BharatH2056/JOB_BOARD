import { useQuery } from '@tanstack/react-query';
import { getJobs, getJobById } from '../api/jobs';

export const useJobs = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => getJobs(filters),
    ...options,
  });
};

export const useJob = (id) => {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobById(id),
    enabled: !!id,
  });
};
