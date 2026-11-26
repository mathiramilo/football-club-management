'use client';

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
import { CircleCheckIcon, HourglassIcon, LinkIcon, SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ClubTheme } from '@/components/club-theme';
import { InviteHero } from '@/components/invite-hero';
import { PageMessage } from '@/components/page-message';
import { Alert, AlertContent } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { rememberCurrentClub } from '@/lib/current-club-store';
import { inactiveInviteStatus } from '@/lib/invite-status';
import { errorMessageKey } from '@/lib/messages';
import { useStoreLinks } from '@/lib/store-links';

const knownRole = (role: string) => inviteRoles.find((known) => known === role) ?? 'player';

const opensCategory = (outcome: string) => outcome === 'joined' || outcome === 'already_member';

export function JoinInvite({ token }: { token: string }) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const preview = usePublicInvitesPreview(token, { query: { retry: false } });
  const accept = useInvitesAccept({
    mutation: {
      retry: 0,
      onSuccess: (result) => {
        if (!opensCategory(result.outcome)) return;
        rememberCurrentClub(result.clubId);
        void queryClient.invalidateQueries({ queryKey: getMyClubsListQueryKey() });
        if (result.outcome === 'already_member') router.replace('/');
      },
      onError: (error) => {
        if (error.code === 'INVITE_LINK_INACTIVE') void preview.refetch();
      },
    },
  });

  if (preview.error) {
    const notFound = preview.error instanceof ApiError && preview.error.status === 404;
    return notFound ? (
      <PageMessage
        icon={<SearchXIcon aria-hidden />}
        title={t('invite.notFound.title')}
        body={t('invite.notFound.body')}
      />
    ) : (
      <PageMessage
        icon={<LinkIcon aria-hidden />}
        title={t('joinInvite.loadFailed')}
        body={t('errors.INTERNAL_ERROR')}
      >
        <Button
          variant="secondary"
          onClick={() => {
            void preview.refetch();
          }}
        >
          {t('joinInvite.retry')}
        </Button>
      </PageMessage>
    );
  }
  if (!preview.data || accept.data?.outcome === 'already_member') return <JoinSkeleton />;

  const invite = preview.data;
  if (accept.data) return <JoinResult invite={invite} result={accept.data} />;
  if (invite.status !== 'active') {
    return (
      <PageMessage
        icon={<LinkIcon aria-hidden />}
        title={t(`invite.inactive.${inactiveInviteStatus(invite.status)}`)}
        body={t('invite.inactive.body')}
      />
    );
  }

  const { club, category } = invite;
  const strong = (chunks: React.ReactNode) => (
    <strong translate="no" className="font-[inherit]">
      {chunks}
    </strong>
  );
  return (
    <ClubTheme primaryColor={club.primaryColor} className="min-h-svh bg-background">
      <main className="mx-auto flex w-full max-w-md flex-col">
        <InviteHero crestUrl={club.crest?.url ?? null}>
          {t.rich('invite.heading', {
            category: category.name,
            club: club.name,
            role: t(`invite.roles.${knownRole(invite.role)}`),
            b: strong,
          })}
        </InviteHero>
        <div className="flex flex-col gap-4 px-5 py-8">
          {accept.error && accept.error.code !== 'INVITE_LINK_INACTIVE' && (
            <Alert variant="danger">
              <AlertContent>{t(errorMessageKey(accept.error.code))}</AlertContent>
            </Alert>
          )}
          <Button
            size="lg"
            disabled={accept.isPending}
            onClick={() => {
              accept.mutate({ token });
            }}
          >
            {accept.isPending && <Spinner />}
            <span>
              {t.rich('invite.join', {
                category: category.name,
                b: (chunks) => <span translate="no">{chunks}</span>,
              })}
            </span>
          </Button>
        </div>
      </main>
    </ClubTheme>
  );
}

function JoinResult({ invite, result }: { invite: InvitePreview; result: AcceptInviteResponse }) {
  const t = useTranslations('joinInvite');
  const names = { category: invite.category.name, club: invite.club.name };

  if (result.outcome === 'joined') {
    return (
      <ClubTheme primaryColor={invite.club.primaryColor}>
        <Joined category={invite.category.name} />
      </ClubTheme>
    );
  }
  return (
    <ClubTheme primaryColor={invite.club.primaryColor}>
      <PageMessage
        icon={<HourglassIcon aria-hidden />}
        title={
          result.outcome === 'already_requested'
            ? t('alreadyRequested.title', names)
            : t('requested.title')
        }
        body={t('requested.body', names)}
      >
        <Button asChild variant="secondary">
          <Link href="/">{t('home')}</Link>
        </Button>
      </PageMessage>
    </ClubTheme>
  );
}

function Joined({ category }: { category: string }) {
  const t = useTranslations();
  const { links } = useStoreLinks();

  return (
    <PageMessage
      icon={<CircleCheckIcon aria-hidden />}
      title={t('joinInvite.joined.title', { category })}
      body={links.length > 0 ? t('joinInvite.joined.body') : t('joinInvite.joined.webBody')}
    >
      <div className="flex w-full flex-col gap-3">
        {links.map(({ store, url }) => (
          <Button key={store} asChild>
            <a href={url} rel="noreferrer">
              {t('downloadApp.store', { store })}
            </a>
          </Button>
        ))}
        <Button asChild variant={links.length > 0 ? 'link' : 'primary'}>
          <Link href="/">{t('joinInvite.joined.continue')}</Link>
        </Button>
      </div>
    </PageMessage>
  );
}

function JoinSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-10">
      <Skeleton className="size-24 rounded-tile" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full rounded-full" />
    </main>
  );
}
