import { ClubTheme } from '@/components/club-theme';
import { TabBar } from '@/components/tab-bar';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClubTheme primaryColor={null}>
      {children}
      <TabBar />
    </ClubTheme>
  );
}
