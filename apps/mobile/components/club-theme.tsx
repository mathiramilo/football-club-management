import { clubTheme, clubThemeVariables, type ClubTheme as Theme } from '@repo/ui-tokens';
import { VariableContextProvider } from 'nativewind';
import { createContext, use, useMemo } from 'react';

const ClubThemeContext = createContext<Theme>(clubTheme(null));

export function ClubTheme({
  primaryColor,
  children,
}: {
  primaryColor: string | null | undefined;
  children: React.ReactNode;
}) {
  const theme = useMemo(() => clubTheme(primaryColor), [primaryColor]);

  return (
    <ClubThemeContext value={theme}>
      <VariableContextProvider value={clubThemeVariables(theme)}>
        {children}
      </VariableContextProvider>
    </ClubThemeContext>
  );
}

export function useClubTheme() {
  return use(ClubThemeContext);
}
