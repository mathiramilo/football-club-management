'use client';

import { CalendarDaysIcon, HouseIcon, UserIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'home', icon: HouseIcon },
  { href: '/agenda', label: 'agenda', icon: CalendarDaysIcon },
  { href: '/team', label: 'team', icon: UsersIcon },
  { href: '/profile', label: 'profile', icon: UserIcon },
] as const;

const isCurrent = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function TabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav
      data-slot="tab-bar"
      aria-label={t('label')}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ href, label, icon: Icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className="group/tab flex flex-col items-center gap-1 pt-2 pb-3 outline-none focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-full',
                    current ? 'bg-club-tint' : 'group-hover/tab:bg-muted',
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn('size-6', current ? 'text-club' : 'text-muted-foreground')}
                  />
                </span>
                <span
                  className={cn(
                    'text-caption',
                    current
                      ? 'font-extrabold text-foreground'
                      : 'font-semibold text-muted-foreground',
                  )}
                >
                  {t(`tabs.${label}`)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
