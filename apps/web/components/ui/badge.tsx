import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        success: 'bg-success-soft text-success-strong',
        danger: 'bg-danger-soft text-danger-strong',
        warning: 'bg-warning-soft text-warning-strong',
        neutral: 'bg-neutral-soft text-neutral-strong',
        secondary: 'bg-secondary text-secondary-foreground',
        club: 'bg-club-tint text-club',
      },
      size: {
        md: 'h-8.5 px-3 text-meta font-extrabold [&>svg]:size-4',
        sm: 'h-6.5 px-2.5 text-caption font-bold [&>svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
);

function Badge({
  className,
  variant = 'secondary',
  size = 'md',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
