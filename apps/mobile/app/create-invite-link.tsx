import { zodResolver } from '@hookform/resolvers/zod';
import { getInviteLinksListQueryKey, useInviteLinksCreate } from '@repo/api-client';
import {
  createInviteLinkBody,
  type CreateInviteLinkBody,
  INVITE_LINK_DEFAULT_EXPIRY_DAYS,
} from '@repo/contracts';
import { creatableInviteRoles, inviteApprovalRequired } from '@repo/domain';
import { colors } from '@repo/ui-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, Switch, View } from 'react-native';

import { ClubTheme, useClubTheme } from '@/components/club-theme';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { useCurrentClub } from '@/lib/current-club';
import { errorMessageKey, type MessageKey } from '@/lib/i18n';
import { useIsOnline } from '@/lib/query-client';

const expiryOptions = [1, 7, 14, 30, 60, 90] as const;

export default function CreateInviteLinkScreen() {
  const current = useCurrentClub();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  if (current.status !== 'ready') return null;
  const { membership } = current;
  const category = membership.categories.find((item) => item.categoryId === categoryId);
  if (!category) return <Redirect href="/squad" />;

  return (
    <ClubTheme primaryColor={membership.club.primaryColor}>
      <CreateInviteLinkForm
        clubId={membership.club.id}
        categoryId={category.categoryId}
        categoryRoles={{ isAdmin: membership.isAdmin, staffRole: category.staffRole }}
      />
    </ClubTheme>
  );
}

function CreateInviteLinkForm({
  clubId,
  categoryId,
  categoryRoles,
}: {
  clubId: string;
  categoryId: string;
  categoryRoles: { isAdmin: boolean; staffRole: string | null };
}) {
  const intl = useIntl();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const theme = useClubTheme();
  const t = (id: MessageKey, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const roles = creatableInviteRoles(categoryRoles);
  const form = useForm<CreateInviteLinkBody>({
    resolver: zodResolver(createInviteLinkBody),
    defaultValues: {
      role: roles[0] ?? 'player',
      requiresApproval: true,
      expiresInDays: INVITE_LINK_DEFAULT_EXPIRY_DAYS,
      maxUses: null,
    },
  });
  const role = useWatch({ control: form.control, name: 'role' });
  const approvalLocked = inviteApprovalRequired(categoryRoles, role);
  const create = useInviteLinksCreate({
    mutation: {
      networkMode: 'always',
      retry: 0,
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getInviteLinksListQueryKey(clubId, categoryId),
        });
        router.back();
      },
    },
  });

  const submit = form.handleSubmit((values) => {
    create.mutate({
      clubId,
      categoryId,
      data: { ...values, requiresApproval: approvalLocked || values.requiresApproval },
    });
  });
  const maxUsesInvalid = form.formState.errors.maxUses !== undefined;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: t('inviteLinks.create.title') }} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 py-6">
          {roles.length > 1 && (
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t('inviteLinks.create.role')}</FieldLabel>
                  <SegmentedControl
                    accessibilityLabel={t('inviteLinks.create.role')}
                    value={field.value}
                    onValueChange={(value) => {
                      const next = roles.find((option) => option === value);
                      if (next) field.onChange(next);
                    }}
                  >
                    {roles.map((option) => (
                      <SegmentedControlItem key={option} value={option}>
                        <Text>{t(`inviteLinks.for.${option}`)}</Text>
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>
                </Field>
              )}
            />
          )}
          <Controller
            control={form.control}
            name="requiresApproval"
            render={({ field }) => (
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 gap-0.5">
                  <Text className="text-body-sm font-bold">{t('inviteLinks.approval.label')}</Text>
                  <Text className="text-meta text-muted-foreground">
                    {approvalLocked
                      ? t('inviteLinks.approval.locked')
                      : t('inviteLinks.approval.hint')}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={t('inviteLinks.approval.label')}
                  value={approvalLocked || field.value !== false}
                  disabled={approvalLocked}
                  trackColor={{ true: theme.club, false: colors.subtleForeground }}
                  onValueChange={field.onChange}
                />
              </View>
            )}
          />
          <Controller
            control={form.control}
            name="expiresInDays"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t('inviteLinks.create.expiry')}</FieldLabel>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t('inviteLinks.create.expiry')}
                  className="flex-row flex-wrap gap-2"
                >
                  {expiryOptions.map((days) => (
                    <FilterChip
                      key={days}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: field.value === days }}
                      pressed={field.value === days}
                      onPressedChange={() => {
                        field.onChange(days);
                      }}
                    >
                      <Text>{t('inviteLinks.create.days', { count: days })}</Text>
                    </FilterChip>
                  ))}
                </View>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="maxUses"
            render={({ field }) => (
              <Field>
                <FieldLabel nativeID="max-uses-label">{t('inviteLinks.create.maxUses')}</FieldLabel>
                <Input
                  accessibilityLabelledBy="max-uses-label"
                  keyboardType="number-pad"
                  invalid={maxUsesInvalid}
                  value={
                    field.value === null || field.value === undefined ? '' : String(field.value)
                  }
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '');
                    field.onChange(digits === '' ? null : Number(digits));
                  }}
                  onBlur={field.onBlur}
                />
                <FieldDescription>{t('inviteLinks.create.maxUsesHint')}</FieldDescription>
                {maxUsesInvalid && (
                  <FieldError>{t('inviteLinks.create.maxUsesInvalid')}</FieldError>
                )}
              </Field>
            )}
          />
          {create.error && (
            <Banner variant="danger">
              <Text>{t(errorMessageKey(create.error.code))}</Text>
            </Banner>
          )}
          <Button disabled={!isOnline || create.isPending} onPress={() => void submit()}>
            {create.isPending && <ActivityIndicator />}
            <Text>{t('inviteLinks.create.submit')}</Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
