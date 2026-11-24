import { View } from 'react-native';

import { cn } from '@/lib/utils';

const stripes = Array.from({ length: 16 }, (_, index) => index);

export function ClubStripes() {
  return (
    <View aria-hidden pointerEvents="none" className="absolute inset-0 flex-row">
      {stripes.map((stripe) => (
        <View key={stripe} className={cn('w-7.5', stripe % 2 === 1 && 'bg-white/7')} />
      ))}
    </View>
  );
}
