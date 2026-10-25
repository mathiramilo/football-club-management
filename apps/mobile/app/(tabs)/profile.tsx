import * as Application from 'expo-application';
import { useIntl } from 'react-intl';

import { TabScreen } from '@/components/tab-screen';
import { Text } from '@/components/ui/text';

export default function ProfileScreen() {
  const intl = useIntl();

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.profile' })}>
      <Text className="text-center text-meta text-subtle-foreground">
        {intl.formatMessage(
          { id: 'profile.version' },
          {
            app: Application.applicationName ?? '',
            version: Application.nativeApplicationVersion ?? '',
          },
        )}
      </Text>
    </TabScreen>
  );
}
