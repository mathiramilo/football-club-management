import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="gap-4">
      <View className="size-16 items-center justify-center rounded-tile bg-club-tint">
        <Icon as={icon} className="size-8 text-club" />
      </View>
      <View className="gap-2">
        <Text role="heading" className="font-heading text-card-title">
          {title}
        </Text>
        <Text className="text-muted-foreground">{body}</Text>
      </View>
      {children}
    </View>
  );
}
