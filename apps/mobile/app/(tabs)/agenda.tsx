import { CalendarDaysIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';

import { EmptyState } from '@/components/empty-state';
import { TabScreen } from '@/components/tab-screen';
import { useCurrentClub } from '@/lib/current-club';

export default function AgendaScreen() {
  const intl = useIntl();
  const current = useCurrentClub();
  const empty = current.status === 'ready' && current.isStaff ? 'staffEmpty' : 'empty';

  return (
    <TabScreen title={intl.formatMessage({ id: 'nav.tabs.agenda' })}>
      <EmptyState
        icon={CalendarDaysIcon}
        title={intl.formatMessage({ id: `agenda.${empty}.title` })}
        body={intl.formatMessage({ id: `agenda.${empty}.body` })}
      />
    </TabScreen>
  );
}
