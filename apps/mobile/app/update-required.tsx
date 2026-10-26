import { useAppConfigGet } from '@repo/api-client';
import { StatusBar } from 'expo-status-bar';
import { DownloadIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { Linking, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

const store = Platform.OS === 'ios' ? 'ios' : 'android';

async function openStore(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    return;
  }
}

export default function UpdateRequiredScreen() {
  const intl = useIntl();
  const { data } = useAppConfigGet();
  const storeUrl = data?.storeUrls[store] ?? null;

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      <SafeAreaView>
        <View className="px-5 py-6">
          <EmptyState
            icon={DownloadIcon}
            title={intl.formatMessage({ id: 'updateRequired.title' })}
            body={intl.formatMessage({ id: 'updateRequired.body' }, { store })}
          >
            {storeUrl !== null && (
              <Button onPress={() => void openStore(storeUrl)}>
                <Text>{intl.formatMessage({ id: 'updateRequired.action' }, { store })}</Text>
              </Button>
            )}
          </EmptyState>
        </View>
      </SafeAreaView>
    </View>
  );
}
