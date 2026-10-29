import { ClubTheme } from '@/components/club-theme';
import { Providers } from '@/components/providers';
import { TabBar } from '@/components/tab-bar';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ClubTheme primaryColor={null}>
        {children}
        <TabBar />
      </ClubTheme>
    </Providers>
  );
}
