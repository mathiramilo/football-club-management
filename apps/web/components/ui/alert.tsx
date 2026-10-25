import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  "flex w-full items-center gap-2.5 rounded-banner px-4 py-3 text-left text-body-sm has-data-[slot=alert-action]:py-2 has-data-[slot=alert-action]:pr-2 [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-foreground',
        inverse: 'bg-foreground text-background',
        success: 'bg-success-soft text-success-strong',
        warning: 'bg-warning-soft text-warning-strong',
        danger: 'bg-danger-soft text-danger-strong',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="status"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertContent({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="alert-content" className={cn('flex-1', className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<'strong'>) {
  return <strong data-slot="alert-title" className={cn('font-bold', className)} {...props} />;
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-action" className={cn('ml-auto shrink-0', className)} {...props} />;
}

export { Alert, AlertAction, AlertContent, AlertTitle };
