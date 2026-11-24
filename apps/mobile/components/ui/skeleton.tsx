import { View } from 'react-native';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View aria-hidden className={cn('rounded-field bg-muted', className)} {...props} />;
}
