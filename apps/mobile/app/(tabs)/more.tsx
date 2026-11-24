import { useIntl } from 'react-intl';

import { AccountScreen } from '@/components/account-screen';

export default function MoreScreen() {
  const intl = useIntl();

  return <AccountScreen title={intl.formatMessage({ id: 'nav.tabs.more' })} />;
}
