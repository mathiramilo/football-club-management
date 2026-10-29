'use client';

import { MailIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';

import { useSignInEmail } from '@/components/sign-in-email';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { requestSignInCode } from '@/lib/auth-client';
import type { MessageKey } from '@/lib/messages';

const emailAddress = z.email();

export function SignInForm() {
  const t = useTranslations();
  const router = useRouter();
  const { email, setEmail, setSentCode } = useSignInEmail();
  const [error, setError] = useState<MessageKey | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sendCode = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;
    const address = email.trim().toLowerCase();
    if (!emailAddress.safeParse(address).success) {
      setError('signIn.email.invalid');
      return;
    }
    setIsSending(true);
    const result = await requestSignInCode(address);
    setIsSending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEmail(address);
    setSentCode({ email: address, sentAt: Date.now() });
    router.push(`/sign-in/code${window.location.search}`);
  };

  return (
    <form noValidate onSubmit={(event) => void sendCode(event)} className="flex flex-col gap-5">
      <Field data-invalid={error !== null || undefined}>
        <FieldLabel htmlFor="sign-in-email">{t('signIn.email.label')}</FieldLabel>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          aria-invalid={error !== null}
          aria-describedby="sign-in-email-message"
        />
        {error ? (
          <FieldError id="sign-in-email-message">{t(error)}</FieldError>
        ) : (
          <FieldDescription id="sign-in-email-message">{t('signIn.email.hint')}</FieldDescription>
        )}
      </Field>
      <Button type="submit" disabled={isSending}>
        {isSending ? <Spinner /> : <MailIcon aria-hidden />}
        {t('signIn.email.send')}
      </Button>
    </form>
  );
}
