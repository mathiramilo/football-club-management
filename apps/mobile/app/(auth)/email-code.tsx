import * as Clipboard from 'expo-clipboard';
import * as IntentLauncher from 'expo-intent-launcher';
import { useRouter } from 'expo-router';
import { ClipboardPasteIcon, MailIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, View } from 'react-native';

import { ClubHeader } from '@/components/club-header';
import { CodeInput, codeLength } from '@/components/code-input';
import { useSignInEmail } from '@/components/sign-in-email';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { requestSignInCode, signInWithCode } from '@/lib/auth-client';
import type { MessageKey } from '@/lib/i18n';

const resendAfterSeconds = 60;
const codeValidMinutes = 10;

const rejectedCodeErrors = new Set<MessageKey>([
  'errors.INVALID_OTP',
  'errors.OTP_EXPIRED',
  'errors.TOO_MANY_ATTEMPTS',
]);

function useCountdown(startedAt: number, seconds: number) {
  const [now, setNow] = useState(Date.now);
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

async function openMailApp() {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        category: 'android.intent.category.APP_EMAIL',
      });
    } else {
      await Linking.openURL('message://');
    }
  } catch {
    return;
  }
}

export default function EmailCodeScreen() {
  const intl = useIntl();
  const router = useRouter();
  const { email } = useSignInEmail();
  const [code, setCode] = useState('');
  const [error, setError] = useState<MessageKey | null>(null);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const secondsUntilResend = useCountdown(sentAt, resendAfterSeconds);
  const isCodeRejected = error !== null && rejectedCodeErrors.has(error);
  const goBack = () => {
    router.back();
  };

  const confirm = useCallback(
    async (otp: string) => {
      setIsSubmitting(true);
      const result = await signInWithCode(email, otp);
      setIsSubmitting(false);
      if (!result.ok) setError(result.message);
    },
    [email],
  );

  const changeCode = (next: string) => {
    setCode(next);
    setError(null);
    if (next.length === codeLength) void confirm(next);
  };

  const pasteCode = async () => {
    const pasted = /\b\d{6}\b/.exec(await Clipboard.getStringAsync());
    if (pasted) changeCode(pasted[0]);
  };

  const resend = async () => {
    const result = await requestSignInCode(email);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSentAt(Date.now());
    setCode('');
    setError(null);
    setNotice('emailCode.resent');
  };

  return (
    <View className="flex-1 bg-background">
      <ClubHeader
        title={intl.formatMessage({ id: 'emailCode.title' })}
        subtitle={intl.formatMessage({ id: 'emailCode.subtitle' })}
        size="screen"
        back={{ label: intl.formatMessage({ id: 'emailCode.back' }), onPress: goBack }}
      />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-5 py-6">
          <View className="items-start gap-1">
            <Text>
              {intl.formatMessage(
                { id: 'emailCode.sentTo' },
                {
                  email,
                  b: (chunks) => (
                    <Text key="email" className="font-bold">
                      {chunks}
                    </Text>
                  ),
                },
              )}
            </Text>
            <Button variant="link" size="sm" className="px-0" onPress={goBack}>
              <Text>{intl.formatMessage({ id: 'emailCode.changeEmail' })}</Text>
            </Button>
          </View>
          <CodeInput
            value={code}
            onChangeText={changeCode}
            label={intl.formatMessage({ id: 'emailCode.codeLabel' })}
            invalid={error !== null}
          />
          {error && <FieldError>{intl.formatMessage({ id: error })}</FieldError>}
          {notice && !error && (
            <Text accessibilityLiveRegion="polite" className="text-meta text-muted-foreground">
              {intl.formatMessage({ id: notice })}
            </Text>
          )}
          <View className="flex-row gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onPress={() => void pasteCode()}
            >
              <Icon as={ClipboardPasteIcon} />
              <Text>{intl.formatMessage({ id: 'emailCode.paste' })}</Text>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onPress={() => void openMailApp()}
            >
              <Icon as={MailIcon} />
              <Text>{intl.formatMessage({ id: 'emailCode.openMail' })}</Text>
            </Button>
          </View>
          <View className="gap-1 rounded-banner bg-muted px-4 py-3.5">
            <Text className="font-bold">{intl.formatMessage({ id: 'emailCode.notReceived' })}</Text>
            {secondsUntilResend > 0 ? (
              <Text className="text-meta text-muted-foreground">
                {intl.formatMessage(
                  { id: 'emailCode.resendIn' },
                  { time: formatCountdown(secondsUntilResend), minutes: codeValidMinutes },
                )}
              </Text>
            ) : (
              <>
                <Text className="text-meta text-muted-foreground">
                  {intl.formatMessage({ id: 'emailCode.resendNow' })}
                </Text>
                <Button
                  variant="link"
                  size="sm"
                  className="self-start px-0"
                  onPress={() => void resend()}
                >
                  <Text>{intl.formatMessage({ id: 'emailCode.resend' })}</Text>
                </Button>
              </>
            )}
          </View>
        </ScrollView>
        <View className="border-t border-border px-5 pt-3 pb-8">
          <Button
            disabled={code.length < codeLength || isCodeRejected || isSubmitting}
            onPress={() => void confirm(code)}
          >
            <Text>{intl.formatMessage({ id: 'emailCode.confirm' })}</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
