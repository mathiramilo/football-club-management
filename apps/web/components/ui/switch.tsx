'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer group/switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors outline-none after:absolute after:-inset-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-unchecked:border-subtle-foreground data-unchecked:bg-secondary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full transition-transform data-checked:size-5 data-checked:translate-x-5.5 data-checked:bg-primary-foreground data-unchecked:size-3.5 data-unchecked:translate-x-1 data-unchecked:bg-subtle-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
