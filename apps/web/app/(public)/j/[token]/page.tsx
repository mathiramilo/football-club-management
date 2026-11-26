import { inviteRoles } from '@repo/contracts';
import { LinkIcon, SearchXIcon, ShieldIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { ClubTheme } from '@/components/club-theme';
import { PageMessage } from '@/components/page-message';
import { Skeleton } from '@/components/ui/skeleton';
import { getInvitePreview } from '@/lib/invite-preview';

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
    const status =
      preview.status === 'expired' || preview.status === 'used_up' ? preview.status : 'revoked';
    return (
      <PageMessage
        icon={<LinkIcon aria-hidden />}
        title={t(`inactive.${status}`)}
        body={t('inactive.body')}
      />
    );
  }

  const { club, category } = preview;
  return (
    <ClubTheme primaryColor={club.primaryColor} className="min-h-svh bg-background">
      <main className="mx-auto flex w-full max-w-md flex-col">
        <div className="relative overflow-hidden rounded-b-header bg-club px-5 pt-10 pb-8 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(90deg,transparent_0_30px,color-mix(in_srgb,var(--color-white)_7%,transparent)_30px_60px)]"
          />
          <div className="relative flex flex-col gap-6">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-tile bg-white/15">
              {club.crest ? (
                <Image
                  src={club.crest.url}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  priority
                  className="size-full object-contain p-2"
                />
              ) : (
                <ShieldIcon aria-hidden className="size-10" />
              )}
            </div>
            <h1 className="font-display text-title-sm text-balance [overflow-wrap:anywhere]">
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
            </h1>
          </div>
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
