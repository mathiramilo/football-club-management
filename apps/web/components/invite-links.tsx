'use client';

import { type ClubSummary, type MyCategoryRole, useInviteLinksList } from '@repo/api-client';
import { type CategoryRoles, creatableInviteRoles } from '@repo/domain';
import { LinkIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CreateInviteLinkForm } from '@/components/create-invite-link-form';
import { InviteLinkCard } from '@/components/invite-link-card';
import { Alert, AlertAction, AlertContent } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function InviteLinks({
  club,
  category,
  roles,
}: {
  club: ClubSummary;
  category: MyCategoryRole;
  roles: CategoryRoles;
}) {
  const t = useTranslations('inviteLinks');
  const links = useInviteLinksList(club.id, category.categoryId);
  const [creating, setCreating] = useState(false);
  const creatable = creatableInviteRoles(roles);

  return (
    <section aria-labelledby="invite-links" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="invite-links" className="font-heading text-section">
            {t('title')}
          </h2>
          <p className="text-body-sm text-pretty text-muted-foreground">{t('intro')}</p>
        </div>
        {!creating && creatable.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setCreating(true);
            }}
          >
            <PlusIcon aria-hidden />
            {t('create.open')}
          </Button>
        )}
      </div>
      {creating && (
        <CreateInviteLinkForm
          key={category.categoryId}
          clubId={club.id}
          categoryId={category.categoryId}
          categoryRoles={roles}
          roles={creatable}
          onCreated={() => {
            setCreating(false);
          }}
        />
      )}
      {links.data ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {links.data.items.map((link) => (
            <InviteLinkCard
              key={link.id}
              link={link}
              clubId={club.id}
              clubName={club.name}
              categoryName={category.name}
              timezone={club.timezone}
            />
          ))}
          {links.data.items.length === 0 && (
            <li className="flex items-center gap-3 rounded-tile bg-muted p-4 text-body-sm text-muted-foreground">
              <LinkIcon aria-hidden className="size-5" />
              {t('empty')}
            </li>
          )}
        </ul>
      ) : links.isError ? (
        <Alert variant="danger">
          <AlertContent>{t('loadFailed')}</AlertContent>
          <AlertAction>
            <Button size="sm" variant="secondary" onClick={() => void links.refetch()}>
              {t('retry')}
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-tile" />
          <Skeleton className="h-56 rounded-tile" />
        </div>
      )}
    </section>
  );
}
