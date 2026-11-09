import { ClubTheme } from '@/components/club-theme';
import { LegalGate } from '@/components/legal-gate';
import { Providers } from '@/components/providers';
import { TabBar } from '@/components/tab-bar';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ClubTheme primaryColor={null}>
        <LegalGate>
          {children}
          <TabBar />
        </LegalGate>
      </ClubTheme>
    </Providers>
  );
}
