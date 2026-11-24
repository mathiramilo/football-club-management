import type { MyClub } from '@repo/api-client';
import { categoryFormats, staffRole } from '@repo/contracts';
import { CalendarDaysIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';

const knownFormat = (format: string) => categoryFormats.find((known) => known === format);
const knownRole = (role: string | null) => staffRole.options.find((known) => known === role);

export function StaffHome({ membership }: { membership: MyClub }) {
  const intl = useIntl();
  const { categories } = membership;

  return (
    <>
      {categories.length > 0 && (
        <View className="gap-3">
          <Text role="heading" className="font-heading text-section">
            {intl.formatMessage({ id: 'portal.home.categories' })}
          </Text>
          {categories.map((category) => {
            const format = knownFormat(category.format);
            const role = knownRole(category.staffRole);
            return (
              <View
                key={category.categoryId}
                className="flex-row items-start justify-between gap-3 rounded-tile bg-muted p-4"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="font-heading text-action">{category.name}</Text>
                  {format && (
                    <Text className="text-meta text-muted-foreground">
                      {intl.formatMessage({ id: `categoryFormats.${format}` })}
                    </Text>
                  )}
                </View>
                {role && (
                  <Badge variant="club">
                    <Text>{intl.formatMessage({ id: `staffRoles.${role}` })}</Text>
                  </Badge>
                )}
              </View>
            );
          })}
        </View>
      )}
      <EmptyState
        icon={CalendarDaysIcon}
        title={intl.formatMessage({ id: 'portal.home.events.title' })}
        body={intl.formatMessage({ id: 'portal.home.events.body' })}
      />
    </>
  );
}
