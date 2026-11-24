import { UsersIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';

import { EmptyState } from '@/components/empty-state';
import { TabScreen } from '@/components/tab-screen';

export default function SquadScreen() {
  const intl = useIntl();

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.squad' })}>
      <EmptyState
        icon={UsersIcon}
        title={intl.formatMessage({ id: 'squad.empty.title' })}
        body={intl.formatMessage({ id: 'squad.empty.body' })}
      />
    </TabScreen>
  );
}
