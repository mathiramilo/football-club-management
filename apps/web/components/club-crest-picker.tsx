'use client';

import { ImageUpIcon, ShieldIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FieldDescription, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { acceptedCrestTypes, squareCrest } from '@/lib/club-crest';

export function ClubCrestPicker({
  previewUrl,
  disabled = false,
  onSelect,
  onRemove,
}: {
  previewUrl: string | null;
  disabled?: boolean;
  onSelect: (crest: Blob) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('createClub.crest');
  const inputId = useId();
  const labelId = useId();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUnreadable, setIsUnreadable] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setIsPreparing(true);
    setIsUnreadable(false);
    const crest = await squareCrest(file);
    setIsPreparing(false);
    if (crest) onSelect(crest);
    else setIsUnreadable(true);
  };

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className="text-meta font-bold">
        {t('label')}
      </span>
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-tile bg-muted text-subtle-foreground">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={t('preview')}
              width={80}
              height={80}
              unoptimized
              className="size-full object-contain p-1.5"
            />
          ) : (
            <ShieldIcon aria-hidden className="size-9" />
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <input
            id={inputId}
            type="file"
            accept={acceptedCrestTypes}
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
              {isPreparing ? <Spinner /> : <ImageUpIcon aria-hidden />}
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
      <FieldDescription>{t('hint')}</FieldDescription>
      {isUnreadable && <FieldError>{t('unreadable')}</FieldError>}
    </div>
  );
}
