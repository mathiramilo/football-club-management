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
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, type FieldError as FormFieldError, useForm, useWatch } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { ClubColorPicker } from '@/components/club-color-picker';
import { ClubCrestPicker } from '@/components/club-crest-picker';
import { ClubHeader } from '@/components/club-header';
import { ClubPreview } from '@/components/club-preview';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { type PreparedCrest, uploadClubCrest } from '@/lib/club-crest';
import {
  clubCountries,
  countryTimeZone,
  defaultLocation,
  timeZoneCity,
  timeZoneOptions,
} from '@/lib/club-location';
import { rememberCurrentClub } from '@/lib/current-club';
import { errorMessageKey, type MessageKey } from '@/lib/i18n';
import { queryClient, useIsOnline } from '@/lib/query-client';

type CreateClubCategoryFormat = (typeof categoryFormats)[number];

const clubDetails = createClubBody.omit({ firstCategory: true });
const firstCategory = createClubBody.shape.firstCategory.unwrap();
const lengths = {
  name: { min: 2, max: 60 },
  shortName: { min: 1, max: 12 },
  categoryName: { min: 2, max: 40 },
} as const;
const nullWhenBlank = (value: string) => (value.trim() ? value : null);

function ChoiceChips<Value extends string>({
  label,
  options,
  value,
  disabled = false,
  onChange,
  labelOf,
}: {
  label: string;
  options: readonly Value[];
  value: Value;
  disabled?: boolean;
  onChange: (value: Value) => void;
  labelOf: (value: Value) => string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="flex-row flex-wrap gap-2"
    >
      {options.map((option) => (
        <FilterChip
          key={option}
          accessibilityRole="radio"
          accessibilityState={{ checked: option === value, disabled }}
          disabled={disabled}
          pressed={option === value}
          onPressedChange={() => {
            onChange(option);
          }}
        >
          <Text>{labelOf(option)}</Text>
        </FilterChip>
      ))}
    </View>
  );
}

