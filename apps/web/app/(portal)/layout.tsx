import { ClubTheme } from '@/components/club-theme';
import { LegalGate } from '@/components/legal-gate';
import { PortalFrame } from '@/components/portal-frame';
import { ProfileGate } from '@/components/profile-gate';
import { Providers } from '@/components/providers';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ClubTheme primaryColor={null}>
        <LegalGate>
          <ProfileGate>
            <PortalFrame>{children}</PortalFrame>
          </ProfileGate>
        </LegalGate>
      </ClubTheme>
    </Providers>
  );
}
