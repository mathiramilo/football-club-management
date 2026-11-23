'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ApiError,
  getProfileGetQueryKey,
  type ProfileResponse,
  useProfileUpdate,
} from '@repo/api-client';
import { updateProfileBody } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarXIcon, ShieldCheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { type FieldError as FormFieldError, useForm } from 'react-hook-form';

import { ClubHeader } from '@/components/club-header';
import { PageMessage } from '@/components/page-message';
import { ProfilePhotoPicker } from '@/components/profile-photo-picker';
import { Alert, AlertContent } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { signOut } from '@/lib/auth-client';
import { errorMessageKey } from '@/lib/messages';
import { uploadProfilePhoto } from '@/lib/profile-photo';

const profileForm = updateProfileBody.required({
  firstName: true,
  lastName: true,
  birthdate: true,
});

const maxLengths = { firstName: 50, lastName: 50, nickname: 30, birthdate: 10 } as const;
type FormField = keyof typeof maxLengths;

function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

export function ProfileCompletion({ profile }: { profile: ProfileResponse }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'form' | 'underAge' | 'minor'>('form');
  const [saved, setSaved] = useState<ProfileResponse | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const previewUrl = useObjectUrl(photo);
  const update = useProfileUpdate();
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
    try {
      finish(await uploadProfilePhoto(photo));
    } catch {
      setSaved(result);
      setPhotoFailed(true);
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
    if (error.type === 'too_big') {
      return t('profileCompletion.fieldErrors.tooLong', { max: maxLengths[field] });
    }
    return t(
      field === 'birthdate'
        ? 'profileCompletion.fieldErrors.invalidDate'
        : 'profileCompletion.fieldErrors.required',
    );
  };

  if (step === 'underAge') {
    return (
      <PageMessage
        icon={<CalendarXIcon aria-hidden />}
        title={t('profileCompletion.underAge.title')}
        body={t('profileCompletion.underAge.body')}
      >
        <Button
          onClick={() => {
            setStep('form');
            update.reset();
          }}
        >
          {t('profileCompletion.underAge.fixDate')}
        </Button>
        <Button
          variant="link"
          onClick={() => {
            void signOut();
          }}
        >
          {t('profileCompletion.underAge.signOut')}
        </Button>
      </PageMessage>
    );
  }

  if (step === 'minor' && saved) {
    return (
      <PageMessage
        icon={<ShieldCheckIcon aria-hidden />}
        title={t('profileCompletion.minor.title')}
        body={t('profileCompletion.minor.body')}
      >
        <Button
          onClick={() => {
            commit(saved);
          }}
        >
          {t('profileCompletion.minor.continue')}
        </Button>
      </PageMessage>
    );
  }

  const fields = [
    { name: 'firstName', autoComplete: 'given-name' },
    { name: 'lastName', autoComplete: 'family-name' },
    { name: 'nickname', autoComplete: 'nickname', hint: 'nicknameHint' },
  ] as const;

  return (
    <>
      <ClubHeader title={t('profileCompletion.title')} size="screen" />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
        <p className="text-body text-pretty">{t('profileCompletion.body')}</p>
        <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void submit(event)}>
          <FieldGroup>
            <ProfilePhotoPicker
              previewUrl={previewUrl}
              disabled={isSubmitting || saved !== null}
              onSelect={setPhoto}
              onRemove={() => {
                setPhoto(null);
              }}
            />
            {fields.map(({ name, autoComplete, ...field }) => {
              const message = fieldError(name, errors[name]);
              return (
                <Field key={name} data-invalid={message !== null}>
                  <FieldLabel htmlFor={name}>{t(`profileCompletion.${name}`)}</FieldLabel>
                  <Input
                    id={name}
                    autoComplete={autoComplete}
                    aria-invalid={message !== null}
                    disabled={saved !== null}
                    {...form.register(name)}
                  />
                  {'hint' in field && (
                    <FieldDescription>{t(`profileCompletion.${field.hint}`)}</FieldDescription>
                  )}
                  <FieldError>{message}</FieldError>
                </Field>
              );
            })}
            <Field data-invalid={errors.birthdate !== undefined}>
              <FieldLabel htmlFor="birthdate">{t('profileCompletion.birthdate')}</FieldLabel>
              <Input
                id="birthdate"
                type="date"
                autoComplete="bday"
                min="1900-01-01"
                aria-invalid={errors.birthdate !== undefined}
                disabled={saved !== null}
                {...form.register('birthdate')}
              />
              <FieldDescription>{t('profileCompletion.birthdateHint')}</FieldDescription>
              <FieldError>{fieldError('birthdate', errors.birthdate)}</FieldError>
            </Field>
          </FieldGroup>
          {update.error && update.error.code !== 'UNDER_MINIMUM_AGE' && (
            <Alert variant="danger" role="alert">
              <AlertContent>{t(errorMessageKey(update.error.code))}</AlertContent>
            </Alert>
          )}
          {photoFailed && saved ? (
            <div className="flex flex-col gap-2">
              <Alert variant="danger" role="alert">
                <AlertContent>{t('profileCompletion.photo.uploadFailed')}</AlertContent>
              </Alert>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setPhotoFailed(false);
                  void attachPhoto(saved);
                }}
              >
                {t('profileCompletion.photo.retry')}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  finish(saved);
                }}
              >
                {t('profileCompletion.photo.skip')}
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={isSubmitting || saved !== null}>
              {(isSubmitting || saved !== null) && <Spinner />}
              {t('profileCompletion.save')}
            </Button>
          )}
        </form>
      </main>
    </>
  );
}
