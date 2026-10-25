import { WifiOffIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useIntl } from 'react-intl';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useIsOnline } from '@/lib/query-client';

export function OfflineBanner() {
  const intl = useIntl();
  const isOnline = useIsOnline();

  if (isOnline) {
    return null;
  }

  return (
    <View
      role="status"
      accessibilityLiveRegion="polite"
      className="flex-row items-start gap-2.5 bg-foreground px-4 py-3"
    >
      <Icon as={WifiOffIcon} className="mt-0.5 text-background" />
      <View className="flex-1 gap-0.5">
        <Text className="text-meta font-bold text-background">
          {intl.formatMessage({ id: 'offline.title' })}
        </Text>
        <Text className="text-meta text-background/80">
          {intl.formatMessage({ id: 'offline.body' })}
        </Text>
      </View>
    </View>
  );
}
