import { UsersIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';

import { EmptyState } from '@/components/empty-state';
import { TabScreen } from '@/components/tab-screen';

export default function TeamScreen() {
  const intl = useIntl();

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.team' })}>
      <EmptyState
        icon={UsersIcon}
        title={intl.formatMessage({ id: 'team.empty.title' })}
        body={intl.formatMessage({ id: 'team.empty.body' })}
      />
    </TabScreen>
  );
}
