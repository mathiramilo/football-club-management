'use client';

import { categoryFormats, staffRole } from '@repo/contracts';
import { CalendarDaysIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentClub } from '@/lib/current-club';

const knownFormat = (format: string) => categoryFormats.find((known) => known === format);
const knownRole = (role: string | null) => staffRole.options.find((known) => known === role);

export function StaffHome() {
  const t = useTranslations();
  const current = useCurrentClub();
  if (current.status !== 'ready') {
    return (
      <main className="flex w-full max-w-5xl flex-col gap-8 px-5 py-6 md:px-10 md:py-10">
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-24 sm:w-80" />
      </main>
    );
  }
  const { club, categories } = current.membership;

  return (
    <main className="flex w-full max-w-5xl flex-col gap-8 px-5 py-6 md:px-10 md:py-10">
      <header className="flex flex-col gap-1">
        <p translate="no" className="text-meta font-bold text-muted-foreground">
          {club.name}
        </p>
        <h1 className="font-display text-title">{t('portal.nav.home')}</h1>
      </header>
      {categories.length > 0 && (
        <section aria-labelledby="my-categories" className="flex flex-col gap-3">
          <h2 id="my-categories" className="font-heading text-section">
            {t('portal.home.categories')}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const format = knownFormat(category.format);
              const role = knownRole(category.staffRole);
              return (
                <li
                  key={category.categoryId}
                  className="flex items-start justify-between gap-3 rounded-tile bg-muted p-4"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p translate="no" className="font-heading text-action [overflow-wrap:anywhere]">
                      {category.name}
                    </p>
                    {format && (
                      <p className="text-meta text-muted-foreground">
                        {t(`categoryFormats.${format}`)}
                      </p>
                    )}
                  </div>
                  {role && <Badge variant="club">{t(`staffRoles.${role}`)}</Badge>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Empty>
        <EmptyMedia>
          <CalendarDaysIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('portal.home.events.title')}</EmptyTitle>
          <EmptyDescription>{t('portal.home.events.body')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
