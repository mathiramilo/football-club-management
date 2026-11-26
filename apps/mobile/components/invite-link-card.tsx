import {
  getInviteLinksListQueryKey,
  type InviteLink,
  useInviteLinksRevoke,
  useInviteLinksUpdate,
} from '@repo/api-client';
import { inviteRoles } from '@repo/contracts';
import { colors } from '@repo/ui-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { CopyIcon, Share2Icon } from 'lucide-react-native';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Alert, Switch, View } from 'react-native';

import { useClubTheme } from '@/components/club-theme';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { MessageKey } from '@/lib/i18n';
import { copyInvite, inviteUrl, shareInvite } from '@/lib/invite-links';
import { useIsOnline } from '@/lib/query-client';

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
  const intl = useIntl();
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const theme = useClubTheme();
  const [notice, setNotice] = useState<string | null>(null);
  const t = (id: MessageKey, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const role = knownRole(link.role);
  const url = inviteUrl(link.token);

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: getInviteLinksListQueryKey(clubId, link.categoryId),
    });
  const mutationOptions = {
    networkMode: 'always' as const,
    retry: 0,
    onSuccess: refresh,
    onError: () => {
      setNotice(t('inviteLinks.updateFailed'));
    },
  };
  const update = useInviteLinksUpdate({ mutation: mutationOptions });
  const revoke = useInviteLinksRevoke({ mutation: mutationOptions });
  const ids = { clubId, categoryId: link.categoryId, linkId: link.id };

  const confirmRevoke = () => {
    const confirm = link.isDefault ? 'renewConfirm' : 'revokeConfirm';
    Alert.alert(t(`inviteLinks.${confirm}.title`), t(`inviteLinks.${confirm}.body`), [
      { text: t('inviteLinks.cancel'), style: 'cancel' },
      {
        text: t(`inviteLinks.${confirm}.action`),
        style: 'destructive',
        onPress: () => {
          revoke.mutate(ids);
        },
      },
    ]);
  };

  const usage =
    link.maxUses === null
      ? t('inviteLinks.uses', { count: link.usesCount })
      : t('inviteLinks.usesOf', { count: link.usesCount, max: link.maxUses });
  const expiry = link.expiresAt
    ? t('inviteLinks.expiry.on', {
        date: intl.formatDate(link.expiresAt, {
          day: 'numeric',
          month: 'short',
          timeZone: timezone,
        }),
      })
    : t('inviteLinks.expiry.never');
  const title = link.isDefault
    ? t('inviteLinks.default')
    : role
      ? t(`inviteLinks.for.${role}`)
      : t('inviteLinks.link');
  const meta = [link.isDefault && role ? t(`inviteLinks.for.${role}`) : null, expiry, usage]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="gap-4 rounded-tile bg-muted p-4">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-0.5">
          <Text role="heading" className="font-heading text-action">
            {title}
          </Text>
          <Text className="text-meta text-muted-foreground">{meta}</Text>
        </View>
        <Badge variant={link.requiresApproval ? 'neutral' : 'club'} size="sm">
          <Text>
            {link.requiresApproval ? t('inviteLinks.approval.on') : t('inviteLinks.approval.off')}
          </Text>
        </Badge>
      </View>
      {link.canChangeApproval ? (
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-0.5">
            <Text className="text-body-sm font-bold">{t('inviteLinks.approval.label')}</Text>
            <Text className="text-meta text-muted-foreground">
              {t('inviteLinks.approval.hint')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('inviteLinks.approval.label')}
            value={link.requiresApproval}
            disabled={!isOnline || update.isPending}
            trackColor={{ true: theme.club, false: colors.subtleForeground }}
            onValueChange={(requiresApproval) => {
              update.mutate({ ...ids, data: { requiresApproval } });
            }}
          />
        </View>
      ) : (
        link.requiresApproval && (
          <Text className="text-meta text-muted-foreground">
            {t('inviteLinks.approval.locked')}
          </Text>
        )
      )}
      {url && (
        <View className="flex-row flex-wrap gap-2">
          <Button
            size="sm"
            onPress={() => {
              void shareInvite(
                t('inviteLinks.shareMessage', { category: categoryName, club: clubName, url }),
              );
            }}
          >
            <Icon as={Share2Icon} className="size-4.5" />
            <Text>{t('inviteLinks.share')}</Text>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              void copyInvite(url).then(() => {
                setNotice(t('inviteLinks.copied'));
              });
            }}
          >
            <Icon as={CopyIcon} className="size-4.5" />
            <Text>{t('inviteLinks.copy')}</Text>
          </Button>
          {link.canRevoke && (
            <Button
              size="sm"
              variant="link"
              disabled={!isOnline || revoke.isPending}
              onPress={confirmRevoke}
            >
              <Text>{link.isDefault ? t('inviteLinks.renew') : t('inviteLinks.revoke')}</Text>
            </Button>
          )}
        </View>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" className="text-meta font-semibold">
          {notice}
        </Text>
      )}
    </View>
  );
}
