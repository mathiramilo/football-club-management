'use client';

import type { MyClub } from '@repo/api-client';
import { creatableInviteRoles } from '@repo/domain';
import { UsersIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { InviteLinks } from '@/components/invite-links';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentClub } from '@/lib/current-club';

const rolesIn = (membership: MyClub, staffRole: string | null) => ({
  isAdmin: membership.isAdmin,
  staffRole,
});

export function SquadPage() {
  const t = useTranslations();
  const current = useCurrentClub();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  if (current.status !== 'ready') {
    return (
      <main className="flex w-full max-w-5xl flex-col gap-8 px-5 py-6 md:px-10 md:py-10">
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-56 w-full rounded-tile" />
      </main>
    );
  }
  const { membership } = current;
  const categories = membership.categories.filter(
    (category) => creatableInviteRoles(rolesIn(membership, category.staffRole)).length > 0,
  );
  const selected =
    categories.find((category) => category.categoryId === searchParams.get('category')) ??
    categories[0];

  return (
    <main className="flex w-full max-w-5xl flex-col gap-8 px-5 py-6 md:px-10 md:py-10">
      <header className="flex flex-col gap-1">
        <p translate="no" className="text-meta font-bold text-muted-foreground">
          {membership.club.name}
        </p>
        <h1 className="font-display text-title">{t('portal.nav.squad')}</h1>
      </header>
      {selected ? (
        <>
          {categories.length > 1 && (
            <Field className="max-w-xs">
              <FieldLabel htmlFor="squad-category">{t('inviteLinks.category')}</FieldLabel>
              <NativeSelect
                id="squad-category"
                translate="no"
                value={selected.categoryId}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('category', event.target.value);
                  startTransition(() => {
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                  });
                }}
              >
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <InviteLinks
            key={selected.categoryId}
            club={membership.club}
            category={selected}
            roles={rolesIn(membership, selected.staffRole)}
          />
        </>
      ) : (
        <Empty>
          <EmptyMedia>
            <UsersIcon />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('inviteLinks.noCategories.title')}</EmptyTitle>
            <EmptyDescription>{t('inviteLinks.noCategories.body')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}
