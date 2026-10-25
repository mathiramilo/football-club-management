import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const stripes = Array.from({ length: 16 }, (_, index) => index);

export function ClubHeader({ title }: { title: string }) {
  return (
    <View className="overflow-hidden bg-club">
      <StatusBar style="light" />
      <View aria-hidden pointerEvents="none" className="absolute inset-0 flex-row">
        {stripes.map((stripe) => (
          <View key={stripe} className={cn('w-7.5', stripe % 2 === 1 && 'bg-white/7')} />
        ))}
      </View>
      <SafeAreaView edges={['top']}>
        <View className="px-5 pt-4 pb-6">
          <Text role="heading" className="font-display text-title text-white">
            {title}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
