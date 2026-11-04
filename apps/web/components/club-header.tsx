import { Suspense } from 'react';

import { BackLink, SearchKeepingBackLink } from '@/components/header-back-link';
import { cn } from '@/lib/utils';

export function ClubHeader({
  title,
  subtitle,
  size = 'root',
  back,
}: {
  title: string;
  subtitle?: string;
  size?: 'root' | 'screen';
  back?: { label: string; href: string; keepSearch?: boolean };
}) {
  return (
    <header className="relative overflow-hidden bg-club text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(90deg,transparent_0_30px,color-mix(in_srgb,var(--color-white)_7%,transparent)_30px_60px)]"
      />
      <div
        className={cn(
          'relative mx-auto flex w-full max-w-md items-center gap-1.5 pt-4 pr-4 pb-5',
          back ? 'pl-2' : 'pl-5',
        )}
      >
        {back &&
          (back.keepSearch ? (
            <Suspense fallback={<BackLink href={back.href} label={back.label} />}>
              <SearchKeepingBackLink href={back.href} label={back.label} />
            </Suspense>
          ) : (
            <BackLink href={back.href} label={back.label} />
          ))}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1
            className={cn(
              'font-display text-balance [overflow-wrap:anywhere]',
              size === 'root' ? 'text-title' : 'text-title-sm',
            )}
          >
            {title}
          </h1>
          {subtitle && <p className="text-meta text-white/80">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
