'use client';

import { CopyIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AppleLogo } from '@/components/apple-logo';
import { GoogleLogo } from '@/components/google-logo';
import { Alert, AlertContent, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { signInWithProvider, type SocialProvider } from '@/lib/auth-client';
import { nextPathFromLocation } from '@/lib/next-path';
import { useSignInEnvironment } from '@/lib/sign-in-environment';

const isSocialProvider = (value: string): value is SocialProvider =>
  value === 'google' || value === 'apple';

const enabledProviders = new Set(
  (process.env.NEXT_PUBLIC_SOCIAL_SIGN_IN ?? '')
    .split(',')
    .map((provider) => provider.trim())
    .filter(isSocialProvider),
);

function OpenInBrowserHint() {
  const t = useTranslations('signIn.inAppBrowser');
  const [copyResult, setCopyResult] = useState<'copied' | 'copyFailed' | null>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyResult('copied');
    } catch {
      setCopyResult('copyFailed');
    }
  };

  return (
    <Alert role={undefined} className="flex-col items-start gap-2">
      <AlertContent>
        <AlertTitle className="block">{t('title')}</AlertTitle>
        {t('body')}
      </AlertContent>
      <Button
        variant="secondary"
        size="sm"
        className="bg-background"
        onClick={() => void copyLink()}
      >
        <CopyIcon aria-hidden />
        {t('copyLink')}
      </Button>
      <p aria-live="polite" className="text-meta text-muted-foreground">
        {copyResult && t(copyResult)}
      </p>
    </Alert>
  );
}

export function SocialSignIn() {
  const t = useTranslations('signIn');
  const environment = useSignInEnvironment();
  const [hasFailed, setHasFailed] = useState(false);
  const [pending, setPending] = useState<SocialProvider | null>(null);

  if (environment === null || enabledProviders.size === 0) return null;
  const showGoogle = enabledProviders.has('google') && !environment.isEmbeddedBrowser;

  const signInWith = async (provider: SocialProvider) => {
    setHasFailed(false);
    setPending(provider);
    const result = await signInWithProvider(provider, nextPathFromLocation());
    if (!result.ok) {
      setPending(null);
      setHasFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div aria-hidden className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-meta text-subtle-foreground">{t('or')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {(hasFailed || environment.providerFailed) && <FieldError>{t('providerFailed')}</FieldError>}
      {enabledProviders.has('google') && environment.isEmbeddedBrowser && <OpenInBrowserHint />}
      {enabledProviders.has('apple') && (
        <Button
          className="bg-foreground text-background hover:bg-foreground/90"
          disabled={pending !== null}
          onClick={() => void signInWith('apple')}
        >
          {pending === 'apple' ? <Spinner /> : <AppleLogo />}
          {t('apple')}
        </Button>
      )}
      {showGoogle && (
        <Button
          variant="secondary"
          disabled={pending !== null}
          onClick={() => void signInWith('google')}
        >
          {pending === 'google' ? <Spinner /> : <GoogleLogo />}
          {t('google')}
        </Button>
      )}
    </div>
  );
}
