import { inviteRoles } from '@repo/contracts';
import { LinkIcon, SearchXIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { ClubTheme } from '@/components/club-theme';
import { InviteHero } from '@/components/invite-hero';
import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getInvitePreview } from '@/lib/invite-preview';
import { inactiveInviteStatus } from '@/lib/invite-status';

interface InviteProps {
  params: Promise<{ token: string }>;
}

const knownRole = (role: string) => inviteRoles.find((known) => known === role) ?? 'player';

export async function generateMetadata({ params }: InviteProps): Promise<Metadata> {
  const { token } = await params;
  const [preview, t] = await Promise.all([getInvitePreview(token), getTranslations('invite')]);
  if (!preview) return { title: t('notFound.title'), robots: { index: false } };

  const names = { category: preview.category.name, club: preview.club.name };
  const title = t('metaTitle', names);
  const description = t('metaDescription', {
    ...names,
    role: t(`roles.${knownRole(preview.role)}`),
  });
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description },
  };
}

export default function InvitePage({ params }: InviteProps) {
  return (
    <Suspense fallback={<InviteSkeleton />}>
      <Invite params={params} />
    </Suspense>
  );
}

async function Invite({ params }: InviteProps) {
  const { token } = await params;
  const [preview, t] = await Promise.all([getInvitePreview(token), getTranslations('invite')]);

  if (!preview) {
    return (
      <PageMessage
        icon={<SearchXIcon aria-hidden />}
        title={t('notFound.title')}
        body={t('notFound.body')}
      />
    );
  }
  if (preview.status !== 'active') {
    return (
      <PageMessage
        icon={<LinkIcon aria-hidden />}
        title={t(`inactive.${inactiveInviteStatus(preview.status)}`)}
        body={t('inactive.body')}
      />
    );
  }

  const { club, category } = preview;
  return (
    <ClubTheme primaryColor={club.primaryColor} className="min-h-svh bg-background">
      <main className="mx-auto flex w-full max-w-md flex-col">
        <InviteHero crestUrl={club.crest?.url ?? null}>
          {t.rich('heading', {
            category: category.name,
            club: club.name,
            role: t(`roles.${knownRole(preview.role)}`),
            b: (chunks) => (
              <strong translate="no" className="font-[inherit]">
                {chunks}
              </strong>
            ),
          })}
        </InviteHero>
        <div className="flex flex-col gap-3 px-5 py-8">
          <Button asChild size="lg">
            <Link href={`/join/${token}`}>
              <span>
                {t.rich('join', {
                  category: category.name,
                  b: (chunks) => <span translate="no">{chunks}</span>,
                })}
              </span>
            </Link>
          </Button>
          <p className="text-center text-body-sm text-pretty text-muted-foreground">
            {t('joinHint')}
          </p>
        </div>
      </main>
    </ClubTheme>
  );
}

function InviteSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-10">
      <Skeleton className="size-24 rounded-tile" />
      <Skeleton className="h-24 w-full" />
    </main>
  );
}
