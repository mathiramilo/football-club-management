'use client';

import { MailIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { CodeInput, codeLength } from '@/components/code-input';
import { useSignInEmail } from '@/components/sign-in-email';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { requestSignInCode, signInWithCode } from '@/lib/auth-client';
import type { MessageKey } from '@/lib/messages';
import { nextPathFromLocation } from '@/lib/next-path';
import { webmailFor } from '@/lib/webmail';

const resendAfterSeconds = 60;
const codeValidMinutes = 10;

const rejectedCodeErrors = new Set<MessageKey>([
  'errors.INVALID_OTP',
  'errors.OTP_EXPIRED',
  'errors.TOO_MANY_ATTEMPTS',
]);

function useCountdown(startedAt: number, seconds: number) {
  const [now, setNow] = useState(startedAt);
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const secondsLeft = Math.max(0, seconds - elapsedSeconds);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = setTimeout(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [now, secondsLeft]);

  return secondsLeft;
}

const formatCountdown = (seconds: number) =>
  `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;

interface SentCodeProps {
  email: string;
  sentAt: number;
  changeEmailHref: string;
}

function CodeForm({ email, sentAt, changeEmailHref }: SentCodeProps) {
  const t = useTranslations();
  const router = useRouter();
  const { setSentCode } = useSignInEmail();
  const [code, setCode] = useState('');
  const [error, setError] = useState<MessageKey | null>(null);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const secondsUntilResend = useCountdown(sentAt, resendAfterSeconds);
  const isCodeRejected = error !== null && rejectedCodeErrors.has(error);
  const webmail = webmailFor(email);

  const confirm = async (otp: string) => {
    setIsSubmitting(true);
    const result = await signInWithCode(email, otp);
    if (!result.ok) {
      setIsSubmitting(false);
      setError(result.message);
      codeInput.current?.select();
      return;
    }
    router.replace(nextPathFromLocation());
  };

  const changeCode = (next: string) => {
    setCode(next);
    setError(null);
    if (next.length === codeLength && next !== code) void confirm(next);
  };

  const resend = async () => {
    setIsResending(true);
    const result = await requestSignInCode(email);
    setIsResending(false);
    codeInput.current?.focus();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSentCode({ email, sentAt: Date.now() });
    setCode('');
    setError(null);
    setNotice('emailCode.resent');
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === codeLength) void confirm(code);
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col items-start gap-1">
        <p id="sign-in-code-sent-to" className="break-all">
          {t.rich('emailCode.sentTo', {
            email,
            b: (chunks) => <strong translate="no">{chunks}</strong>,
          })}
        </p>
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href={changeEmailHref}>{t('emailCode.changeEmail')}</Link>
        </Button>
      </div>
      <CodeInput
        ref={codeInput}
        id="sign-in-code"
        value={code}
        onChange={changeCode}
        label={t('emailCode.codeLabel')}
        invalid={isCodeRejected}
        describedBy="sign-in-code-sent-to sign-in-code-message"
      />
      <div id="sign-in-code-message">
        {error ? (
          <FieldError>{t(error)}</FieldError>
        ) : (
          <p aria-live="polite" className="text-meta text-muted-foreground">
            {notice && t(notice)}
          </p>
        )}
      </div>
      <Button type="submit" disabled={code.length < codeLength || isCodeRejected || isSubmitting}>
        {isSubmitting && <Spinner />}
        {t('emailCode.confirm')}
      </Button>
      {webmail && (
        <Button asChild variant="secondary" size="sm">
          <a href={webmail} target="_blank" rel="noreferrer">
            <MailIcon aria-hidden />
            {t('emailCode.openMail')}
          </a>
        </Button>
      )}
      <div className="flex flex-col items-start gap-1 rounded-banner bg-muted px-4 py-3.5">
        <p className="font-bold">{t('emailCode.notReceived')}</p>
        {secondsUntilResend > 0 ? (
          <p className="text-meta text-muted-foreground">
            {t('emailCode.resendIn', {
              time: formatCountdown(secondsUntilResend),
              minutes: codeValidMinutes,
            })}
          </p>
        ) : (
          <>
            <p className="text-meta text-muted-foreground">{t('emailCode.resendNow')}</p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0"
              disabled={isResending}
              onClick={() => void resend()}
            >
              {isResending && <Spinner />}
              {t('emailCode.resend')}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

export function EmailCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sentCode } = useSignInEmail();
  const changeEmailHref = `/sign-in${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`;

  useEffect(() => {
    if (sentCode === null) router.replace(changeEmailHref);
  }, [sentCode, router, changeEmailHref]);

  if (sentCode === null) return null;
  return (
    <CodeForm email={sentCode.email} sentAt={sentCode.sentAt} changeEmailHref={changeEmailHref} />
  );
}
