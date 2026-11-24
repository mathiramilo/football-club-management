'use client';

import { ClubTheme } from '@/components/club-theme';
import { useCurrentClub } from '@/lib/current-club';

export function CurrentClubTheme({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const current = useCurrentClub();

  return (
    <ClubTheme
      className={className}
      primaryColor={current.status === 'ready' ? current.membership.club.primaryColor : null}
    >
      {children}
    </ClubTheme>
  );
}
