import * as Application from 'expo-application';
import { useIntl } from 'react-intl';
import { Alert } from 'react-native';

import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { signOut } from '@/lib/auth-client';
import { queryClient } from '@/lib/query-client';

const hasQueuedWrites = () =>
  queryClient
    .getMutationCache()
    .getAll()
    .some((mutation) => mutation.state.isPaused);

export default function ProfileScreen() {
  const intl = useIntl();

  const confirmSignOut = () => {
    if (!hasQueuedWrites()) {
      void signOut();
      return;
    }
    Alert.alert(
      intl.formatMessage({ id: 'profile.signOutQueued.title' }),
      intl.formatMessage({ id: 'profile.signOutQueued.body' }),
      [
        { text: intl.formatMessage({ id: 'profile.signOutQueued.cancel' }), style: 'cancel' },
        {
          text: intl.formatMessage({ id: 'profile.signOutQueued.confirm' }),
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );
  };

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.profile' })}>
      <Button variant="secondary" onPress={confirmSignOut}>
        <Text className="text-danger-strong">{intl.formatMessage({ id: 'profile.signOut' })}</Text>
      </Button>
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
