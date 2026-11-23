import { zodResolver } from '@hookform/resolvers/zod';
import {
  ApiError,
  getProfileGetQueryKey,
  type ProfileResponse,
  useProfileUpdate,
} from '@repo/api-client';
import { updateProfileBody } from '@repo/contracts';
import { CalendarXIcon, ShieldCheckIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, type FieldError as FormFieldError, useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { ClubHeader } from '@/components/club-header';
import { EmptyState } from '@/components/empty-state';
import { ProfilePhotoPicker } from '@/components/profile-photo-picker';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { signOut } from '@/lib/auth-client';
import { errorMessageKey, type MessageKey } from '@/lib/i18n';
import { useProfile } from '@/lib/profile';
import { type PreparedPhoto, uploadProfilePhoto } from '@/lib/profile-photo';
import { queryClient, useIsOnline } from '@/lib/query-client';

const profileForm = updateProfileBody.required({
  firstName: true,
  lastName: true,
  birthdate: true,
});

const maxLengths = { firstName: 50, lastName: 50, nickname: 30, birthdate: 10 } as const;
type FormField = keyof typeof maxLengths;

const textFields = [
  { name: 'firstName', autoComplete: 'given-name', textContentType: 'givenName' },
  { name: 'lastName', autoComplete: 'family-name', textContentType: 'familyName' },
  { name: 'nickname', autoComplete: 'nickname', textContentType: 'nickname', hint: 'nicknameHint' },
] as const;

const typedDate = (text: string) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
};

const isoFromTyped = (typed: string) => {
  const [day, month, year] = typed.split('/');
  return day?.length === 2 && month?.length === 2 && year?.length === 4
    ? `${year}-${month}-${day}`
    : typed;
};

const typedFromIso = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return year && month && day ? `${day}/${month}/${year}` : iso;
};

