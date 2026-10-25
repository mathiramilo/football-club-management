import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const bannerVariants = cva('flex-row items-center gap-2.5 rounded-banner px-4 py-3', {
  variants: {
    variant: {
      neutral: 'bg-muted',
      inverse: 'bg-foreground',
      success: 'bg-success-soft',
      warning: 'bg-warning-soft',
      danger: 'bg-danger-soft',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

const bannerTextVariants = cva('text-body-sm', {
  variants: {
    variant: {
      neutral: 'text-foreground',
      inverse: 'text-background',
      success: 'text-success-strong',
      warning: 'text-warning-strong',
      danger: 'text-danger-strong',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export function Banner({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof View> & VariantProps<typeof bannerVariants>) {
  return (
    <TextClassContext value={bannerTextVariants({ variant })}>
      <View
        accessibilityLiveRegion="polite"
        className={cn(bannerVariants({ variant }), className)}
        {...props}
      />
    </TextClassContext>
  );
}
