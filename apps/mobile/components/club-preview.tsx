import { Image } from 'expo-image';
import { ShieldIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { ClubStripes } from '@/components/club-stripes';
import { ClubTheme } from '@/components/club-theme';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function ClubPreview({
  name,
  primaryColor,
  crestUri,
  crestLabel,
}: {
  name: string;
  primaryColor: string | null;
  crestUri: string | null;
  crestLabel: string;
}) {
  return (
    <ClubTheme primaryColor={primaryColor}>
      <View className="flex-row items-center gap-3 overflow-hidden rounded-tile bg-club px-4 py-4">
        <ClubStripes />
        <View className="size-12 items-center justify-center overflow-hidden rounded-field bg-white/15">
          {crestUri ? (
            <Image
              source={{ uri: crestUri }}
              accessibilityLabel={crestLabel}
              contentFit="contain"
              style={{ width: 40, height: 40 }}
            />
          ) : (
            <Icon as={ShieldIcon} className="size-6 text-white" />
          )}
        </View>
        <Text className="flex-1 font-display text-title-sm text-white">{name}</Text>
      </View>
    </ClubTheme>
  );
}