function ProfileForm({ profile }: { profile: ProfileResponse }) {
  const intl = useIntl();
  const isOnline = useIsOnline();
  const [step, setStep] = useState<'form' | 'underAge' | 'minor'>('form');
  const [saved, setSaved] = useState<ProfileResponse | null>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const update = useProfileUpdate({ mutation: { networkMode: 'always' } });
  const form = useForm({
    resolver: zodResolver(profileForm),
    defaultValues: {
      firstName: profile.firstName ?? profile.suggestedName?.firstName ?? '',
      lastName: profile.lastName ?? profile.suggestedName?.lastName ?? '',
      nickname: profile.nickname ?? '',
      birthdate: profile.birthdate ?? '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const t = (id: MessageKey, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const isBusy = isSubmitting || isUploading;

  const commit = (result: ProfileResponse) => {
    queryClient.setQueryData(getProfileGetQueryKey(), result);
  };
  const finish = (result: ProfileResponse) => {
    if (result.isMinor) {
      setSaved(result);
      setStep('minor');
    } else commit(result);
  };
  const attachPhoto = async (result: ProfileResponse) => {
    if (!photo) {
      finish(result);
      return;
    }
    setIsUploading(true);
    try {
      finish(await uploadProfilePhoto(photo.blob));
    } catch {
      setSaved(result);
      setPhotoFailed(true);
    } finally {
      setIsUploading(false);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      await attachPhoto(await update.mutateAsync({ data: values }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'UNDER_MINIMUM_AGE') setStep('underAge');
    }
  });

  const fieldError = (field: FormField, error: FormFieldError | undefined) => {
    if (!error) return null;
    if (!form.getValues(field)?.trim()) return t('profileCompletion.fieldErrors.required');
    if (error.type === 'too_big')
      return t('profileCompletion.fieldErrors.tooLong', { max: maxLengths[field] });
    return t(
      field === 'birthdate'
        ? 'profileCompletion.fieldErrors.invalidDate'
        : 'profileCompletion.fieldErrors.required',
    );
  };

  if (step === 'underAge' || (step === 'minor' && saved)) {
    const isUnderAge = step === 'underAge';
    return (
      <View className="flex-1 justify-center bg-background px-5">
        <EmptyState
          icon={isUnderAge ? CalendarXIcon : ShieldCheckIcon}
          title={t(
            isUnderAge ? 'profileCompletion.underAge.title' : 'profileCompletion.minor.title',
          )}
          body={t(isUnderAge ? 'profileCompletion.underAge.body' : 'profileCompletion.minor.body')}
        >
          {isUnderAge ? (
            <View className="gap-2">
              <Button
                onPress={() => {
                  setStep('form');
                  update.reset();
                }}
              >
                <Text>{t('profileCompletion.underAge.fixDate')}</Text>
              </Button>
              <Button variant="link" onPress={() => void signOut()}>
                <Text>{t('profileCompletion.underAge.signOut')}</Text>
              </Button>
            </View>
          ) : (
            <Button
              onPress={() => {
                if (saved) commit(saved);
              }}
            >
              <Text>{t('profileCompletion.minor.continue')}</Text>
            </Button>
          )}
        </EmptyState>
      </View>
    );
  }

  const birthdateError = fieldError('birthdate', errors.birthdate);

  return (
    <View className="flex-1 bg-background">
      <ClubHeader title={t('profileCompletion.title')} size="screen" />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 py-6">
          <Text className="text-body">{t('profileCompletion.body')}</Text>
          <ProfilePhotoPicker
            previewUri={photo?.uri ?? null}
            disabled={isBusy || saved !== null}
            onSelect={setPhoto}
            onRemove={() => {
              setPhoto(null);
            }}
          />
          {textFields.map(({ name, autoComplete, textContentType, ...field }) => {
            const message = fieldError(name, errors[name]);
            return (
              <Controller
                key={name}
                control={form.control}
                name={name}
                render={({ field: { value, onChange, onBlur, ref } }) => (
                  <Field>
                    <FieldLabel nativeID={`${name}-label`}>
                      {t(`profileCompletion.${name}`)}
                    </FieldLabel>
                    <Input
                      ref={ref}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoComplete={autoComplete}
                      textContentType={textContentType}
                      autoCapitalize="words"
                      returnKeyType="next"
                      editable={saved === null}
                      invalid={message !== null}
                      accessibilityLabelledBy={`${name}-label`}
                      accessibilityLabel={t(`profileCompletion.${name}`)}
                    />
                    {'hint' in field && (
                      <FieldDescription>{t(`profileCompletion.${field.hint}`)}</FieldDescription>
                    )}
                    {message && <FieldError>{message}</FieldError>}
                  </Field>
                )}
              />
            );
          })}
          <Controller
            control={form.control}
            name="birthdate"
            render={({ field: { value, onChange, onBlur, ref } }) => (
              <Field>
                <FieldLabel nativeID="birthdate-label">
                  {t('profileCompletion.birthdate')}
                </FieldLabel>
                <Input
                  ref={ref}
                  value={typedFromIso(value)}
                  onChangeText={(text) => {
                    onChange(isoFromTyped(typedDate(text)));
                  }}
                  onBlur={onBlur}
                  placeholder={t('profileCompletion.birthdatePlaceholder')}
                  keyboardType="number-pad"
                  autoComplete="birthdate-full"
                  textContentType="birthdate"
                  maxLength={10}
                  editable={saved === null}
                  invalid={birthdateError !== null}
                  accessibilityLabelledBy="birthdate-label"
                  accessibilityLabel={t('profileCompletion.birthdate')}
                  accessibilityHint={t('profileCompletion.birthdateHint')}
                />
                <FieldDescription>{t('profileCompletion.birthdateHint')}</FieldDescription>
                {birthdateError && <FieldError>{birthdateError}</FieldError>}
              </Field>
            )}
          />
          {!isOnline ? (
            <Banner variant="neutral">
              <Text>{t('profileCompletion.offline')}</Text>
            </Banner>
          ) : (
            update.error &&
            update.error.code !== 'UNDER_MINIMUM_AGE' && (
              <Banner variant="danger" role="alert">
                <Text>{intl.formatMessage({ id: errorMessageKey(update.error.code) })}</Text>
              </Banner>
            )
          )}
          {photoFailed && saved ? (
            <View className="gap-2">
              <Banner variant="danger" role="alert">
                <Text>{t('profileCompletion.photo.uploadFailed')}</Text>
              </Banner>
              <Button
                disabled={isBusy || !isOnline}
                onPress={() => {
                  setPhotoFailed(false);
                  void attachPhoto(saved);
                }}
              >
                {isUploading && <ActivityIndicator />}
                <Text>{t('profileCompletion.photo.retry')}</Text>
              </Button>
              <Button
                variant="link"
                onPress={() => {
                  finish(saved);
                }}
              >
                <Text>{t('profileCompletion.photo.skip')}</Text>
              </Button>
            </View>
          ) : (
            <Button disabled={isBusy || !isOnline || saved !== null} onPress={() => void submit()}>
              {(isBusy || saved !== null) && <ActivityIndicator />}
              <Text>{t('profileCompletion.save')}</Text>
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function ProfileCompletionScreen() {
  const { data } = useProfile();

  if (!data || data.profileComplete) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }
  return <ProfileForm profile={data} />;
}
