import { CalendarDaysIcon, WifiOffIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { NoClub } from '@/components/no-club';
import { StaffHome } from '@/components/staff-home';
import { TabScreen } from '@/components/tab-screen';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { type CurrentClub, useCurrentClub } from '@/lib/current-club';

function HomeContent({ current }: { current: CurrentClub }) {
  const intl = useIntl();

  switch (current.status) {
    case 'loading':
      return (
        <View className="gap-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-24 rounded-tile" />
          <Skeleton className="h-24 rounded-tile" />
        </View>
      );
    case 'offline':
      return (
        <EmptyState
          icon={WifiOffIcon}
          title={intl.formatMessage({ id: 'offline.title' })}
          body={intl.formatMessage({ id: 'home.offline' })}
        />
      );
    case 'failed':
      return (
        <View className="gap-3">
          <Banner variant="danger" role="alert">
            <Text>{intl.formatMessage({ id: 'home.loadFailed' })}</Text>
          </Banner>
          <Button variant="secondary" onPress={current.retry}>
            <Text>{intl.formatMessage({ id: 'home.retry' })}</Text>
          </Button>
        </View>
      );
    case 'none':
      return <NoClub />;
    case 'ready':
      return current.isStaff ? (
        <StaffHome membership={current.membership} />
      ) : (
        <EmptyState
          icon={CalendarDaysIcon}
          title={intl.formatMessage({ id: 'home.player.empty.title' })}
          body={intl.formatMessage({ id: 'home.player.empty.body' })}
        />
      );
  }
}

export default function HomeScreen() {
  const intl = useIntl();
  const current = useCurrentClub();

  return (
    <TabScreen
      title={intl.formatMessage({ id: 'nav.tabs.home' })}
      subtitle={current.status === 'ready' ? current.membership.club.name : undefined}
    >
      <HomeContent current={current} />
    </TabScreen>
  );
}
