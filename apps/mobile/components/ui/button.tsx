import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-full', {
  variants: {
    variant: {
      primary: 'bg-primary active:opacity-90',
      secondary: 'bg-secondary active:bg-border',
      destructive: 'bg-destructive active:opacity-90',
      success: 'bg-success active:opacity-90',
      link: 'active:opacity-70',
    },
    size: {
      lg: 'min-h-16 px-6 py-3',
      md: 'min-h-14 px-6 py-3',
      sm: 'min-h-11 px-4 py-2',
      icon: 'size-11',
    },
    disabled: {
      true: 'bg-border',
      false: '',
    },
  },
  compoundVariants: [
    { variant: 'link', disabled: true, className: 'bg-transparent' },
    { variant: 'link', size: 'sm', className: 'px-2.5' },
  ],
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
});

const buttonTextVariants = cva('text-center', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      success: 'text-white',
      link: 'text-club underline',
    },
    size: {
      lg: 'font-heading text-action-lg',
      md: 'font-heading text-action',
      sm: 'text-action-sm',
      icon: '',
    },
    disabled: {
      true: 'text-subtle-foreground',
      false: '',
    },
  },
  compoundVariants: [{ variant: 'link', size: 'sm', className: 'text-body-sm font-bold' }],
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
});

export function Button({
  className,
  variant,
  size,
  disabled,
  ...props
}: React.ComponentProps<typeof Pressable> & Omit<VariantProps<typeof buttonVariants>, 'disabled'>) {
  const isDisabled = disabled === true;

  return (
    <TextClassContext value={buttonTextVariants({ variant, size, disabled: isDisabled })}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size, disabled: isDisabled }), className)}
        {...props}
      />
    </TextClassContext>
  );
}
