'use client';

import { useProfileGet } from '@repo/api-client';

import { ProfileCompletion } from '@/components/profile-completion';

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { data } = useProfileGet();

  if (data && !data.profileComplete) return <ProfileCompletion profile={data} />;
  return children;
}
