import { ShieldIcon } from 'lucide-react';
import Image from 'next/image';

export function InviteHero({
  crestUrl,
  children,
}: {
  crestUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-b-header bg-club px-5 pt-10 pb-8 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(90deg,transparent_0_30px,color-mix(in_srgb,var(--color-white)_7%,transparent)_30px_60px)]"
      />
      <div className="relative flex flex-col gap-6">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-tile bg-white/15">
          {crestUrl ? (
            <Image
              src={crestUrl}
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
          {children}
        </h1>
      </div>
    </div>
  );
}
