import { ChevronRightIcon, LinkIcon, ShieldPlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function NoClub() {
  const t = useTranslations('home.noClub');

  return (
    <section aria-labelledby="no-club-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="no-club-title" className="font-heading text-card-title text-balance">
          {t('title')}
        </h2>
        <p className="text-body text-pretty text-muted-foreground">{t('body')}</p>
      </div>
      <Link
        href="/clubs/new"
        className="group flex items-center gap-4 rounded-tile bg-club p-4 text-white outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-field bg-white/15">
          <ShieldPlusIcon aria-hidden className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-heading text-action">{t('create.title')}</span>
          <span className="text-body-sm text-white/80">{t('create.body')}</span>
        </span>
        <ChevronRightIcon
          aria-hidden
          className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
      <div className="flex items-start gap-4 rounded-tile bg-muted p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-field bg-background text-muted-foreground">
          <LinkIcon aria-hidden className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="font-heading text-action">{t('invite.title')}</h3>
          <p className="text-body-sm text-muted-foreground">{t('invite.body')}</p>
        </div>
      </div>
    </section>
  );
}
