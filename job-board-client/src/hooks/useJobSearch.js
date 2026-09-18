import { useMutation } from '@tanstack/react-query';
import { searchJobs } from '../api/jobs';

export const useJobSearch = () => {
  return useMutation({
    mutationFn: (query) => searchJobs(query),
  });
};
