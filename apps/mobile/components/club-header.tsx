import { StatusBar } from 'expo-status-bar';
import { ChevronLeftIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClubStripes } from '@/components/club-stripes';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function ClubHeader({
  title,
  subtitle,
  size = 'root',
  back,
}: {
  title: string;
  subtitle?: string;
  size?: 'root' | 'screen';
  back?: { label: string; onPress: () => void };
}) {
  return (
    <View className="overflow-hidden bg-club">
      <StatusBar style="light" />
      <ClubStripes />
      <SafeAreaView edges={['top']}>
        <View
          className={cn('flex-row items-center gap-1.5 pt-3 pr-4 pb-5', back ? 'pl-2' : 'pl-5')}
        >
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={back.label}
              onPress={back.onPress}
              className="size-11 items-center justify-center rounded-full active:bg-white/10"
            >
              <Icon as={ChevronLeftIcon} strokeWidth={2.4} className="size-6.5 text-white" />
            </Pressable>
          )}
          <View className="flex-1 gap-0.5">
            <Text
              role="heading"
              className={cn(
                'font-display text-white',
                size === 'root' ? 'text-title' : 'text-title-sm',
              )}
            >
              {title}
            </Text>
            {subtitle && <Text className="text-meta text-white/80">{subtitle}</Text>}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
