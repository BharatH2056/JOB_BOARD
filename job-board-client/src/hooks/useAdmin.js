import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllJobs, adminDeleteJob, getAllUsers, setUserBanStatus } from '../api/admin';

export const useAdminJobs = () => {
  return useQuery({
    queryKey: ['adminJobs'],
    queryFn: getAllJobs,
  });
};

export const useAdminDeleteJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminDeleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: getAllUsers,
  });
};

export const useSetBanStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isBanned }) => setUserBanStatus(id, isBanned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
};
