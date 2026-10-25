import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:bg-border disabled:text-subtle-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-border',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        success: 'bg-success text-white hover:bg-success/90',
        link: 'text-club underline underline-offset-4 hover:text-club/80 disabled:bg-transparent',
      },
      size: {
        lg: "h-16 px-6 font-heading text-action-lg [&_svg:not([class*='size-'])]:size-5.5",
        md: 'h-14 px-6 font-heading text-action',
        sm: 'h-11 px-4 text-action-sm',
        icon: "size-11 [&_svg:not([class*='size-'])]:size-5.5",
      },
    },
    compoundVariants: [{ variant: 'link', size: 'sm', className: 'px-2.5 text-body-sm font-bold' }],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
