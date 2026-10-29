'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { signOut } from '@/lib/auth-client';

export function SignOutButton() {
  const t = useTranslations('profile');
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      variant="secondary"
      className="text-danger-strong"
      disabled={isSigningOut}
      onClick={() => {
        setIsSigningOut(true);
        void signOut();
      }}
    >
      {isSigningOut && <Spinner />}
      {t('signOut')}
    </Button>
  );
}
