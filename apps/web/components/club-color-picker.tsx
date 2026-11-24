'use client';

import { type ClubColorSwatch, clubColorSwatches } from '@repo/ui-tokens';
import { BanIcon, CheckIcon, PaletteIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { useId } from 'react';

import { cn } from '@/lib/utils';

const swatches = Object.entries(clubColorSwatches) as [ClubColorSwatch, string][];
const noColor = 'none';
const swatchClassName =
  'relative flex size-11 items-center justify-center rounded-full ring-1 ring-border ring-inset outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed';

export function ClubColorPicker({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled?: boolean;
  onChange: (color: string | null) => void;
}) {
  const t = useTranslations('createClub.colors');
  const labelId = useId();
  const customId = useId();
  const isSwatch = value === null || swatches.some(([, color]) => color === value);
  const isCustom = !isSwatch;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className="text-meta font-bold">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <RadioGroupPrimitive.Root
          aria-labelledby={labelId}
          orientation="horizontal"
          disabled={disabled}
          value={isCustom ? '' : (value ?? noColor)}
          onValueChange={(next) => {
            onChange(next === noColor ? null : next);
          }}
          className="flex flex-wrap gap-2"
        >
          <RadioGroupPrimitive.Item
            value={noColor}
            aria-label={t('none')}
            className={cn(swatchClassName, 'bg-muted text-muted-foreground')}
          >
            <BanIcon aria-hidden className="size-5" />
            <RadioGroupPrimitive.Indicator className="absolute inset-0 rounded-full ring-3 ring-foreground" />
          </RadioGroupPrimitive.Item>
          {swatches.map(([name, color]) => (
            <RadioGroupPrimitive.Item
              key={name}
              value={color}
              aria-label={t(`swatches.${name}`)}
              className={swatchClassName}
              style={{ backgroundColor: color }}
            >
              <RadioGroupPrimitive.Indicator className="flex size-7 items-center justify-center rounded-full bg-background text-foreground shadow-raised">
                <CheckIcon aria-hidden strokeWidth={3} className="size-4" />
              </RadioGroupPrimitive.Indicator>
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
        <input
          id={customId}
          type="color"
          className="peer sr-only"
          disabled={disabled}
          value={value ?? clubColorSwatches.black}
          onChange={(event) => {
            onChange(event.target.value.toLowerCase());
          }}
        />
        <label
          htmlFor={customId}
          title={t('custom')}
          className={cn(
            swatchClassName,
            'cursor-pointer bg-muted text-muted-foreground peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed',
            isCustom && 'ring-3 ring-foreground',
          )}
          style={isCustom ? { backgroundColor: value } : undefined}
        >
          <span className="sr-only">{t('custom')}</span>
          {isCustom ? (
            <span className="flex size-7 items-center justify-center rounded-full bg-background text-foreground shadow-raised">
              <CheckIcon aria-hidden strokeWidth={3} className="size-4" />
            </span>
          ) : (
            <PaletteIcon aria-hidden className="size-5" />
          )}
        </label>
      </div>
    </div>
  );
}
