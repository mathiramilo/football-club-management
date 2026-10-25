import { CalendarDaysIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';

import { EmptyState } from '@/components/empty-state';
import { TabScreen } from '@/components/tab-screen';

export default function AgendaScreen() {
  const intl = useIntl();

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.agenda' })}>
      <EmptyState
        icon={CalendarDaysIcon}
        title={intl.formatMessage({ id: 'agenda.empty.title' })}
        body={intl.formatMessage({ id: 'agenda.empty.body' })}
      />
    </TabScreen>
  );
}