export default function CreateClubScreen() {
  const intl = useIntl();
  const router = useRouter();
  const isOnline = useIsOnline();
  const [step, setStep] = useState<'details' | 'category'>('details');
  const [leadsCategory, setLeadsCategory] = useState<'yes' | 'no' | null>(null);
  const [choiceMissing, setChoiceMissing] = useState(false);
  const [crest, setCrest] = useState<PreparedCrest | null>(null);
  const [created, setCreated] = useState<MyClub | null>(null);
  const [crestFailed, setCrestFailed] = useState(false);
  const [isUploadingCrest, setIsUploadingCrest] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => Crypto.randomUUID());
  const t = (id: MessageKey, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

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
      networkMode: 'always',
      onError: (error) => {
        if (error instanceof ApiError) setIdempotencyKey(Crypto.randomUUID());
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
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const attachCrest = async (membership: MyClub) => {
    if (!crest) {
      finish(membership);
      return;
    }
    setIsUploadingCrest(true);
    try {
      const club = await uploadClubCrest(membership.club.id, crest.blob);
      finish({ ...membership, club });
    } catch {
      setCrestFailed(true);
      setIsUploadingCrest(false);
    }
  };

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

  const submitCategory = async () => {
    if (leadsCategory === null) {
      setChoiceMissing(true);
      return;
    }
    if (leadsCategory === 'no') {
      await createClub();
      return;
    }
    await category.handleSubmit((values) => createClub(values))();
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
      back={
        isBusy
          ? undefined
          : {
              label: t('createClub.back'),
              onPress: () => {
                if (step === 'category') setStep('details');
                else router.back();
              },
            }
      }
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
      <View className="flex-1 bg-background">
        {header}
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-6 px-5 py-6"
          >
            <View className="gap-1">
              <Text role="heading" className="font-heading text-section">
                {t('createClub.details.title')}
              </Text>
              <Text className="text-muted-foreground">{t('createClub.details.body')}</Text>
            </View>
            <Controller
              control={details.control}
              name="name"
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <Field>
                  <FieldLabel nativeID="club-name-label">{t('createClub.name')}</FieldLabel>
                  <Input
                    ref={ref}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoComplete="off"
                    textContentType="organizationName"
                    autoCapitalize="words"
                    invalid={nameError !== null}
                    accessibilityLabelledBy="club-name-label"
                    accessibilityLabel={t('createClub.name')}
                  />
                  {nameError && <FieldError>{nameError}</FieldError>}
                </Field>
              )}
            />
            <Controller
              control={details.control}
              name="shortName"
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <Field>
                  <FieldLabel nativeID="club-short-name-label">
                    {t('createClub.shortName')}
                  </FieldLabel>
                  <Input
                    ref={ref}
                    value={value ?? ''}
                    onChangeText={(text) => {
                      onChange(nullWhenBlank(text));
                    }}
                    onBlur={onBlur}
                    autoComplete="off"
                    autoCapitalize="words"
                    invalid={shortNameError !== null}
                    accessibilityLabelledBy="club-short-name-label"
                    accessibilityLabel={t('createClub.shortName')}
                    accessibilityHint={t('createClub.shortNameHint')}
                  />
                  <FieldDescription>{t('createClub.shortNameHint')}</FieldDescription>
                  {shortNameError && <FieldError>{shortNameError}</FieldError>}
                </Field>
              )}
            />
            <Controller
              control={details.control}
              name="countryCode"
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t('createClub.country')}</FieldLabel>
                  <SegmentedControl
                    accessibilityLabel={t('createClub.country')}
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
                        <Text>{t(`createClub.countries.${country}`)}</Text>
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>
                </Field>
              )}
            />
            <Controller
              control={details.control}
              name="timezone"
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t('createClub.timezone')}</FieldLabel>
                  <ChoiceChips
                    label={t('createClub.timezone')}
                    options={timeZoneOptions(field.value)}
                    value={field.value}
                    onChange={field.onChange}
                    labelOf={(zone) => t('createClub.timezoneCity', { city: timeZoneCity(zone) })}
                  />
                  <FieldDescription>{t('createClub.timezoneHint')}</FieldDescription>
                </Field>
              )}
            />
            <ClubCrestPicker
              previewUri={crest?.uri ?? null}
              onSelect={setCrest}
              onRemove={() => {
                setCrest(null);
              }}
            />
            <Controller
              control={details.control}
              name="primaryColor"
              render={({ field }) => (
                <View className="gap-2">
                  <ClubColorPicker
                    label={t('createClub.colors.primary')}
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                  {isAdjusted && (
                    <FieldDescription accessibilityLiveRegion="polite">
                      {t('createClub.colors.adjusted')}
                    </FieldDescription>
                  )}
                </View>
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
            <View className="gap-2">
              <FieldLabel>{t('createClub.preview')}</FieldLabel>
              <ClubPreview
                name={name.trim() || t('createClub.name')}
                primaryColor={primaryColor}
                crestUri={crest?.uri ?? null}
                crestLabel={t('createClub.crest.preview')}
              />
            </View>
            <Button
              onPress={() =>
                void details.handleSubmit(() => {
                  setStep('category');
                })()
              }
            >
              <Text>{t('createClub.next')}</Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  const categoryNameError = lengthError(
    category.formState.errors.name,
    category.getValues('name'),
    lengths.categoryName,
  );

  return (
    <View className="flex-1 bg-background">
      {header}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 py-6">
          <Field>
            <Text role="heading" className="font-heading text-section">
              {t('createClub.category.title')}
            </Text>
            <FieldDescription>{t('createClub.category.body')}</FieldDescription>
            <SegmentedControl
              accessibilityLabel={t('createClub.category.title')}
              value={leadsCategory ?? ''}
              onValueChange={(value) => {
                if (isBusy) return;
                setLeadsCategory(value === 'yes' ? 'yes' : 'no');
                setChoiceMissing(false);
              }}
            >
              <SegmentedControlItem value="yes">
                <Text>{t('createClub.category.yes')}</Text>
              </SegmentedControlItem>
              <SegmentedControlItem value="no">
                <Text>{t('createClub.category.no')}</Text>
              </SegmentedControlItem>
            </SegmentedControl>
            {choiceMissing && <FieldError>{t('createClub.category.choose')}</FieldError>}
          </Field>
          {leadsCategory === 'yes' && (
            <>
              <Controller
                control={category.control}
                name="name"
                render={({ field: { value, onChange, onBlur, ref } }) => (
                  <Field>
                    <FieldLabel nativeID="category-name-label">
                      {t('createClub.category.name')}
                    </FieldLabel>
                    <Input
                      ref={ref}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoComplete="off"
                      autoCapitalize="sentences"
                      editable={!isBusy}
                      invalid={categoryNameError !== null}
                      accessibilityLabelledBy="category-name-label"
                      accessibilityLabel={t('createClub.category.name')}
                      accessibilityHint={t('createClub.category.nameHint')}
                    />
                    <FieldDescription>{t('createClub.category.nameHint')}</FieldDescription>
                    {categoryNameError && <FieldError>{categoryNameError}</FieldError>}
                  </Field>
                )}
              />
              <Controller
                control={category.control}
                name="format"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t('createClub.category.format')}</FieldLabel>
                    <ChoiceChips
                      label={t('createClub.category.format')}
                      options={categoryFormats}
                      value={field.value ?? 'f11'}
                      disabled={isBusy}
                      onChange={field.onChange}
                      labelOf={(format: CreateClubCategoryFormat) => t(`categoryFormats.${format}`)}
                    />
                  </Field>
                )}
              />
            </>
          )}
          {!isOnline ? (
            <Banner variant="neutral">
              <Text>{t('createClub.offline')}</Text>
            </Banner>
          ) : (
            create.error && (
              <Banner variant="danger" role="alert">
                <Text>{t(errorMessageKey(create.error.code))}</Text>
              </Banner>
            )
          )}
          {crestFailed && created ? (
            <View className="gap-2">
              <Banner variant="danger" role="alert">
                <Text>{t('createClub.crest.uploadFailed')}</Text>
              </Banner>
              <Button
                disabled={isUploadingCrest || !isOnline}
                onPress={() => {
                  setCrestFailed(false);
                  void attachCrest(created);
                }}
              >
                {isUploadingCrest && <ActivityIndicator />}
                <Text>{t('createClub.crest.retry')}</Text>
              </Button>
              <Button
                variant="link"
                onPress={() => {
                  finish(created);
                }}
              >
                <Text>{t('createClub.crest.skip')}</Text>
              </Button>
            </View>
          ) : (
            <Button disabled={isBusy || !isOnline} onPress={() => void submitCategory()}>
              {isBusy && <ActivityIndicator />}
              <Text>{t('createClub.submit')}</Text>
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
