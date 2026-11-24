import { ShieldIcon } from 'lucide-react';
import Image from 'next/image';

import { ClubTheme } from '@/components/club-theme';

export function ClubPreview({
  name,
  primaryColor,
  crestUrl,
  crestLabel,
}: {
  name: string;
  primaryColor: string | null;
  crestUrl: string | null;
  crestLabel: string;
}) {
  return (
    <ClubTheme primaryColor={primaryColor}>
      <div className="relative flex items-center gap-3 overflow-hidden rounded-tile bg-club px-4 py-4 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(90deg,transparent_0_30px,color-mix(in_srgb,var(--color-white)_7%,transparent)_30px_60px)]"
        />
        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-field bg-white/15">
          {crestUrl ? (
            <Image
              src={crestUrl}
              alt={crestLabel}
              width={48}
              height={48}
              unoptimized
              className="size-full object-contain p-1"
            />
          ) : (
            <ShieldIcon aria-hidden className="size-6" />
          )}
        </div>
        <p
          translate="no"
          className="relative min-w-0 font-display text-title-sm text-balance [overflow-wrap:anywhere]"
        >
          {name}
        </p>
      </div>
    </ClubTheme>
  );
}
