import { ClubTheme } from '@/components/club-theme';
import { LegalGate } from '@/components/legal-gate';
import { ProfileGate } from '@/components/profile-gate';
import { Providers } from '@/components/providers';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ClubTheme primaryColor={null}>
        <LegalGate>
          <ProfileGate>{children}</ProfileGate>
        </LegalGate>
      </ClubTheme>
    </Providers>
  );
}
