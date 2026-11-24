import { Tabs } from 'expo-router';
import {
  CalendarDaysIcon,
  EllipsisIcon,
  HouseIcon,
  type LucideIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { View } from 'react-native';

import { ClubTheme } from '@/components/club-theme';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCurrentClub } from '@/lib/current-club';
import { cn } from '@/lib/utils';

function tabIcon(glyph: LucideIcon) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return (
      <View
        className={cn(
          'h-8 w-14 items-center justify-center rounded-full',
          focused && 'bg-club-tint',
        )}
      >
        <Icon as={glyph} className={focused ? 'text-club' : 'text-muted-foreground'} />
      </View>
    );
  };
}

function TabLabel({ focused, children }: { focused: boolean; children: string }) {
  return (
    <Text
      className={cn(
        'text-caption',
        focused ? 'font-extrabold text-foreground' : 'font-semibold text-muted-foreground',
      )}
    >
      {children}
    </Text>
  );
}

export default function TabsLayout() {
  const intl = useIntl();
  const current = useCurrentClub();
  const club = current.status === 'ready' ? current.membership.club : null;
  const isStaff = current.status === 'ready' && current.isStaff;

  return (
    <ClubTheme primaryColor={club?.primaryColor}>
      <Tabs screenOptions={{ headerShown: false, tabBarLabel: TabLabel }}>
        <Tabs.Screen
          name="index"
          options={{
            title: intl.formatMessage({ id: 'nav.tabs.home' }),
            tabBarIcon: tabIcon(HouseIcon),
          }}
        />
        <Tabs.Screen
          name="agenda"
          options={{
            title: intl.formatMessage({ id: 'nav.tabs.agenda' }),
            tabBarIcon: tabIcon(CalendarDaysIcon),
          }}
        />
        <Tabs.Protected guard={!isStaff}>
          <Tabs.Screen
            name="team"
            options={{
              title: intl.formatMessage({ id: 'nav.tabs.team' }),
              tabBarIcon: tabIcon(UsersIcon),
            }}
          />
        </Tabs.Protected>
        <Tabs.Protected guard={isStaff}>
          <Tabs.Screen
            name="squad"
            options={{
              title: intl.formatMessage({ id: 'nav.tabs.squad' }),
              tabBarIcon: tabIcon(UsersIcon),
            }}
          />
        </Tabs.Protected>
        <Tabs.Protected guard={!isStaff}>
          <Tabs.Screen
            name="profile"
            options={{
              title: intl.formatMessage({ id: 'nav.tabs.profile' }),
              tabBarIcon: tabIcon(UserIcon),
            }}
          />
        </Tabs.Protected>
        <Tabs.Protected guard={isStaff}>
          <Tabs.Screen
            name="more"
            options={{
              title: intl.formatMessage({ id: 'nav.tabs.more' }),
              tabBarIcon: tabIcon(EllipsisIcon),
            }}
          />
        </Tabs.Protected>
      </Tabs>
    </ClubTheme>
  );
}
