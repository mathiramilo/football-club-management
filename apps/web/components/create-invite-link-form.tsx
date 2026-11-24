'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { getInviteLinksListQueryKey, useInviteLinksCreate } from '@repo/api-client';
import {
  createInviteLinkBody,
  type CreateInviteLinkBody,
  INVITE_LINK_DEFAULT_EXPIRY_DAYS,
  type InviteRole,
} from '@repo/contracts';
import { type CategoryRoles, inviteApprovalRequired } from '@repo/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

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
import { Switch } from '@/components/ui/switch';
import { errorMessageKey } from '@/lib/messages';

const expiryOptions = [1, 7, 14, 30, 60, 90] as const;

const blankAsNull = (value: unknown) => {
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? null : Number(value);
};

export function CreateInviteLinkForm({
  clubId,
  categoryId,
  categoryRoles,
  roles,
  onCreated,
}: {
  clubId: string;
  categoryId: string;
  categoryRoles: CategoryRoles;
  roles: InviteRole[];
  onCreated: () => void;
}) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const roleId = useId();
  const approvalId = useId();
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
      retry: 0,
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getInviteLinksListQueryKey(clubId, categoryId),
        });
        onCreated();
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
  const maxUsesError = form.formState.errors.maxUses;
  const failure = create.error ? t(errorMessageKey(create.error.code)) : null;

  return (
    <form
      noValidate
      aria-labelledby={`${roleId}-title`}
      className="flex max-w-2xl flex-col gap-6 rounded-tile bg-muted p-4"
      onSubmit={(event) => void submit(event)}
    >
      <h3 id={`${roleId}-title`} className="font-heading text-section">
        {t('inviteLinks.create.title')}
      </h3>
      <FieldGroup>
        {roles.length > 1 && (
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Field>
                <FieldTitle id={roleId}>{t('inviteLinks.create.role')}</FieldTitle>
                <SegmentedControl
                  aria-labelledby={roleId}
                  value={field.value}
                  onValueChange={(value) => {
                    const next = roles.find((option) => option === value);
                    if (next) field.onChange(next);
                  }}
                  className="bg-background"
                >
                  {roles.map((option) => (
                    <SegmentedControlItem key={option} value={option}>
                      {t(`inviteLinks.for.${option}`)}
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
            <Field orientation="horizontal" className="items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor={approvalId}>{t('inviteLinks.approval.label')}</FieldLabel>
                <FieldDescription>
                  {approvalLocked
                    ? t('inviteLinks.approval.locked')
                    : t('inviteLinks.approval.hint')}
                </FieldDescription>
              </div>
              <Switch
                id={approvalId}
                checked={approvalLocked || field.value !== false}
                disabled={approvalLocked}
                onCheckedChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field>
          <FieldLabel htmlFor={`${roleId}-expiry`}>{t('inviteLinks.create.expiry')}</FieldLabel>
          <NativeSelect
            id={`${roleId}-expiry`}
            className="bg-background"
            {...form.register('expiresInDays', { valueAsNumber: true })}
          >
            {expiryOptions.map((days) => (
              <option key={days} value={days}>
                {t('inviteLinks.create.days', { count: days })}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={maxUsesError !== undefined}>
          <FieldLabel htmlFor={`${roleId}-max-uses`}>{t('inviteLinks.create.maxUses')}</FieldLabel>
          <Input
            id={`${roleId}-max-uses`}
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            autoComplete="off"
            className="bg-background"
            aria-invalid={maxUsesError !== undefined}
            {...form.register('maxUses', { setValueAs: blankAsNull })}
          />
          <FieldDescription>{t('inviteLinks.create.maxUsesHint')}</FieldDescription>
          <FieldError>{maxUsesError && t('inviteLinks.create.maxUsesInvalid')}</FieldError>
        </Field>
      </FieldGroup>
      {failure && (
        <Alert variant="danger">
          <AlertContent>{failure}</AlertContent>
        </Alert>
      )}
      <Button type="submit" size="sm" disabled={create.isPending} className="self-start">
        {create.isPending && <Spinner />}
        {t('inviteLinks.create.submit')}
      </Button>
    </form>
  );
}
