import { useMutation } from '@tanstack/react-query';
import { updateProfile } from '../api/seeker';
import { useAuth } from '../context/AuthContext';

export const useUpdateProfile = () => {
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: (profileData) => updateProfile(profileData),
    onSuccess: (data) => {
      if (data.user) {
        updateUser(data.user);
      }
    },
  });
};
