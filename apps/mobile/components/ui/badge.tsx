import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const badgeVariants = cva('flex-row items-center gap-1 self-start rounded-full', {
  variants: {
    variant: {
      success: 'bg-success-soft',
      danger: 'bg-danger-soft',
      warning: 'bg-warning-soft',
      neutral: 'bg-neutral-soft',
      secondary: 'bg-secondary',
      club: 'bg-club-tint',
    },
    size: {
      md: 'min-h-8.5 px-3 py-1',
      sm: 'min-h-6.5 px-2.5 py-0.5',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
  },
});

const badgeTextVariants = cva('', {
  variants: {
    variant: {
      success: 'text-success-strong',
      danger: 'text-danger-strong',
      warning: 'text-warning-strong',
      neutral: 'text-neutral-strong',
      secondary: 'text-secondary-foreground',
      club: 'text-club',
    },
    size: {
      md: 'text-meta font-extrabold',
      sm: 'text-caption font-bold',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
  },
});

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof View> & VariantProps<typeof badgeVariants>) {
  return (
    <TextClassContext value={badgeTextVariants({ variant, size })}>
      <View className={cn(badgeVariants({ variant, size }), className)} {...props} />
    </TextClassContext>
  );
}
