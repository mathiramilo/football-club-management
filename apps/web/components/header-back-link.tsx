'use client';

import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const className =
  'flex size-11 shrink-0 items-center justify-center rounded-full outline-white hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-0';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className={className}>
      <ChevronLeftIcon aria-hidden strokeWidth={2.4} className="size-6.5" />
    </Link>
  );
}

export function SearchKeepingBackLink({ href, label }: { href: string; label: string }) {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  return <BackLink href={search ? `${href}?${search}` : href} label={label} />;
}
