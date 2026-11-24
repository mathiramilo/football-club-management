'use client';

import { usesStaffNavigation } from '@repo/domain';
import { CalendarDaysIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { NoClub } from '@/components/no-club';
import { Alert, AlertAction, AlertContent } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentClub } from '@/lib/current-club';

export function HomeScreen() {
  const t = useTranslations('home');
  const router = useRouter();
  const current = useCurrentClub();
  const isStaff = current.status === 'ready' && usesStaffNavigation(current.membership);

  useEffect(() => {
    if (isStaff) router.replace('/portal');
  }, [isStaff, router]);

  if (current.status === 'loading' || isStaff) {
    return <Skeleton className="h-48" />;
  }
  if (current.status === 'failed') {
    return (
      <Alert variant="danger" role="alert">
        <AlertContent>{t('loadFailed')}</AlertContent>
        <AlertAction>
          <Button variant="secondary" size="sm" onClick={current.retry}>
            {t('retry')}
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  if (current.status === 'none') return <NoClub />;
  return (
    <Empty>
      <EmptyMedia>
        <CalendarDaysIcon />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{t('player.empty.title')}</EmptyTitle>
        <EmptyDescription>{t('player.empty.body')}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
