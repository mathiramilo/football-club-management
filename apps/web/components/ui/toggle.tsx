'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Toggle as TogglePrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:text-subtle-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        chip: 'bg-secondary text-secondary-foreground hover:bg-border data-[state=on]:bg-foreground data-[state=on]:text-background',
      },
      size: {
        md: 'h-10 px-4 text-meta font-bold',
      },
    },
    defaultVariants: {
      variant: 'chip',
      size: 'md',
    },
  },
);

function Toggle({
  className,
  variant = 'chip',
  size = 'md',
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
