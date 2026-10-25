import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SearchXIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  const intl = useIntl();

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      <SafeAreaView>
        <View className="px-5 py-6">
          <EmptyState
            icon={SearchXIcon}
            title={intl.formatMessage({ id: 'notFound.title' })}
            body={intl.formatMessage({ id: 'notFound.body' })}
          >
            <Link href="/" replace asChild>
              <Button>
                <Text>{intl.formatMessage({ id: 'notFound.action' })}</Text>
              </Button>
            </Link>
          </EmptyState>
        </View>
      </SafeAreaView>
    </View>
  );
}
