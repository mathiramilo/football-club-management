import { type ClubSummary, type MyCategoryRole, useInviteLinksList } from '@repo/api-client';
import { type CategoryRoles, creatableInviteRoles } from '@repo/domain';
import { useRouter } from 'expo-router';
import { PlusIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { View } from 'react-native';

import { InviteLinkCard } from '@/components/invite-link-card';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useIsOnline } from '@/lib/query-client';

export function InviteLinks({
  club,
  category,
  roles,
}: {
  club: ClubSummary;
  category: MyCategoryRole;
  roles: CategoryRoles;
}) {
  const intl = useIntl();
  const router = useRouter();
  const isOnline = useIsOnline();
  const links = useInviteLinksList(club.id, category.categoryId);
  const canCreate = creatableInviteRoles(roles).length > 0;

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text role="heading" className="font-heading text-section">
          {intl.formatMessage({ id: 'inviteLinks.title' })}
        </Text>
        <Text className="text-body-sm text-muted-foreground">
          {intl.formatMessage({ id: 'inviteLinks.intro' })}
        </Text>
      </View>
      {links.data ? (
        <>
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
          {links.isRefetchError && (
            <Banner variant="danger">
              <Text>{intl.formatMessage({ id: 'inviteLinks.loadFailed' })}</Text>
            </Banner>
          )}
        </>
      ) : links.isError ? (
        <Banner variant="danger">
          <Text className="flex-1">{intl.formatMessage({ id: 'inviteLinks.loadFailed' })}</Text>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              void links.refetch();
            }}
          >
            <Text>{intl.formatMessage({ id: 'inviteLinks.retry' })}</Text>
          </Button>
        </Banner>
      ) : links.fetchStatus === 'paused' ? null : (
        <Skeleton className="h-56 rounded-tile" />
      )}
      {canCreate && (
        <Button
          variant="secondary"
          disabled={!isOnline}
          onPress={() => {
            router.push({
              pathname: '/create-invite-link',
              params: { categoryId: category.categoryId },
            });
          }}
        >
          <Icon as={PlusIcon} className="size-5" />
          <Text>{intl.formatMessage({ id: 'inviteLinks.create.open' })}</Text>
        </Button>
      )}
    </View>
  );
}
