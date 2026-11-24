import { ClubTheme } from '@/components/club-theme';
import { CurrentClubTheme } from '@/components/current-club-theme';
import { LegalGate } from '@/components/legal-gate';
import { ProfileGate } from '@/components/profile-gate';
import { Providers } from '@/components/providers';
import { TabBar } from '@/components/tab-bar';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ClubTheme primaryColor={null}>
        <LegalGate>
          <ProfileGate>
            <CurrentClubTheme>
              {children}
              <TabBar />
            </CurrentClubTheme>
          </ProfileGate>
        </LegalGate>
      </ClubTheme>
    </Providers>
  );
}
