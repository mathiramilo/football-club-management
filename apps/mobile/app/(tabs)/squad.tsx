import type { MyClub } from '@repo/api-client';
import { creatableInviteRoles } from '@repo/domain';
import { UsersIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { InviteLinks } from '@/components/invite-links';
import { TabScreen } from '@/components/tab-screen';
import { FilterChip } from '@/components/ui/filter-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCurrentClub } from '@/lib/current-club';

const rolesIn = (membership: MyClub, staffRole: string | null) => ({
  isAdmin: membership.isAdmin,
  staffRole,
});

export default function SquadScreen() {
  const intl = useIntl();
  const current = useCurrentClub();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (current.status !== 'ready') {
    return (
      <TabScreen title={intl.formatMessage({ id: 'nav.tabs.squad' })}>
        <Skeleton className="h-56 rounded-tile" />
      </TabScreen>
    );
  }
  const { membership } = current;
  const categories = membership.categories.filter(
    (category) => creatableInviteRoles(rolesIn(membership, category.staffRole)).length > 0,
  );
  const selected =
    categories.find((category) => category.categoryId === selectedId) ?? categories[0];

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.squad' })} subtitle={membership.club.name}>
      {selected ? (
        <>
          {categories.length > 1 && (
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={intl.formatMessage({ id: 'inviteLinks.category' })}
              className="flex-row flex-wrap gap-2"
            >
              {categories.map((category) => (
                <FilterChip
                  key={category.categoryId}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category.categoryId === selected.categoryId }}
                  pressed={category.categoryId === selected.categoryId}
                  onPressedChange={() => {
                    setSelectedId(category.categoryId);
                  }}
                >
                  <Text>{category.name}</Text>
                </FilterChip>
              ))}
            </View>
          )}
          <InviteLinks
            key={selected.categoryId}
            club={membership.club}
            category={selected}
            roles={rolesIn(membership, selected.staffRole)}
          />
        </>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title={intl.formatMessage({ id: 'inviteLinks.noCategories.title' })}
          body={intl.formatMessage({ id: 'inviteLinks.noCategories.body' })}
        />
      )}
    </TabScreen>
  );
}
