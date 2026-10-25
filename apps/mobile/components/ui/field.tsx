import { CircleAlertIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function Field({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('gap-1.5', className)} {...props} />;
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-meta font-bold', className)} {...props} />;
}

export function FieldDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-meta text-muted-foreground', className)} {...props} />;
}

export function FieldError({ className, children }: { className?: string; children: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className={cn('flex-row items-start gap-1.5', className)}
    >
      <Icon as={CircleAlertIcon} className="mt-0.5 size-4 text-danger-strong" />
      <Text className="flex-1 text-meta font-semibold text-danger-strong">{children}</Text>
    </View>
  );
}
