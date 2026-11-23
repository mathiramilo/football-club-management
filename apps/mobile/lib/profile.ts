import { useProfileGet } from '@repo/api-client';

export type ProfileGate = 'complete' | 'required' | 'checking';

const profileQuery = { meta: { persist: true } };

export function useProfile() {
  return useProfileGet({ query: profileQuery });
}

export function useProfileGate(isEnabled: boolean): ProfileGate {
  const { data, isPending, fetchStatus } = useProfileGet({
    query: { ...profileQuery, enabled: isEnabled },
  });
  if (data) return data.profileComplete ? 'complete' : 'required';
  if (isEnabled && isPending && fetchStatus === 'fetching') return 'checking';
  return 'complete';
}
