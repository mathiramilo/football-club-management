'use client';

import { usesStaffNavigation } from '@repo/domain';
import { HouseIcon, ShieldIcon, UserIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { ClubTheme } from '@/components/club-theme';
import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentClub } from '@/lib/current-club';
import { cn } from '@/lib/utils';

const links = [
  { href: '/portal', label: 'home', icon: HouseIcon },
  { href: '/profile', label: 'profile', icon: UserIcon },
] as const;

export function PortalFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const current = useCurrentClub();
  const isStaff = current.status === 'ready' && usesStaffNavigation(current.membership);
  const leavesPortal = current.status === 'none' || (current.status === 'ready' && !isStaff);

  useEffect(() => {
    if (leavesPortal) router.replace('/');
  }, [leavesPortal, router]);

  if (current.status === 'failed') {
    return (
      <PageMessage
        icon={<ShieldIcon aria-hidden />}
        title={t('home.loadFailed')}
        body={t('errors.INTERNAL_ERROR')}
      >
        <Button onClick={current.retry}>{t('home.retry')}</Button>
      </PageMessage>
    );
  }
  const club = current.status === 'ready' && isStaff ? current.membership.club : null;

  return (
    <ClubTheme
      primaryColor={club?.primaryColor}
      className="min-h-dvh md:grid md:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <aside className="relative overflow-hidden bg-club text-white md:sticky md:top-0 md:h-dvh">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(90deg,transparent_0_30px,color-mix(in_srgb,var(--color-white)_7%,transparent)_30px_60px)]"
        />
        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 md:flex-col md:items-stretch md:gap-6 md:px-3 md:py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none md:px-2">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-field bg-white/15">
              {club?.crest ? (
                <Image
                  src={club.crest.thumbnailUrl}
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                  className="size-full object-contain p-1"
                />
              ) : (
                <ShieldIcon aria-hidden className="size-5.5" />
              )}
            </div>
            {club ? (
              <p
                translate="no"
                className="min-w-0 font-heading text-action [overflow-wrap:anywhere]"
              >
                {club.name}
              </p>
            ) : (
              <Skeleton className="h-5 w-32 bg-white/15" />
            )}
          </div>
          <nav aria-label={t('portal.nav.label')}>
            <ul className="flex gap-1 md:flex-col">
              {links.map(({ href, label, icon: Icon }) => {
                const isCurrent = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-full px-3 text-body-sm font-semibold outline-white focus-visible:outline-3 focus-visible:outline-offset-0',
                        isCurrent ? 'bg-white font-extrabold text-club' : 'hover:bg-white/10',
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                      {t(`portal.nav.${label}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
      {children}
    </ClubTheme>
  );
}
