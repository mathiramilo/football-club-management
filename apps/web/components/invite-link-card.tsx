'use client';

import {
  getInviteLinksListQueryKey,
  type InviteLink,
  useInviteLinksRevoke,
  useInviteLinksUpdate,
} from '@repo/api-client';
import { inviteRoles } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { CopyIcon, Share2Icon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { copyInvite, inviteUrl, shareInvite } from '@/lib/invite-links';

const knownRole = (role: string) => inviteRoles.find((known) => known === role);

export function InviteLinkCard({
  link,
  clubId,
  clubName,
  categoryName,
  timezone,
}: {
  link: InviteLink;
  clubId: string;
  clubName: string;
  categoryName: string;
  timezone: string;
}) {
  const t = useTranslations('inviteLinks');
  const format = useFormatter();
  const queryClient = useQueryClient();
  const approvalId = useId();
  const [notice, setNotice] = useState<string | null>(null);
  const role = knownRole(link.role);
  const url = inviteUrl(link.token);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => {
      setNotice(null);
    }, 4000);
    return () => {
      clearTimeout(timeout);
    };
  }, [notice]);

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: getInviteLinksListQueryKey(clubId, link.categoryId),
    });
  const update = useInviteLinksUpdate({
    mutation: {
      retry: 0,
      onSuccess: refresh,
      onError: () => {
        setNotice(t('updateFailed'));
      },
    },
  });
  const revoke = useInviteLinksRevoke({
    mutation: {
      retry: 0,
      onSuccess: refresh,
      onError: () => {
        setNotice(t('updateFailed'));
      },
    },
  });
  const ids = { clubId, categoryId: link.categoryId, linkId: link.id };

  const share = async () => {
    const channel = await shareInvite(
      t('shareMessage', { category: categoryName, club: clubName, url }),
      url,
    );
    if (channel === 'copy') setNotice(t('copied'));
  };
  const copy = async () => {
    setNotice((await copyInvite(url)) ? t('copied') : t('copyFailed'));
  };

  const usage =
    link.maxUses === null
      ? t('uses', { count: link.usesCount })
      : t('usesOf', { count: link.usesCount, max: link.maxUses });
  const expiry = link.expiresAt
    ? t('expiry.on', {
        date: format.dateTime(new Date(link.expiresAt), {
          day: 'numeric',
          month: 'short',
          timeZone: timezone,
        }),
      })
    : t('expiry.never');
  const confirm = link.isDefault ? 'renewConfirm' : 'revokeConfirm';

  return (
    <li className="flex flex-col gap-4 rounded-tile bg-muted p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-heading text-action">
            {link.isDefault ? t('default') : role ? t(`for.${role}`) : t('link')}
          </h3>
          <p className="text-meta text-muted-foreground">
            {[link.isDefault && role ? t(`for.${role}`) : null, expiry, usage]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <Badge variant={link.requiresApproval ? 'neutral' : 'club'} size="sm">
          {link.requiresApproval ? t('approval.on') : t('approval.off')}
        </Badge>
      </div>
      <p
        translate="no"
        className="truncate rounded-field bg-background px-3 py-2 text-body-sm text-muted-foreground select-all"
      >
        {url}
      </p>
      {link.canChangeApproval ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <label htmlFor={approvalId} className="text-body-sm font-bold">
              {t('approval.label')}
            </label>
            <p className="text-meta text-muted-foreground">{t('approval.hint')}</p>
          </div>
          <Switch
            id={approvalId}
            checked={link.requiresApproval}
            disabled={update.isPending}
            onCheckedChange={(requiresApproval) => {
              update.mutate({ ...ids, data: { requiresApproval } });
            }}
          />
        </div>
      ) : (
        link.requiresApproval && (
          <p className="text-meta text-muted-foreground">{t('approval.locked')}</p>
        )
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void share()}>
          <Share2Icon aria-hidden />
          {t('share')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void copy()}>
          <CopyIcon aria-hidden />
          {t('copy')}
        </Button>
        {link.canRevoke && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="link" disabled={revoke.isPending}>
                {link.isDefault ? t('renew') : t('revoke')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(`${confirm}.title`)}</AlertDialogTitle>
                <AlertDialogDescription>{t(`${confirm}.body`)}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    revoke.mutate(ids);
                  }}
                >
                  {t(`${confirm}.action`)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <p aria-live="polite" className="text-meta font-semibold empty:hidden">
        {notice}
      </p>
    </li>
  );
}
