'use client';

import { CameraIcon, UserRoundIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { acceptedPhotoTypes, squarePhoto } from '@/lib/profile-photo';

export function ProfilePhotoPicker({
  previewUrl,
  disabled = false,
  onSelect,
  onRemove,
}: {
  previewUrl: string | null;
  disabled?: boolean;
  onSelect: (photo: Blob) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('profileCompletion.photo');
  const inputId = useId();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUnreadable, setIsUnreadable] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setIsPreparing(true);
    setIsUnreadable(false);
    const photo = await squarePhoto(file);
    setIsPreparing(false);
    if (photo) onSelect(photo);
    else setIsUnreadable(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-subtle-foreground">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={t('preview')}
              width={80}
              height={80}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <UserRoundIcon aria-hidden className="size-9" />
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <input
            id={inputId}
            type="file"
            accept={acceptedPhotoTypes}
            className="peer sr-only"
            disabled={disabled || isPreparing}
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <Button
            asChild
            variant="secondary"
            aria-disabled={disabled || isPreparing}
            className="peer-focus-visible:outline-3 peer-focus-visible:outline-ring"
          >
            <label htmlFor={inputId}>
              {isPreparing ? <Spinner /> : <CameraIcon aria-hidden />}
              {isPreparing ? t('preparing') : t(previewUrl ? 'change' : 'choose')}
            </label>
          </Button>
          {previewUrl && (
            <Button variant="link" size="sm" disabled={disabled} onClick={onRemove}>
              {t('remove')}
            </Button>
          )}
        </div>
      </div>
      {isUnreadable && <FieldError>{t('unreadable')}</FieldError>}
    </div>
  );
}
