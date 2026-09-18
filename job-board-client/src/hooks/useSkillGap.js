import { useQuery } from '@tanstack/react-query';
import { getSkillGap } from '../api/jobs';

export const useSkillGap = (jobId, enabled = true) => {
  return useQuery({
    queryKey: ['skillGap', jobId],
    queryFn: () => getSkillGap(jobId),
    enabled: !!jobId && !!enabled,
    retry: false,
  });
};
