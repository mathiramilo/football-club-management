import { LinkIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';

import { EmptyState } from '@/components/empty-state';
import { TabScreen } from '@/components/tab-screen';

export default function HomeScreen() {
  const intl = useIntl();

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.home' })}>
      <EmptyState
        icon={LinkIcon}
        title={intl.formatMessage({ id: 'home.empty.title' })}
        body={intl.formatMessage({ id: 'home.empty.body' })}
      />
    </TabScreen>
  );
}
