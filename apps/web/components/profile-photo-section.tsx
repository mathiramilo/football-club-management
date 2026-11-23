'use client';

import {
  ApiError,
  getProfileGetQueryKey,
  type ProfileResponse,
  useProfileGet,
  useProfilePhotoRemove,
} from '@repo/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ProfilePhotoPicker } from '@/components/profile-photo-picker';
import { Alert, AlertContent } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey, type MessageKey } from '@/lib/messages';
import { uploadProfilePhoto } from '@/lib/profile-photo';

export function ProfilePhotoSection() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { data: profile } = useProfileGet();
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [status, setStatus] = useState<MessageKey | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);

  const show = (result: ProfileResponse, message: MessageKey) => {
    queryClient.setQueryData(getProfileGetQueryKey(), result);
    setStatus(message);
    setError(null);
  };
  const remove = useProfilePhotoRemove({
    mutation: {
      onSuccess: (result) => {
        setIsConfirming(false);
        show(result, 'profile.photo.removed');
      },
      onError: (failure) => {
        setError(errorMessageKey(failure.code));
      },
    },
  });

  const upload = async (photo: Blob) => {
    setIsUploading(true);
    setStatus(null);
    try {
      show(await uploadProfilePhoto(photo), 'profile.photo.saved');
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? errorMessageKey(failure.code)
          : 'profileCompletion.photo.unreadable',
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!profile) return null;
  const isBusy = isUploading || remove.isPending;

  return (
    <section aria-labelledby="profile-photo-title" className="flex flex-col gap-3">
      <h2 id="profile-photo-title" className="font-heading text-section">
        {t('profile.photo.title')}
      </h2>
      <ProfilePhotoPicker
        previewUrl={profile.photo?.thumbnailUrl ?? null}
        disabled={isBusy}
        onSelect={(photo) => void upload(photo)}
        onRemove={() => {
          setIsConfirming(true);
          setStatus(null);
        }}
      />
      {!profile.photo && !isUploading && !status && (
        <p className="text-meta text-subtle-foreground">{t('profile.photo.none')}</p>
      )}
      {isConfirming && profile.photo && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-card p-4">
          <p className="flex-1 text-body font-bold">{t('profile.photo.confirmRemove')}</p>
          <Button
            variant="secondary"
            className="text-danger-strong"
            disabled={remove.isPending}
            onClick={() => {
              remove.mutate();
            }}
          >
            {remove.isPending && <Spinner />}
            {t('profile.photo.confirm')}
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setIsConfirming(false);
            }}
          >
            {t('profile.photo.cancel')}
          </Button>
        </div>
      )}
      <p role="status" className="text-meta text-subtle-foreground empty:hidden">
        {isUploading ? t('profileCompletion.photo.preparing') : status && t(status)}
      </p>
      {error && (
        <Alert variant="danger" role="alert">
          <AlertContent>{t(error)}</AlertContent>
        </Alert>
      )}
    </section>
  );
}
