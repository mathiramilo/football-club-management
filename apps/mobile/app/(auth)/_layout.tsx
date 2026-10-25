import { Stack } from 'expo-router';

import { ClubTheme } from '@/components/club-theme';
import { SignInEmailProvider } from '@/components/sign-in-email';

export default function AuthLayout() {
  return (
    <ClubTheme primaryColor={null}>
      <SignInEmailProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SignInEmailProvider>
    </ClubTheme>
  );
}
