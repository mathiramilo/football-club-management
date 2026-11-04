'use client';

import { cn } from '@/lib/utils';

export const codeLength = 6;

const positions = Array.from({ length: codeLength }, (_, index) => index);

export function CodeInput({
  ref,
  id,
  value,
  onChange,
  label,
  invalid = false,
  describedBy,
}: {
  ref?: React.Ref<HTMLInputElement>;
  id: string;
  value: string;
  onChange: (code: string) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div
      className={cn(
        'group relative rounded-field',
        invalid &&
          'outline-offset-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring',
      )}
    >
      <div aria-hidden className="flex gap-2">
        {positions.map((position) => {
          const digit = value.charAt(position);
          const isNext = position === Math.min(value.length, codeLength - 1);
          return (
            <div
              key={position}
              className={cn(
                'flex h-16 flex-1 items-center justify-center rounded-field border-2 font-heading text-title-sm tabular-nums',
                digit ? 'border-border bg-background' : 'border-transparent bg-muted',
                invalid
                  ? 'border-danger bg-background'
                  : isNext && 'group-focus-within:border-primary group-focus-within:bg-background',
              )}
            >
              {digit}
            </div>
          );
        })}
      </div>
      <input
        ref={ref}
        id={id}
        name="code"
        value={value}
        onChange={(event) => {
          onChange(event.target.value.replace(/\D/g, '').slice(0, codeLength));
        }}
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        className="absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent opacity-0"
      />
    </div>
  );
}
