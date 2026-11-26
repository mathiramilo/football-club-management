import {
  type AcceptInviteResponse,
  ApiError,
  getMyClubsListQueryKey,
  type InvitePreview,
  useInvitesAccept,
  usePublicInvitesPreview,
} from '@repo/api-client';
import { inviteRoles } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HourglassIcon, LinkIcon, SearchXIcon, ShieldIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClubStripes } from '@/components/club-stripes';
import { ClubTheme } from '@/components/club-theme';
import { EmptyState } from '@/components/empty-state';
import { OfflineBanner } from '@/components/offline-banner';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { rememberCurrentClub } from '@/lib/current-club';
import { holdInvite } from '@/lib/held-invite';
import { errorMessageKey, type MessageKey } from '@/lib/i18n';
import { useLegalGate } from '@/lib/legal-acceptance';
import { useProfileGate } from '@/lib/profile';
import { useIsOnline } from '@/lib/query-client';
import { useIsSignedIn } from '@/lib/session';

const knownRole = (role: string) => inviteRoles.find((known) => known === role) ?? 'player';

const inactiveStatus = (status: string) =>
  status === 'expired' || status === 'used_up' ? status : 'revoked';

const opensCategory = (outcome: string) => outcome === 'joined' || outcome === 'already_member';

function useCanJoin() {
  const isSignedIn = useIsSignedIn();
  const legalGate = useLegalGate(isSignedIn);
  const profileGate = useProfileGate(isSignedIn && legalGate === 'accepted');
  return isSignedIn && legalGate === 'accepted' && profileGate === 'complete';
}

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const intl = useIntl();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const canJoin = useCanJoin();
  const t = (id: MessageKey, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const preview = usePublicInvitesPreview(token, { query: { retry: false } });
  const accept = useInvitesAccept({
    mutation: {
      networkMode: 'always',
      retry: 0,
      onSuccess: async (result) => {
        if (!opensCategory(result.outcome)) return;
        rememberCurrentClub(result.clubId);
        await queryClient.invalidateQueries({ queryKey: getMyClubsListQueryKey() });
        router.replace('/');
      },
      onError: (error) => {
        if (error.code === 'INVITE_LINK_INACTIVE') void preview.refetch();
      },
    },
  });

  const join = () => {
    if (canJoin) {
      accept.mutate({ token });
      return;
    }
    holdInvite(token);
    router.replace('/');
  };

  if (preview.error) {
    const notFound = preview.error instanceof ApiError && preview.error.status === 404;
    return (
      <Message>
        {notFound ? (
          <EmptyState
            icon={SearchXIcon}
            title={t('invite.notFound.title')}
            body={t('invite.notFound.body')}
          />
        ) : (
          <EmptyState
            icon={LinkIcon}
            title={t('joinInvite.loadFailed')}
            body={t('errors.INTERNAL_ERROR')}
          >
            <Button variant="secondary" onPress={() => void preview.refetch()}>
              <Text>{t('joinInvite.retry')}</Text>
            </Button>
          </EmptyState>
        )}
      </Message>
    );
  }
  if (!preview.data) return <InviteSkeleton />;

  const invite = preview.data;
  if (accept.data && !opensCategory(accept.data.outcome)) {
    return <Requested invite={invite} result={accept.data} />;
  }
  if (invite.status !== 'active') {
    return (
      <Message>
        <EmptyState
          icon={LinkIcon}
          title={t(`invite.inactive.${inactiveStatus(invite.status)}`)}
          body={t('invite.inactive.body')}
        />
      </Message>
    );
  }

  const { club, category } = invite;
  const bold = (chunks: React.ReactNode[]) => <Text className="font-display">{chunks}</Text>;
  const isJoining =
    accept.isPending || (accept.data !== undefined && opensCategory(accept.data.outcome));
  return (
    <ClubTheme primaryColor={club.primaryColor}>
      <StatusBar style="light" />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
        <View className="overflow-hidden rounded-b-header bg-club">
          <ClubStripes />
          <SafeAreaView edges={['top']}>
            <View className="gap-6 px-5 pt-6 pb-8">
              <View className="size-24 items-center justify-center overflow-hidden rounded-tile bg-white/15">
                {club.crest ? (
                  <Image
                    source={{ uri: club.crest.url }}
                    accessibilityIgnoresInvertColors
                    contentFit="contain"
                    style={{ width: 80, height: 80 }}
                  />
                ) : (
                  <Icon as={ShieldIcon} className="size-10 text-white" />
                )}
              </View>
              <Text role="heading" className="font-display text-title-sm text-white">
                {intl.formatMessage(
                  { id: 'invite.heading' },
                  {
                    category: category.name,
                    club: club.name,
                    role: t(`invite.roles.${knownRole(invite.role)}`),
                    b: bold,
                  },
                )}
              </Text>
            </View>
          </SafeAreaView>
        </View>
        <OfflineBanner />
        <View className="gap-4 px-5 pt-8">
          {accept.error && accept.error.code !== 'INVITE_LINK_INACTIVE' && (
            <Banner variant="danger">
              <Text>{t(errorMessageKey(accept.error.code))}</Text>
            </Banner>
          )}
          <Button size="lg" disabled={!isOnline || isJoining} onPress={join}>
            {isJoining && <ActivityIndicator />}
            <Text>
              {intl.formatMessage(
                { id: 'invite.join' },
                { category: category.name, b: (chunks) => <Text>{chunks}</Text> },
              )}
            </Text>
          </Button>
          {!canJoin && (
            <Text className="text-center text-body-sm text-muted-foreground">
              {t('invite.joinHint')}
            </Text>
          )}
        </View>
      </ScrollView>
    </ClubTheme>
  );
}

function Requested({ invite, result }: { invite: InvitePreview; result: AcceptInviteResponse }) {
  const intl = useIntl();
  const router = useRouter();
  const names = { category: invite.category.name, club: invite.club.name };

  return (
    <ClubTheme primaryColor={invite.club.primaryColor}>
      <Message>
        <EmptyState
          icon={HourglassIcon}
          title={
            result.outcome === 'already_requested'
              ? intl.formatMessage({ id: 'joinInvite.alreadyRequested.title' }, names)
              : intl.formatMessage({ id: 'joinInvite.requested.title' })
          }
          body={intl.formatMessage({ id: 'joinInvite.requested.body' }, names)}
        >
          <Button
            variant="secondary"
            onPress={() => {
              router.replace('/');
            }}
          >
            <Text>{intl.formatMessage({ id: 'joinInvite.home' })}</Text>
          </Button>
        </EmptyState>
      </Message>
    </ClubTheme>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 justify-center bg-background px-5">
      <StatusBar style="dark" />
      {children}
    </SafeAreaView>
  );
}

function InviteSkeleton() {
  return (
    <SafeAreaView className="flex-1 gap-6 bg-background px-5 pt-6">
      <Skeleton className="size-24 rounded-tile" />
      <Skeleton className="h-24" />
      <Skeleton className="h-16 rounded-full" />
    </SafeAreaView>
  );
}
