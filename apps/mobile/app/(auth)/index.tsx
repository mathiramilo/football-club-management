import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { MailIcon } from 'lucide-react-native';
import { styled } from 'nativewind';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { z } from 'zod';

import { ClubHeader } from '@/components/club-header';
import { GoogleLogo } from '@/components/google-logo';
import { useSignInEmail } from '@/components/sign-in-email';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { type AuthResult, requestSignInCode } from '@/lib/auth-client';
import type { MessageKey } from '@/lib/i18n';
import { isGoogleSignInAvailable, signInWithApple, signInWithGoogle } from '@/lib/social-sign-in';

const emailAddress = z.email();

const AppleButton = styled(AppleAuthentication.AppleAuthenticationButton, { className: 'style' });

function useIsAppleSignInAvailable() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setIsAvailable);
  }, []);

  return isAvailable;
}

export default function SignInScreen() {
  const intl = useIntl();
  const router = useRouter();
  const { email, setEmail } = useSignInEmail();
  const [error, setError] = useState<MessageKey | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isAppleSignInAvailable = useIsAppleSignInAvailable();

  const signInWith = async (provider: () => Promise<AuthResult | null>) => {
    setError(null);
    const result = await provider();
    if (result && !result.ok) setError(result.message);
  };

  const sendCode = async () => {
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
    router.push('/email-code');
  };

  return (
    <View className="flex-1 bg-background">
      <ClubHeader title={intl.formatMessage({ id: 'signIn.title' })} size="screen" />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-5 py-6">
          <Field>
            <FieldLabel nativeID="sign-in-email">
              {intl.formatMessage({ id: 'signIn.email.label' })}
            </FieldLabel>
            <Input
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              onSubmitEditing={() => void sendCode()}
              invalid={error !== null}
              accessibilityLabelledBy="sign-in-email"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
            />
            {error ? (
              <FieldError>{intl.formatMessage({ id: error })}</FieldError>
            ) : (
              <FieldDescription>{intl.formatMessage({ id: 'signIn.email.hint' })}</FieldDescription>
            )}
          </Field>
          <Button disabled={isSending} onPress={() => void sendCode()}>
            <Icon as={MailIcon} />
            <Text>{intl.formatMessage({ id: 'signIn.email.send' })}</Text>
          </Button>
          {(isAppleSignInAvailable || isGoogleSignInAvailable) && (
            <View aria-hidden className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-meta text-subtle-foreground">
                {intl.formatMessage({ id: 'signIn.or' })}
              </Text>
              <View className="h-px flex-1 bg-border" />
            </View>
          )}
          {isAppleSignInAvailable && (
            <AppleButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={28}
              className="h-14"
              onPress={() => void signInWith(signInWithApple)}
            />
          )}
          {isGoogleSignInAvailable && (
            <Button variant="secondary" onPress={() => void signInWith(signInWithGoogle)}>
              <GoogleLogo />
              <Text>{intl.formatMessage({ id: 'signIn.google' })}</Text>
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
