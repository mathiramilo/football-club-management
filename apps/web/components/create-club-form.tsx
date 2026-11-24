'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ApiError,
  getMyClubsListQueryKey,
  type MyClub,
  type MyClubsResponse,
  useClubsCreate,
} from '@repo/api-client';
import {
  categoryFormats,
  createClubBody,
  type CreateClubBody,
  IDEMPOTENCY_KEY_HEADER,
} from '@repo/contracts';
import { clubTheme } from '@repo/ui-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Controller, type FieldError as FormFieldError, useForm, useWatch } from 'react-hook-form';

import { ClubColorPicker } from '@/components/club-color-picker';
import { ClubCrestPicker } from '@/components/club-crest-picker';
import { ClubHeader } from '@/components/club-header';
import { ClubPreview } from '@/components/club-preview';
import { Alert, AlertContent } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { Spinner } from '@/components/ui/spinner';
import { uploadClubCrest } from '@/lib/club-crest';
import {
  clubCountries,
  countryName,
  countryTimeZone,
  defaultLocation,
  timeZoneOptions,
  timeZoneParts,
} from '@/lib/club-location';
import { rememberCurrentClub } from '@/lib/current-club-store';
import { errorMessageKey } from '@/lib/messages';

const clubDetails = createClubBody.omit({ firstCategory: true });
const firstCategory = createClubBody.shape.firstCategory.unwrap();
const lengths = {
  name: { min: 2, max: 60 },
  shortName: { min: 1, max: 12 },
  categoryName: { min: 2, max: 40 },
} as const;
const nullWhenBlank = (value: string | null) => (value?.trim() ? value : null);

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

export function CreateClubForm() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'details' | 'category'>('details');
  const [leadsCategory, setLeadsCategory] = useState<'yes' | 'no' | null>(null);
  const [choiceMissing, setChoiceMissing] = useState(false);
  const [crest, setCrest] = useState<Blob | null>(null);
  const [created, setCreated] = useState<MyClub | null>(null);
  const [crestFailed, setCrestFailed] = useState(false);
  const [isUploadingCrest, setIsUploadingCrest] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const crestUrl = useObjectUrl(crest);

  const details = useForm({
    resolver: zodResolver(clubDetails),
    defaultValues: {
      name: '',
      shortName: null,
      ...defaultLocation(),
      primaryColor: null,
      secondaryColor: null,
    },
  });
  const category = useForm({
    resolver: zodResolver(firstCategory),
    defaultValues: { name: '', format: 'f11' as const },
  });
  const create = useClubsCreate({
    mutation: {
      onError: (error) => {
        if (error instanceof ApiError) setIdempotencyKey(crypto.randomUUID());
      },
    },
    request: { headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
  });

  const [name, watchedPrimaryColor, timezone] = useWatch({
    control: details.control,
    name: ['name', 'primaryColor', 'timezone'],
  });
  const primaryColor = watchedPrimaryColor ?? null;
  const isAdjusted = primaryColor !== null && clubTheme(primaryColor).club !== primaryColor;
  const isBusy = create.isPending || isUploadingCrest || created !== null;

  const finish = (membership: MyClub) => {
    rememberCurrentClub(membership.club.id);
    queryClient.setQueryData<MyClubsResponse>(getMyClubsListQueryKey(), (current) => ({
      items: [
        ...(current?.items ?? []).filter(({ club }) => club.id !== membership.club.id),
        membership,
      ],
    }));
    void queryClient.invalidateQueries({ queryKey: getMyClubsListQueryKey() });
    router.push('/portal');
  };

  const attachCrest = async (membership: MyClub) => {
    if (!crest) {
      finish(membership);
      return;
    }
    setIsUploadingCrest(true);
    try {
      const club = await uploadClubCrest(membership.club.id, crest);
      finish({ ...membership, club });
    } catch {
      setCrestFailed(true);
      setIsUploadingCrest(false);
    }
  };

  const submitDetails = details.handleSubmit(() => {
    setStep('category');
  });

  const createClub = async (categoryValues?: CreateClubBody['firstCategory']) => {
    const values = clubDetails.parse(details.getValues());
    try {
      const membership = await create.mutateAsync({
        data: { ...values, firstCategory: categoryValues },
      });
      setCreated(membership);
      await attachCrest(membership);
    } catch {
      return;
    }
  };

  const submitCategory = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (leadsCategory === null) {
      setChoiceMissing(true);
      return;
    }
    if (leadsCategory === 'no') {
      await createClub();
      return;
    }
    await category.handleSubmit((values) => createClub(values))(event);
  };

  const lengthError = (
    error: FormFieldError | undefined,
    value: string | null | undefined,
    { min, max }: { min: number; max: number },
  ) => {
    if (!error) return null;
    if (!value?.trim()) return t('createClub.fieldErrors.required');
    if (error.type === 'too_big') return t('createClub.fieldErrors.tooLong', { max });
    return t('createClub.fieldErrors.tooShort', { min });
  };

  const header = (
    <ClubHeader
      title={t('createClub.title')}
      subtitle={t('createClub.step', { step: step === 'details' ? 1 : 2, total: 2 })}
      size="screen"
      back={step === 'details' ? { label: t('createClub.back'), href: '/' } : undefined}
    />
  );

  if (step === 'details') {
    const { errors } = details.formState;
    const nameError = lengthError(errors.name, details.getValues('name'), lengths.name);
    const shortNameError = lengthError(
      errors.shortName,
      details.getValues('shortName'),
      lengths.shortName,
    );

    return (
      <>
        {header}
        <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-section">{t('createClub.details.title')}</h2>
            <p className="text-body text-pretty text-muted-foreground">
              {t('createClub.details.body')}
            </p>
          </div>
          <form
            noValidate
            className="flex flex-col gap-6"
            onSubmit={(event) => void submitDetails(event)}
          >
            <FieldGroup>
              <Field data-invalid={nameError !== null}>
                <FieldLabel htmlFor="club-name">{t('createClub.name')}</FieldLabel>
                <Input
                  id="club-name"
                  autoComplete="organization"
                  translate="no"
                  aria-invalid={nameError !== null}
                  {...details.register('name')}
                />
                <FieldError>{nameError}</FieldError>
              </Field>
              <Field data-invalid={shortNameError !== null}>
                <FieldLabel htmlFor="club-short-name">{t('createClub.shortName')}</FieldLabel>
                <Input
                  id="club-short-name"
                  autoComplete="off"
                  translate="no"
                  aria-invalid={shortNameError !== null}
                  {...details.register('shortName', { setValueAs: nullWhenBlank })}
                />
                <FieldDescription>{t('createClub.shortNameHint')}</FieldDescription>
                <FieldError>{shortNameError}</FieldError>
              </Field>
              <Controller
                control={details.control}
                name="countryCode"
                render={({ field }) => (
                  <Field>
                    <FieldTitle id="club-country">{t('createClub.country')}</FieldTitle>
                    <SegmentedControl
                      aria-labelledby="club-country"
                      value={field.value}
                      onValueChange={(value) => {
                        const country = clubCountries.find((option) => option === value);
                        if (!country) return;
                        field.onChange(country);
                        details.setValue('timezone', countryTimeZone(country, timezone));
                      }}
                    >
                      {clubCountries.map((country) => (
                        <SegmentedControlItem key={country} value={country}>
                          {countryName(country)}
                        </SegmentedControlItem>
                      ))}
                    </SegmentedControl>
                  </Field>
                )}
              />
              <Field>
                <FieldLabel htmlFor="club-timezone">{t('createClub.timezone')}</FieldLabel>
                <NativeSelect id="club-timezone" {...details.register('timezone')}>
                  {timeZoneOptions(timezone).map((option) => (
                    <option key={option} value={option}>
                      {t('createClub.timezoneOption', timeZoneParts(option))}
                    </option>
                  ))}
                </NativeSelect>
                <FieldDescription>{t('createClub.timezoneHint')}</FieldDescription>
              </Field>
              <ClubCrestPicker
                previewUrl={crestUrl}
                onSelect={setCrest}
                onRemove={() => {
                  setCrest(null);
                }}
              />
              <Controller
                control={details.control}
                name="primaryColor"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <ClubColorPicker
                      label={t('createClub.colors.primary')}
                      value={field.value ?? null}
                      onChange={field.onChange}
                    />
                    {isAdjusted && (
                      <FieldDescription>{t('createClub.colors.adjusted')}</FieldDescription>
                    )}
                  </div>
                )}
              />
              <Controller
                control={details.control}
                name="secondaryColor"
                render={({ field }) => (
                  <ClubColorPicker
                    label={t('createClub.colors.secondary')}
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                )}
              />
            </FieldGroup>
            <section aria-label={t('createClub.preview')} className="flex flex-col gap-2">
              <h3 className="text-meta font-bold">{t('createClub.preview')}</h3>
              <ClubPreview
                name={name.trim() || t('createClub.name')}
                primaryColor={primaryColor}
                crestUrl={crestUrl}
                crestLabel={t('createClub.crest.preview')}
              />
            </section>
            <Button type="submit">{t('createClub.next')}</Button>
          </form>
        </main>
      </>
    );
  }

  const categoryErrors = category.formState.errors;
  const categoryNameError = lengthError(
    categoryErrors.name,
    category.getValues('name'),
    lengths.categoryName,
  );

  return (
    <>
      {header}
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => void submitCategory(event)}
        >
          <Field data-invalid={choiceMissing}>
            <h2 id="leads-category" className="font-heading text-section">
              {t('createClub.category.title')}
            </h2>
            <FieldDescription>{t('createClub.category.body')}</FieldDescription>
            <SegmentedControl
              aria-labelledby="leads-category"
              aria-invalid={choiceMissing}
              disabled={isBusy}
              value={leadsCategory ?? ''}
              onValueChange={(value) => {
                setLeadsCategory(value === 'yes' ? 'yes' : 'no');
                setChoiceMissing(false);
              }}
            >
              <SegmentedControlItem value="yes">
                {t('createClub.category.yes')}
              </SegmentedControlItem>
              <SegmentedControlItem value="no">{t('createClub.category.no')}</SegmentedControlItem>
            </SegmentedControl>
            {choiceMissing && <FieldError>{t('createClub.category.choose')}</FieldError>}
          </Field>
          {leadsCategory === 'yes' && (
            <FieldGroup>
              <Field data-invalid={categoryNameError !== null}>
                <FieldLabel htmlFor="category-name">{t('createClub.category.name')}</FieldLabel>
                <Input
                  id="category-name"
                  autoComplete="off"
                  aria-invalid={categoryNameError !== null}
                  disabled={isBusy}
                  {...category.register('name')}
                />
                <FieldDescription>{t('createClub.category.nameHint')}</FieldDescription>
                <FieldError>{categoryNameError}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="category-format">{t('createClub.category.format')}</FieldLabel>
                <NativeSelect
                  id="category-format"
                  disabled={isBusy}
                  {...category.register('format')}
                >
                  {categoryFormats.map((format) => (
                    <option key={format} value={format}>
                      {t(`categoryFormats.${format}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
          )}
          {create.error && (
            <Alert variant="danger" role="alert">
              <AlertContent>{t(errorMessageKey(create.error.code))}</AlertContent>
            </Alert>
          )}
          {crestFailed && created ? (
            <div className="flex flex-col gap-2">
              <Alert variant="danger" role="alert">
                <AlertContent>{t('createClub.crest.uploadFailed')}</AlertContent>
              </Alert>
              <Button
                type="button"
                disabled={isUploadingCrest}
                onClick={() => {
                  setCrestFailed(false);
                  void attachCrest(created);
                }}
              >
                {isUploadingCrest && <Spinner />}
                {t('createClub.crest.retry')}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  finish(created);
                }}
              >
                {t('createClub.crest.skip')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isBusy}>
                {isBusy && <Spinner />}
                {t('createClub.submit')}
              </Button>
              <Button
                type="button"
                variant="link"
                disabled={isBusy}
                onClick={() => {
                  setStep('details');
                }}
              >
                {t('createClub.back')}
              </Button>
            </div>
          )}
        </form>
      </main>
    </>
  );
}
